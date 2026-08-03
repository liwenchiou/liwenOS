/**
 * Standardized API Response Helper (3-Tier Architecture)
 */

function successResponse(res, data = {}, message = 'Operation successful', statusCode = 200) {
  return res.status(statusCode).json({
    status: 'success',
    message,
    data
  });
}

function errorResponse(res, message = 'An error occurred', statusCode = 500, details = null) {
  const response = {
    status: 'error',
    message
  };

  // Only include details in dev mode if safe
  if (details && process.env.NODE_ENV !== 'production') {
    response.details = details;
  }

  return res.status(statusCode).json(response);
}

module.exports = {
  successResponse,
  errorResponse
};
