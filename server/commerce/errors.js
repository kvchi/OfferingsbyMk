export class CommerceError extends Error {
  constructor({ code, message, status }) {
    super(message);
    this.name = 'CommerceError';
    this.code = code;
    this.status = status;
  }
}

export const commerceError = (code, message, status) =>
  new CommerceError({ code, message, status });

export function sendCommerceError(res, error) {
  if (error instanceof CommerceError) {
    return res.status(error.status).json({
      error: true,
      code: error.code,
      message: error.message,
    });
  }

  return res.status(500).json({
    error: true,
    code: 'INTERNAL_ERROR',
    message: 'Unable to process the request.',
  });
}
