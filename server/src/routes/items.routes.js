// Shared route factory for donations & requests, since the two flows
// mirror each other exactly per the brief ("Receiver flow mirrors
// donor flow"). Reduces duplication while keeping each endpoint set
// mounted at its own base path with its own Prisma model.
import { Router } from "express";
import prisma from "../utils/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { submissionLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import { itemSchema } from "../validators/item.validators.js";
import { sanitizeObject } from "../utils/sanitize.js";
import { runModerationPipeline } from "../utils/moderation.js";
import { sendEmail } from "../utils/mailer.js";

/**
 * @param {'donation'|'request'} kind
 */
export function buildItemRouter(kind) {
  const router = Router();
  const model = kind === "donation" ? prisma.donation : prisma.request;
  const ownerField = kind === "donation" ? "donorId" : "receiverId";
  const ownerRole = kind === "donation" ? "donor" : "receiver";

  // List + search/filter/paginate — open to any authenticated user so
  // receivers can browse open donations and vice versa (feature I).
  router.get("/", requireAuth, async (req, res, next) => {
    try {
      const { page = "1", pageSize = "12", category, status, q, region } = req.query;
      const take = Math.min(Number(pageSize) || 12, 50);
      const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

      const where = {
        deletedAt: null,
        ...(category && { category: { equals: String(category), mode: "insensitive" } }),
        ...(region && { region: { equals: String(region), mode: "insensitive" } }),
        ...(status ? { status: String(status) } : { status: "approved" }), // default: only show live listings
        ...(q && {
          OR: [
            { title: { contains: String(q), mode: "insensitive" } },
            { description: { contains: String(q), mode: "insensitive" } },
          ],
        }),
      };

      const [items, total] = await Promise.all([
        model.findMany({ where, take, skip, orderBy: { createdAt: "desc" } }),
        model.count({ where }),
      ]);

      res.json({ items, total, page: Number(page), pageSize: take, totalPages: Math.ceil(total / take) });
    } catch (err) {
      next(err);
    }
  });

  router.get("/:id", requireAuth, async (req, res, next) => {
    try {
      const item = await model.findFirst({ where: { id: req.params.id, deletedAt: null } });
      if (!item) return res.status(404).json({ error: `${kind} not found` });
      res.json(item);
    } catch (err) {
      next(err);
    }
  });

  // Create — donor quick listing flow / receiver quick request flow.
  // Runs the moderation pipeline synchronously before persisting the
  // final status, per "auto-reject clear violations, auto-approve
  // clean low-risk, route ambiguous ones to admin queue".
  router.post("/", requireAuth, requireRole(ownerRole), submissionLimiter, validate(itemSchema), async (req, res, next) => {
    try {
      const clean = sanitizeObject(req.body, ["title", "description", "location", "region", "category"]);
      const { verdict, flaggedTerms } = await runModerationPipeline(clean);

      const statusMap = { approved: "approved", rejected: "rejected", needs_review: "pending_review" };
      const status = statusMap[verdict];

      const item = await model.create({
        data: {
          ...clean,
          urgency: kind === "request" ? clean.urgency || 1 : undefined,
          [ownerField]: req.user.sub,
          status,
          flaggedReason: flaggedTerms.length ? flaggedTerms.join(", ") : null,
        },
      });

      await prisma.moderationLog.create({
        data: {
          targetType: kind,
          targetId: item.id,
          verdict,
          flaggedTerms,
          reviewedBy: null, // null = automated decision
        },
      });

      res.status(201).json(item);
    } catch (err) {
      next(err);
    }
  });

  // Soft delete only — audit trail requirement, records never
  // hard-deleted so match/admin history stays intact.
  router.delete("/:id", requireAuth, async (req, res, next) => {
    try {
      const item = await model.findUnique({ where: { id: req.params.id } });
      if (!item) return res.status(404).json({ error: "Not found" });
      const isOwner = item[ownerField] === req.user.sub;
      if (!isOwner && req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });

      await model.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
