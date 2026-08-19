import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../utils/prisma.js";
import { validate } from "../middleware/validate.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { registerSchema, loginSchema, refreshSchema } from "../validators/auth.validators.js";

const router = Router();

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m" }
  );
}

async function issueRefreshToken(userId) {
  const token = jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d",
  });
  const decoded = jwt.decode(token);
  await prisma.refreshToken.create({
    data: { token, userId, expiresAt: new Date(decoded.exp * 1000) },
  });
  return token;
}

router.post("/register", authLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const { name, email, password, role, orgName, phone, preferredLanguage } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role, orgName, phone, preferredLanguage },
    });

    const accessToken = signAccessToken(user);
    const refreshToken = await issueRefreshToken(user.id);
    res.status(201).json({
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/login", authLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findFirst({ where: { email, deletedAt: null } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const accessToken = signAccessToken(user);
    const refreshToken = await issueRefreshToken(user.id);
    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

// Refresh-token rotation: the old token is deleted and a new one issued
// on every use, so a leaked refresh token has a single-use window.
router.post("/refresh", validate(refreshSchema), async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored) return res.status(401).json({ error: "Refresh token not recognized (already used or revoked)" });

    await prisma.refreshToken.delete({ where: { token: refreshToken } });
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) return res.status(401).json({ error: "User no longer exists" });

    const accessToken = signAccessToken(user);
    const newRefreshToken = await issueRefreshToken(user.id);
    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", validate(refreshSchema), async (req, res, next) => {
  try {
    await prisma.refreshToken.deleteMany({ where: { token: req.body.refreshToken } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
