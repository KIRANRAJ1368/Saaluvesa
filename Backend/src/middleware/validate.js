export const validate = (required) => (req, res, next) => {
  const missing = required.filter(
    (field) =>
      req.body[field] === undefined ||
      req.body[field] === null ||
      req.body[field] === "",
  );
  return missing.length
    ? res
        .status(422)
        .json({ message: `Missing required fields: ${missing.join(", ")}` })
    : next();
};
