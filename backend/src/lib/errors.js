export class AppError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export class ValidationError extends AppError {
  constructor(message, details) {
    super(message, 422);
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') { super(message, 404); }
}

export class BadRequestError extends AppError {
  constructor(message) { super(message, 400); }
}

export class TransitionError extends AppError {
  constructor(message) { super(message, 400); }
}

export class ConflictError extends AppError {
  constructor(message) { super(message, 409); }
}
