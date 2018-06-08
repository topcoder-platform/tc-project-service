/**
 * API to list all milestones
 */
import validate from 'express-validation';
import Joi from 'joi';
import config from 'config';
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';

const permissions = tcMiddleware.permissions;

const ES_TIMELINE_INDEX = config.get('elasticsearchConfig.timelineIndexName');
const ES_TIMELINE_TYPE = config.get('elasticsearchConfig.timelineDocType');

const schema = {
  params: {
    timelineId: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  // Validate and get projectId from the timelineId param, and set to request params for
  // checking by the permissions middleware
  util.validateTimelineIdParam,
  permissions('milestone.view'),
  (req, res, next) => {
    // Parse the sort query
    let sort = req.query.sort ? decodeURIComponent(req.query.sort) : 'order';
    if (sort && sort.indexOf(' ') === -1) {
      sort += ' asc';
    }
    const sortableProps = [
      'order asc', 'order desc',
    ];
    if (sort && _.indexOf(sortableProps, sort) < 0) {
      const apiErr = new Error('Invalid sort criteria');
      apiErr.status = 422;
      return next(apiErr);
    }
    const sortColumnAndOrder = sort.split(' ');

    // Get timeline from ES
    return util.getElasticSearchClient().get({
      index: ES_TIMELINE_INDEX,
      type: ES_TIMELINE_TYPE,
      id: req.params.timelineId,
    })
      .then((doc) => {
        if (!doc) {
          const err = new Error(`Timeline not found for timeline id ${req.params.timelineId}`);
          err.status = 404;
          throw err;
        }

        // Get the milestones
        let milestones = _.isArray(doc._source.milestones) ? doc._source.milestones : []; // eslint-disable-line no-underscore-dangle

        // Sort
        milestones = _.orderBy(milestones, [sortColumnAndOrder[0]], [sortColumnAndOrder[1]]);

        // Write to response
        res.json(util.wrapResponse(req.id, milestones, milestones.length));
      })
      .catch(err => next(err));
  },
];
