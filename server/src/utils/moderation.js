// Lightweight moderation pipeline: keyword blocklist + a heuristic
// toxicity/sentiment score, plus a stub for image (NSFW/explicit)
// moderation. Swap the stubs for a real provider (OpenAI moderation,
// Perspective API, AWS Rekognition, etc.) by implementing the same
// return shape.

const BLOCKLIST = [
  "kill", "bomb", "weapon", "drugs", "scam", "fraud", "nude", "porn",
  "hate", "terror", "smuggle", "counterfeit",
];

const HIGH_RISK_CATEGORIES = new Set(["cash", "medicine", "electronics"]);

/**
 * @returns {{ verdict: 'approved'|'rejected'|'needs_review', flaggedTerms: string[] }}
 */
export function moderateText({ title = "", description = "", category = "" }) {
  const text = `${title} ${description}`.toLowerCase();
  const flaggedTerms = BLOCKLIST.filter((term) => text.includes(term));

  if (flaggedTerms.length > 0) {
    return { verdict: "rejected", flaggedTerms };
  }

  // Heuristic "toxicity" proxy: excessive caps / punctuation spam often
  // correlates with abusive or spammy listings.
  const shoutRatio = (text.match(/[A-Z]/g) || []).length / Math.max(text.length, 1);
  const isLowRisk = !HIGH_RISK_CATEGORIES.has(category.toLowerCase());

  if (shoutRatio > 0.5) {
    return { verdict: "needs_review", flaggedTerms: ["excessive_caps"] };
  }

  return { verdict: isLowRisk ? "approved" : "needs_review", flaggedTerms: [] };
}

/**
 * Image moderation stub — checks Cloudinary-hosted photo URLs.
 * Wire this up to Cloudinary's built-in AWS Rekognition add-on
 * (moderation: "aws_rek") or any NSFW-detection API in production.
 * @returns {{ verdict: 'approved'|'rejected'|'needs_review' }}
 */
export async function moderateImages(photoUrls = []) {
  if (!photoUrls.length) return { verdict: "approved" };
  // Placeholder: assume clean. Replace with a real API call, e.g.:
  // const result = await fetch(`https://api.moderation.example/scan`, { ... });
  return { verdict: "approved" };
}

export async function runModerationPipeline(payload) {
  const textResult = moderateText(payload);
  const imageResult = await moderateImages(payload.photos);

  // Rejected wins outright; needs_review wins over approved.
  const verdicts = [textResult.verdict, imageResult.verdict];
  let verdict = "approved";
  if (verdicts.includes("rejected")) verdict = "rejected";
  else if (verdicts.includes("needs_review")) verdict = "needs_review";

  return { verdict, flaggedTerms: textResult.flaggedTerms };
}
