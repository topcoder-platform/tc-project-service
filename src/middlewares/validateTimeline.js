import _ from 'lodash';
import { TIMELINE_REFERENCES } from '../constants';
import models from '../models';
import util from '../util';

// eslint-disable-next-line valid-jsdoc
/**
 * Common validation code for types of timeline references.
 * @param {{ reference: string, referenceId: string|number }} sourceObject
 * @param {object} req
 * @param {boolean} [validateProjectExists]
 * @returns {Promise}
 */
async function validateReference(sourceObject, req, validateProjectExists) {
  // The source object refers to a project
  if (sourceObject.reference === TIMELINE_REFERENCES.PROJECT) {
    // Set projectId to the params so it can be used in the permission check middleware
    req.params.projectId = sourceObject.referenceId;

    if (validateProjectExists) {
      // Validate projectId to be existed
      const project = await models.Project.findOne({
        where: {
          id: req.params.projectId,
          deletedAt: { $eq: null },
        },
      });
      if (!project) {
        const apiErr = new Error(`Project not found for project id ${req.params.projectId}`);
        apiErr.status = 400;
        throw apiErr;
      }
    }
    return;
  }

  // The source object refers to a product
  if (sourceObject.reference === TIMELINE_REFERENCES.PRODUCT) {
    // Validate product to be existed
    const product = await models.PhaseProduct.findOne({
      where: {
        id: sourceObject.referenceId,
        deletedAt: { $eq: null },
      },
    });
    if (!product) {
      const apiErr = new Error(`Product not found for product id ${sourceObject.referenceId}`);
      apiErr.status = 400;
      throw apiErr;
    }

    // Set projectId to the params so it can be used in the permission check middleware
    req.params.projectId = product.projectId;
    return;
  }

  // The source object refers to a phase
  const phase = await models.ProjectPhase.findOne({
    where: {
      id: sourceObject.referenceId,
      deletedAt: { $eq: null },
    },
  });
  if (!phase) {
    const apiErr = new Error(`Phase not found for phase id ${sourceObject.referenceId}`);
    apiErr.status = 400;
    throw apiErr;
  }

  // Set projectId to the params so it can be used in the permission check middleware
  req.params.projectId = phase.projectId;
}

const validateTimeline = {

  /**
   * The middleware to validate and get the projectId specified by the timeline request object,
   * and set to the request params. This should be called after the validate() middleware,
   * and before the permissions() middleware.
   * @param {Object} req the express request instance
   * @param {Object} res the express response instance
   * @param {Function} next the express next middleware
   */
  // eslint-disable-next-line valid-jsdoc
  validateTimelineRequestBody: (req, res, next) => {
    validateReference(req.body, req, true)
      .then(next)
      .catch(next);
  },

  /**
   * The middleware to validate and get the projectId specified by the reference/referenceId pair
   * present in the request's query filter and set to the request params. Because of the filter needs
   * to be parsed, this can be the first middleware in the stack, and can be placed before the permissions()
   * middleware.
   * @param {Object} req the express request instance
   * @param {Object} res the express response instance
   * @param {Function} next the express next middleware
   */
  // eslint-disable-next-line valid-jsdoc
  validateTimelineQueryFilter: (req, res, next) => {
    // Validate the filter
    const filter = req.query;

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
    if (!_.includes(TIMELINE_REFERENCES, filter.reference)) {
      const apiErr = new Error(`reference filter must be in ${TIMELINE_REFERENCES}`);
      apiErr.status = 400;
      return next(apiErr);
    }

    if (_.lt(filter.referenceId, 1)) {
      const apiErr = new Error('referenceId filter must be a positive integer');
      apiErr.status = 400;
      return next(apiErr);
    }

    return validateReference(filter, req, true)
      .then(next)
      .catch(next);
  },

  /**
   * The middleware to validate and get the projectId specified by the timelineId from request
   * path parameter, and set to the request params. This should be called after the validate()
   * middleware, and before the permissions() middleware.
   * @param {Object} req the express request instance
   * @param {Object} res the express response instance
   * @param {Function} next the express next middleware
   */
  // eslint-disable-next-line valid-jsdoc
  validateTimelineIdParam: (req, res, next) => {
    models.Timeline.findByPk(req.params.timelineId)
      .then((timeline) => {
        if (!timeline) {
          const apiErr = new Error(`Timeline not found for timeline id ${req.params.timelineId}`);
          apiErr.status = 404;
          return next(apiErr);
        }

        // Set timeline to the request to be used in the next middleware
        req.timeline = timeline;
        return validateReference(timeline, req)
          .then(next)
          .catch(next);
      });
  },
};

export default validateTimeline;
