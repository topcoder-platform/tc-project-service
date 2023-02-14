import _ from 'lodash';
import config from 'config';
import Joi from 'joi';
import validate from 'express-validation';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';

const ES_PROJECT_INDEX = config.get('elasticsearchConfig.indexName');

/**
 * API to list a project phase approvals.
 */
const permissions = tcMiddleware.permissions;

const listPhaseMemberValidations = {
  params: {
    projectId: Joi.number().integer().positive().required(),
    phaseId: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  // handles request validations
  validate(listPhaseMemberValidations),
  permissions('phaseApproval.view'),
  async (req, res, next) => {
    const projectId = _.parseInt(req.params.projectId);
    const phaseId = _.parseInt(req.params.phaseId);
    try {
      const esClient = util.getElasticSearchClient();
      const { body: project } = await esClient.search({
        index: ES_PROJECT_INDEX,
        body: {
          query: {
            bool: {
              must: [
                { term: { id: projectId } },
                {
                  nested: {
                    path: 'phases',
                    query: {
                      term: { 'phases.id': phaseId },
                    },
                  },
                },
              ],
            },
          },
        },
      });
      if (!project.hits.total) {
        throw new Error();
      }
      // eslint-disable-next-line no-underscore-dangle
      const phase = _.find(project.hits.hits[0]._source.phases, [
        'id',
        phaseId,
      ]);
      const approvals = phase.approvals || [];
      res.json(approvals);
      return;
    } catch (err) {
      req.log.debug(
        'No active project phase found in ES for project id ' +
          `${projectId} and phase id ${phaseId}`,
      );
    }
    try {
      req.log.debug('Fall back to DB');
      const phase = await models.ProjectPhase.findOne({
        where: {
          id: phaseId,
          projectId,
        },
        include: [
          {
            model: models.ProjectPhaseApproval,
            as: 'approvals',
          },
        ],
      });
      if (!phase) {
        const err = new Error(
          `No active project phase found for project id ${projectId} and phase id ${phaseId}`,
        );
        err.status = 404;
        throw err;
      }
      const approvals = phase.toJSON().approvals;
      res.json(approvals);
    } catch (err) {
      next(err);
    }
  },
];
