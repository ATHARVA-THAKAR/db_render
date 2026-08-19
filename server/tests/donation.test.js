// Integration test covering submit → moderation → RBAC enforcement.
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import { createApp } from "../src/app.js";
import prisma from "../src/utils/prisma.js";

const app = createApp();
const donorEmail = `donor-${Date.now()}@example.com`;
let donorToken;
let createdDonationId;

describe("Donations API", () => {
  beforeAll(async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Donor Test",
      email: donorEmail,
      password: "SuperSecret123!",
      role: "donor",
    });
    donorToken = res.body.accessToken;
  });

  afterAll(async () => {
    await prisma.donation.deleteMany({ where: { title: "Test blanket donation" } });
    await prisma.user.deleteMany({ where: { email: donorEmail } });
    await prisma.$disconnect();
  });

  it("rejects a submission without auth", async () => {
    const res = await request(app).post("/api/donations").send({});
    expect(res.status).toBe(401);
  });

  it("auto-approves a clean, low-risk donation", async () => {
    const res = await request(app)
      .post("/api/donations")
      .set("Authorization", `Bearer ${donorToken}`)
      .send({
        category: "clothing",
        title: "Test blanket donation",
        description: "Fifty warm blankets donated for winter relief efforts.",
        quantity: 50,
        photos: [],
      });
    expect(res.status).toBe(201);
    expect(["approved", "pending_review"]).toContain(res.body.status);
    createdDonationId = res.body.id;
  });

  it("auto-rejects a donation containing a blocklisted term", async () => {
    const res = await request(app)
      .post("/api/donations")
      .set("Authorization", `Bearer ${donorToken}`)
      .send({
        category: "other",
        title: "Free scam offer",
        description: "This is a scam description containing a blocked keyword.",
        quantity: 1,
        photos: [],
      });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("rejected");
  });

  it("blocks a receiver-only... er, non-donor role from posting a donation", async () => {
    const receiverEmail = `receiver-${Date.now()}@example.com`;
    const regRes = await request(app).post("/api/auth/register").send({
      name: "Receiver Test",
      email: receiverEmail,
      password: "SuperSecret123!",
      role: "receiver",
    });
    const res = await request(app)
      .post("/api/donations")
      .set("Authorization", `Bearer ${regRes.body.accessToken}`)
      .send({ category: "clothing", title: "Should fail", description: "Receivers cannot post donations at all.", quantity: 1, photos: [] });
    expect(res.status).toBe(403);
    await prisma.user.deleteMany({ where: { email: receiverEmail } });
  });
});
