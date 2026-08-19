import { Router } from "express";
import { Parser as CsvParser } from "json2csv";
import PDFDocument from "pdfkit";
import prisma from "../utils/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { moderationDecisionSchema, matchDecisionSchema } from "../validators/item.validators.js";
import { sendEmail } from "../utils/mailer.js";

const router = Router();
router.use(requireAuth, requireRole("admin"));

// --- Moderation queue: everything left in pending_review after the
// automated pass (feature L: admin match review & approval starts here). ---
router.get("/moderation-queue", async (req, res, next) => {
  try {
    const [donations, requests] = await Promise.all([
      prisma.donation.findMany({ where: { status: "pending_review", deletedAt: null }, include: { donor: true } }),
      prisma.request.findMany({ where: { status: "pending_review", deletedAt: null }, include: { receiver: true } }),
    ]);
    res.json({ donations, requests });
  } catch (err) {
    next(err);
  }
});

router.post("/moderation/:kind/:id", validate(moderationDecisionSchema), async (req, res, next) => {
  try {
    const { kind, id } = req.params; // kind: 'donation' | 'request'
    const { verdict, reason } = req.body;
    const model = kind === "donation" ? prisma.donation : prisma.request;

    const item = await model.update({
      where: { id },
      data: { status: verdict, flaggedReason: reason || null },
    });

    await prisma.moderationLog.create({
      data: { targetType: kind, targetId: id, verdict, flaggedTerms: [], reviewedBy: req.user.sub },
    });

    res.json(item);
  } catch (err) {
    next(err);
  }
});

// --- Match approval: one-click approve/reject, updates both records
// and triggers notifications to both parties (feature G/K). ---
router.post("/matches/:id/decision", validate(matchDecisionSchema), async (req, res, next) => {
  try {
    const { status } = req.body;
    const match = await prisma.match.update({
      where: { id: req.params.id },
      data: { status, approvedBy: req.user.sub },
      include: {
        donation: { include: { donor: true } },
        request: { include: { receiver: true } },
      },
    });

    if (status === "approved") {
      await prisma.$transaction([
        prisma.donation.update({ where: { id: match.donationId }, data: { status: "matched" } }),
        prisma.request.update({ where: { id: match.requestId }, data: { status: "matched" } }),
      ]);
      await Promise.all([
        sendEmail({
          to: match.donation.donor.email,
          subject: "Your donation has been matched!",
          html: `<p>Your donation "${match.donation.title}" was matched to a request. Thank you!</p>`,
        }),
        sendEmail({
          to: match.request.receiver.email,
          subject: "A donation has been matched to your request!",
          html: `<p>Your request "${match.request.title}" was matched with a donor. An admin will coordinate next steps.</p>`,
        }),
      ]);
    }

    res.json(match);
  } catch (err) {
    next(err);
  }
});

// --- Audit trail ---
router.get("/audit-log", async (req, res, next) => {
  try {
    const logs = await prisma.moderationLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

// --- Export: donation/match history to CSV or PDF (feature M) ---
router.get("/export.csv", async (req, res, next) => {
  try {
    const matches = await prisma.match.findMany({
      include: { donation: true, request: true },
      orderBy: { createdAt: "desc" },
    });
    const rows = matches.map((m) => ({
      matchId: m.id,
      status: m.status,
      score: m.score,
      donationTitle: m.donation.title,
      donationCategory: m.donation.category,
      requestTitle: m.request.title,
      requestCategory: m.request.category,
      createdAt: m.createdAt.toISOString(),
    }));
    const csv = new CsvParser().parse(rows);
    res.header("Content-Type", "text/csv");
    res.attachment("donation-match-history.csv");
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

router.get("/export.pdf", async (req, res, next) => {
  try {
    const matches = await prisma.match.findMany({
      include: { donation: true, request: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    res.header("Content-Type", "application/pdf");
    res.attachment("donation-match-history.pdf");
    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    doc.fontSize(18).text("Donation Match History", { underline: true });
    doc.moveDown();
    matches.forEach((m) => {
      doc
        .fontSize(11)
        .text(`${m.donation.title}  →  ${m.request.title}`)
        .fontSize(9)
        .fillColor("#555")
        .text(`status: ${m.status} | score: ${m.score} | ${m.createdAt.toISOString()}`)
        .fillColor("#000")
        .moveDown(0.5);
    });
    doc.end();
  } catch (err) {
    next(err);
  }
});

export default router;
