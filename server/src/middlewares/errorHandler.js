const { errorResponse } = require('../utils/response');

/**
 * Global Error Handling Middleware (CWE-200 Path Masking)
 */
function errorHandler(err, req, res, next) {
  console.error('Unhandled Server Error:', err.message);

  // Mask internal paths and stack traces for client safety
  const safeMessage = process.env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : err.message || 'An unexpected error occurred';

  return errorResponse(res, safeMessage, err.statusCode || 500);
}

module.exports = errorHandler;
