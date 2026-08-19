import { Router } from "express";
import prisma from "../utils/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { rankCandidates } from "../utils/matching.js";

const router = Router();

// Generate (but don't persist) suggested matches for a single donation
// against all open, approved requests — admin previews these before
// they're written as `suggested` Match rows.
router.get("/suggest/:donationId", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const donation = await prisma.donation.findFirst({
      where: { id: req.params.donationId, deletedAt: null },
    });
    if (!donation) return res.status(404).json({ error: "Donation not found" });

    const openRequests = await prisma.request.findMany({
      where: { status: "approved", deletedAt: null },
    });

    const ranked = rankCandidates(donation, openRequests, 5);
    res.json({ donation, candidates: ranked });
  } catch (err) {
    next(err);
  }
});

// Persist a suggested match (admin has reviewed the ranked candidates
// and picked one to formally suggest / auto-run for the queue).
router.post("/", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { donationId, requestId, score, breakdown } = req.body;
    const match = await prisma.match.create({
      data: { donationId, requestId, score, scoreBreakdown: breakdown, status: "suggested" },
    });
    res.status(201).json(match);
  } catch (err) {
    next(err);
  }
});

router.get("/", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { status } = req.query;
    const matches = await prisma.match.findMany({
      where: { deletedAt: null, ...(status && { status: String(status) }) },
      include: { donation: true, request: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(matches);
  } catch (err) {
    next(err);
  }
});

export default router;
