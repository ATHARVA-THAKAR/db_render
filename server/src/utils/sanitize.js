import sanitizeHtml from "sanitize-html";

// Strip all HTML/script content from any free-text field before it is
// stored or rendered. Applied server-side regardless of client-side
// validation — never trust the client.
export function sanitize(input) {
  if (typeof input !== "string") return input;
  return sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} }).trim();
}

export function sanitizeObject(obj, fields) {
  const out = { ...obj };
  for (const f of fields) {
    if (typeof out[f] === "string") out[f] = sanitize(out[f]);
  }
  return out;
}
