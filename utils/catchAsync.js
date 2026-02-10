/**
 * Async error wrapper utility
 * Catches errors from async functions and passes them to next()
 */
export const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
