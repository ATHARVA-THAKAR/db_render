// Pure unit tests for the scoring engine — no DB needed.
import { describe, it, expect } from "@jest/globals";
import { scorePair, rankCandidates } from "../src/utils/matching.js";

const baseDonation = { category: "clothing", quantity: 100, region: "Maharashtra", location: "Mumbai" };
const baseRequest = { category: "clothing", quantity: 80, urgency: 4, region: "Maharashtra", location: "Mumbai", createdAt: new Date() };

describe("scorePair", () => {
  it("returns null for a category mismatch", () => {
    expect(scorePair(baseDonation, { ...baseRequest, category: "books" })).toBeNull();
  });

  it("scores a well-matched pair highly with a full breakdown", () => {
    const result = scorePair(baseDonation, baseRequest);
    expect(result).not.toBeNull();
    expect(result.score).toBeGreaterThan(0.7);
    expect(result.breakdown).toHaveProperty("quantityFit");
    expect(result.breakdown).toHaveProperty("location");
    expect(result.breakdown).toHaveProperty("urgency");
  });

  it("penalizes a mismatched region", () => {
    const near = scorePair(baseDonation, baseRequest);
    const far = scorePair(baseDonation, { ...baseRequest, region: "Kerala", location: "Kochi" });
    expect(far.score).toBeLessThan(near.score);
  });
});

describe("rankCandidates", () => {
  it("ranks and truncates to topN, highest score first", () => {
    const requests = [
      baseRequest,
      { ...baseRequest, quantity: 10, region: "Kerala" }, // worse fit
      { ...baseRequest, quantity: 100 }, // great fit
    ];
    const ranked = rankCandidates(baseDonation, requests, 2);
    expect(ranked).toHaveLength(2);
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
  });
});
