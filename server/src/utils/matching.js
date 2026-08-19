// Explainable, rule-based matching engine.
// Category match is a hard requirement (donation and request must be
// in the same category to be considered at all). Everything else
// contributes a weighted, individually-visible score component so an
// admin sees *why* a pair was suggested, not just a black-box number.

const WEIGHTS = {
  quantityFit: 0.35,
  location: 0.25,
  urgency: 0.25,
  recency: 0.15,
};

function quantityFitScore(donationQty, requestQty) {
  if (requestQty <= 0) return 0;
  const ratio = donationQty / requestQty;
  // Perfect or slightly-over fit scores highest; big shortfalls or
  // wild oversupply score lower.
  if (ratio >= 1 && ratio <= 1.5) return 1;
  if (ratio > 1.5) return Math.max(0, 1 - (ratio - 1.5) * 0.2);
  return Math.max(0, ratio); // undersupply scaled down linearly
}

function locationScore(donation, request) {
  if (!donation.region || !request.region) return 0.5; // unknown = neutral
  if (donation.location && request.location && donation.location === request.location) return 1;
  if (donation.region === request.region) return 0.75;
  return 0.2;
}

function urgencyScore(urgency) {
  // urgency is 1-5 on the request; normalize to 0-1
  return Math.min(Math.max(urgency, 1), 5) / 5;
}

function recencyScore(createdAt) {
  const ageDays = (Date.now() - new Date(createdAt).getTime()) / 86_400_000;
  // Newer requests score slightly higher (freshness), decaying over 30 days
  return Math.max(0, 1 - ageDays / 30);
}

/**
 * Score a single donation/request pair.
 * @returns {{ score: number, breakdown: object } | null} null if the
 *   pair doesn't even qualify (category mismatch).
 */
export function scorePair(donation, request) {
  if (donation.category.toLowerCase() !== request.category.toLowerCase()) return null;

  const components = {
    quantityFit: quantityFitScore(donation.quantity, request.quantity),
    location: locationScore(donation, request),
    urgency: urgencyScore(request.urgency),
    recency: recencyScore(request.createdAt),
  };

  const score = Object.entries(components).reduce(
    (sum, [key, val]) => sum + val * WEIGHTS[key],
    0
  );

  const breakdown = Object.fromEntries(
    Object.entries(components).map(([key, val]) => [
      key,
      { rawScore: Number(val.toFixed(3)), weight: WEIGHTS[key], contribution: Number((val * WEIGHTS[key]).toFixed(3)) },
    ])
  );

  return { score: Number(score.toFixed(3)), breakdown };
}

/**
 * Rank all candidate requests against one donation (or vice versa via
 * the caller swapping args), returning the top N with explainable
 * breakdowns, highest score first.
 */
export function rankCandidates(donation, requests, topN = 5) {
  return requests
    .map((request) => {
      const result = scorePair(donation, request);
      return result && { request, ...result };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
