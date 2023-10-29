/**
 * API to list all milestone templates
 */
import _ from 'lodash';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import models from '../../models';
import validateMilestoneTemplate from '../../middlewares/validateMilestoneTemplate';

const permissions = tcMiddleware.permissions;

module.exports = [
  validateMilestoneTemplate.validateQueryFilter,
  permissions('milestoneTemplate.view'),
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
      apiErr.status = 400;
      return next(apiErr);
    }
    const sortColumnAndOrder = sort.split(' ');

    // Get all milestone templates
    let where = {};
    let esTerms = [];
    if (req.query.reference) {
      where = _.assign(where, {
        reference: req.query.reference,
      });
      esTerms = _.concat(esTerms, {
        term: { 'milestoneTemplates.reference': req.query.reference },
      });
    }

    if (req.query.referenceId) {
      where = _.assign(where, {
        referenceId: req.query.referenceId,
      });
      esTerms = _.concat(esTerms, {
        term: { 'milestoneTemplates.referenceId': req.query.referenceId },
      });
    }

    let query = {};
    if (esTerms.length > 0) {
      query = {
        query: {
          nested: {
            path: 'milestoneTemplates',
            query:
            {
              filtered: {
                filter: {
                  bool: {
                    must: esTerms,
                  },
                },
              },
            },
            inner_hits: {},
          },
        },
      };
    }

    return util.fetchFromES('milestoneTemplates', query)
      .then((data) => {
        let milestoneTemplates = _.isArray(data.milestoneTemplates) ?
          data.milestoneTemplates : data.milestoneTemplates.hits.hits;
        if (milestoneTemplates.length === 0) {
          req.log.debug('No milestoneTemplate found in ES');
          return models.MilestoneTemplate.findAll({
            where,
            order: [sortColumnAndOrder],
            attributes: { exclude: ['deletedAt', 'deletedBy'] },
            raw: true,
          })
            .then(result => res.json(result))
            .catch(next);
        }
        req.log.debug('milestoneTemplates found in ES');
        // Get the milestoneTemplates
        milestoneTemplates = _.map(milestoneTemplates, (m) => {
          if (m._source) return m._source; // eslint-disable-line no-underscore-dangle
          return m;
        });
        // Sort
        milestoneTemplates = _.orderBy(milestoneTemplates, [sortColumnAndOrder[0]], [sortColumnAndOrder[1]]);
        return res.json(milestoneTemplates);
      })
      .catch(next);
  },
];
