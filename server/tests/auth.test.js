// Integration tests for the auth flow. Requires a reachable test
// database (set DATABASE_URL to a disposable test DB before running).
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import { createApp } from "../src/app.js";
import prisma from "../src/utils/prisma.js";

const app = createApp();
const testEmail = `test-${Date.now()}@example.com`;

describe("Auth API", () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.$disconnect();
  });

  it("registers a new donor", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Test Donor",
      email: testEmail,
      password: "SuperSecret123!",
      role: "donor",
    });
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.role).toBe("donor");
  });

  it("rejects duplicate registration", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Test Donor",
      email: testEmail,
      password: "SuperSecret123!",
      role: "donor",
    });
    expect(res.status).toBe(409);
  });

  it("logs in with correct credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: testEmail, password: "SuperSecret123!" });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
  });

  it("rejects a bad password", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: testEmail, password: "wrong" });
    expect(res.status).toBe(401);
  });
});
