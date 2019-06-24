import _ from 'lodash';

/**
 * Constructs a middleware the validates the existence of a record given a path to find in the req. For example, in
 * order to check for a ProductCategory being received in "req.body.category" you would construct this middleware
 * by calling this function with (models.ProductCategory, 'key', 'body.category', 'Category').
 * Note that this also works for updates where the value might not be present in the request, in which the case
 * the built middleware will continue without errors.
 *
 * @param {Object} model the mode.
 * @param {string} modelKey the model key
 * @param {string} path the path to seek the value in the request
 * @param {string} errorEntityName the error entity name used to build an error
 * @returns {Function} the middleware
 */
export default function (model, modelKey, path, errorEntityName) {
  return (req, res, next) => {
    const value = _.get(req, path);
    if (value) {
      model.findOne({ where: { [modelKey]: value } })
        .then((record) => {
          if (record) {
            next();
          } else {
            const err = new Error(`${errorEntityName} not found for key "${value}"`);
            err.status = 400;
            next(err);
          }
        });
    } else {
      next();
    }
  };
}
