export function errorHandler(err, req, res, next) {
  const status = err.status || 500
  const code =
    err.code ||
    (status === 400
      ? "VALIDATION_ERROR"
      : status === 404
        ? "NOT_FOUND"
        : "INTERNAL_SERVER_ERROR")
  res.status(status).json({
    error: {
      code,
      message: err.message || "An unexpected error occurred",
      details: err.details || undefined,
    },
  })
}
