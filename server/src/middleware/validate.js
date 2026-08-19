// Wraps a Zod schema as Express middleware. Shared schema *shapes*
// mirror what the client uses for its own instant validation, but
// this is the copy that actually gets enforced — client-side
// validation is UX only, never trusted.
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: "Validation failed", details: result.error.flatten() });
    }
    req.body = result.data;
    next();
  };
}
