// zod counterpart of middlewares/validate.js (Joi). Usage: validateZod({ query: z.object({...}), params: ... })
// On success the parsed (coerced, defaulted) values replace req.query / req.params / req.body.
import httpStatus from 'http-status';
import ApiError from '../utils/ApiError.js';

const validateZod = (schemas) => (req, res, next) => {
  const messages = [];
  const parsed = {};

  for (const key of ['params', 'query', 'body']) {
    if (!schemas[key]) continue;
    const result = schemas[key].safeParse(req[key]);
    if (result.success) {
      parsed[key] = result.data;
    } else {
      for (const issue of result.error.issues) {
        messages.push([key, ...issue.path].join('.') + `: ${issue.message}`);
      }
    }
  }

  if (messages.length) {
    return next(new ApiError(httpStatus.BAD_REQUEST, messages.join(', ')));
  }
  Object.assign(req, parsed);
  return next();
};

export default validateZod;
