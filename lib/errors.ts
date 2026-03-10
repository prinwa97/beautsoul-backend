// /lib/errors.ts

export class HttpError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;

    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

export function assertOrThrow(
  condition: unknown,
  status: number,
  message: string,
  code?: string,
  details?: unknown
): asserts condition {
  if (!condition) {
    throw new HttpError(status, message, code, details);
  }
}

export function badRequest(message = "Bad request", code = "BAD_REQUEST", details?: unknown) {
  return new HttpError(400, message, code, details);
}

export function unauthorized(message = "Unauthorized", code = "UNAUTHORIZED", details?: unknown) {
  return new HttpError(401, message, code, details);
}

export function forbidden(message = "Forbidden", code = "FORBIDDEN", details?: unknown) {
  return new HttpError(403, message, code, details);
}

export function notFound(message = "Not found", code = "NOT_FOUND", details?: unknown) {
  return new HttpError(404, message, code, details);
}

export function conflict(message = "Conflict", code = "CONFLICT", details?: unknown) {
  return new HttpError(409, message, code, details);
}

export function unprocessable(
  message = "Validation failed",
  code = "UNPROCESSABLE_ENTITY",
  details?: unknown
) {
  return new HttpError(422, message, code, details);
}

export function internal(message = "Internal server error", code = "INTERNAL_ERROR", details?: unknown) {
  return new HttpError(500, message, code, details);
}