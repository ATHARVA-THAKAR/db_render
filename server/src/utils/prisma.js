import { PrismaClient } from "@prisma/client";

// Single shared Prisma instance across the app (avoids exhausting DB
// connections in dev with hot-reload).
const prisma = globalThis.__prisma__ ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalThis.__prisma__ = prisma;

export default prisma;
