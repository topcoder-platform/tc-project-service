import _ from 'lodash';
import { MILESTONE_TEMPLATE_REFERENCES } from '../constants';
import models from '../models';
import util from '../util';

// eslint-disable-next-line valid-jsdoc
/**
 * Common validation code for types of milestone template references.
 * @param {{ reference: string, referenceId: string|number }} sourceObject
 * @returns {Promise}
 */
async function validateReference(sourceObject) {
  // The source object refers to a product template
  if (sourceObject.reference === MILESTONE_TEMPLATE_REFERENCES.PRODUCT_TEMPLATE) {
    // Validate ProductTemplate to be existed
    const productTemplate = await models.ProductTemplate.findOne({
      where: {
        id: sourceObject.referenceId,
        deletedAt: { $eq: null },
      },
      raw: true,
    });
    if (!productTemplate) {
      const apiErr = new Error(
        `Product template not found for product template id ${sourceObject.referenceId}`);
      apiErr.status = 400;
      throw apiErr;
    }
  }
}

const validateMilestoneTemplate = {

  /**
   * The middleware to validate MilestoneTemplate request object.
   * This should be called after the validate() middleware,
   * and before the permissions() middleware.
   * @param {Object} req the express request instance
   * @param {Object} res the express response instance
   * @param {Function} next the express next middleware
   */
  // eslint-disable-next-line valid-jsdoc
  validateRequestBody: (req, res, next) => {
    validateReference(req.body, req)
      .then(() => {
        if (req.body.sourceReference) {
          return validateReference({
            reference: req.body.sourceReference,
            referenceId: req.body.sourceReferenceId,
          });
        }

        return Promise.resolve();
      })
      .then(next)
      .catch(next);
  },

  /**
   * The middleware to validate reference/referenceId pair
   * present in the request's query filter and set to the request params. Because of the filter needs
   * to be parsed, this can be the first middleware in the stack, and can be placed before the permissions()
   * middleware.
   * @param {Object} req the express request instance
   * @param {Object} res the express response instance
   * @param {Function} next the express next middleware
   */
  // eslint-disable-next-line valid-jsdoc
  validateQueryFilter: (req, res, next) => {
    if (!req.query.filter) {
      return next();
    }

    // Validate the filter
    const filter = req.query.filter;

    if (!util.isValidFilter(filter, ['reference', 'referenceId'])) {
      const apiErr = new Error('Only allowed to filter by reference and referenceId');
      apiErr.status = 400;
      return next(apiErr);
    }

    // Verify required filters are present
    if (!filter.reference || !filter.referenceId) {
      const apiErr = new Error('Please provide reference and referenceId filter parameters');
      apiErr.status = 400;
      return next(apiErr);
    }

    // Verify reference is a valid value
    if (!_.includes(MILESTONE_TEMPLATE_REFERENCES, filter.reference)) {
      const apiErr = new Error(`reference filter must be in ${MILESTONE_TEMPLATE_REFERENCES}`);
      apiErr.status = 400;
      return next(apiErr);
    }

    if (_.lt(filter.referenceId, 1)) {
      const apiErr = new Error('referenceId filter must be a positive integer');
      apiErr.status = 400;
      return next(apiErr);
    }

    return validateReference(filter, req)
      .then(next)
      .catch(next);
  },

  /**
   * The middleware to validate milestoneTemplateId from request
   * path parameter, and set to the request params. This should be called after the validate()
   * middleware, and before the permissions() middleware.
   * @param {Object} req the express request instance
   * @param {Object} res the express response instance
   * @param {Function} next the express next middleware
   */
  // eslint-disable-next-line valid-jsdoc
  validateIdParam: (req, res, next) => {
    models.MilestoneTemplate.findByPk(req.params.milestoneTemplateId)
      .then((milestoneTemplate) => {
        if (!milestoneTemplate) {
          const apiErr = new Error(
            `MilestoneTemplate not found for id ${req.params.milestoneTemplateId}`);
          apiErr.status = 404;
          return next(apiErr);
        }

        req.milestoneTemplate = milestoneTemplate;

        return next();
      });
  },
};

export default validateMilestoneTemplate;
