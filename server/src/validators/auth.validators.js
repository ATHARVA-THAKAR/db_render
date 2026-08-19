import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  role: z.enum(["donor", "receiver", "admin"]),
  orgName: z.string().max(150).optional(),
  phone: z.string().max(20).optional(),
  preferredLanguage: z.enum(["en", "hi", "mr"]).default("en"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
