import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import "dotenv/config";

import authRoutes from "./routes/auth.routes.js";
import { buildItemRouter } from "./routes/items.routes.js";
import matchRoutes from "./routes/matches.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

  app.get("/health", (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

  app.use("/api/auth", authRoutes);
  app.use("/api/donations", buildItemRouter("donation"));
  app.use("/api/requests", buildItemRouter("request"));
  app.use("/api/matches", matchRoutes);
  app.use("/api/admin", adminRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
