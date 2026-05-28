import { ValidationError } from '../lib/errors.js';

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map(i => ({
        path: i.path.join('.') || '(root)',
        message: i.message,
      }));
      return next(new ValidationError('Validation failed', details));
    }
    req[source] = result.data;
    next();
  };
}
