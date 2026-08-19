import { z } from "zod";

// Shared shape/logic that also lives client-side (client/src/validation.js)
// so both sides reject the same bad input — but the server copy here is
// the one that is actually enforced.
export const itemSchema = z.object({
  category: z.string().min(2).max(50),
  title: z.string().min(3).max(150),
  description: z.string().min(10).max(2000),
  quantity: z.coerce.number().int().positive().max(100000),
  photos: z.array(z.string().url()).max(6).default([]),
  location: z.string().max(150).optional(),
  region: z.string().max(100).optional(),
  urgency: z.coerce.number().int().min(1).max(5).optional(), // requests only
});

export const moderationDecisionSchema = z.object({
  verdict: z.enum(["approved", "rejected"]),
  reason: z.string().max(500).optional(),
});

export const matchDecisionSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});
