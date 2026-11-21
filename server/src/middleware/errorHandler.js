// Convert application and unexpected errors into a safe API response.
export function errorHandler(error, _req, res, _next) {
  const statusCode =
    Number.isInteger(error.statusCode) &&
    error.statusCode >= 400 &&
    error.statusCode <= 599
      ? error.statusCode
      : 500;

  const code =
    typeof error.code === "string" && error.code
      ? error.code
      : statusCode === 500
        ? "INTERNAL_ERROR"
        : "REQUEST_ERROR";

  res.status(statusCode).json({
    error: {
      code,
      message:
        statusCode === 500
          ? "An unexpected error occurred."
          : error.message,
      ...(error.details ? { details: error.details } : {}),
    },
  });
}

// Return a not-found response for routes outside the mounted API.
export function notFoundHandler(_req, res) {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Route not found.",
    },
  });
}
