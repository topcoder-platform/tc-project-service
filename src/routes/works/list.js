/**
 * API to list all works
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';
import models from '../../models';

const PHASE_ATTRIBUTES = _.keys(models.ProjectPhase.rawAttributes);
const permissions = tcMiddleware.permissions;

const schema = {
  params: {
    projectId: Joi.number().integer().positive().required(),
    workStreamId: Joi.number().integer().positive().required(),
  },
};

module.exports = [
  validate(schema),
  permissions('work.view'),
  (req, res, next) => {
    const workStreamId = req.params.workStreamId;
    const projectId = req.params.projectId;

    // Parse the fields string to determine what fields are to be returned
    const rawFields = req.query.fields ? decodeURIComponent(req.query.fields).split(',') : PHASE_ATTRIBUTES;
    let sort = req.query.sort ? decodeURIComponent(req.query.sort) : 'startDate';
    if (sort && sort.indexOf(' ') === -1) {
      sort += ' asc';
    }
    const sortableProps = [
      'startDate asc', 'startDate desc',
      'endDate asc', 'endDate desc',
      'status asc', 'status desc',
      'order asc', 'order desc',
    ];
    if (sort && _.indexOf(sortableProps, sort) < 0) {
      return util.handleError('Invalid sort criteria', null, req, next);
    }

    const sortParameters = sort.split(' ');

    const fields = _.union(
      _.intersection(rawFields, [...PHASE_ATTRIBUTES, 'workItems']),
      ['id'], // required fields
    );

    // search condition for ProjectPhase
    const include = {
      model: models.ProjectPhase,
      through: { attributes: [] },
      where: {
        projectId,
      },
      attributes: fields.filter(f => f !== 'workItems'),
      required: false,
    };
    if (fields.includes('workItems')) {
      _.set(include, 'include', [{ model: models.PhaseProduct, as: 'products' }]);
    }

    return models.WorkStream.findOne({
      where: {
        id: workStreamId,
        projectId,
        deletedAt: { $eq: null },
      },
      include: [include],
      order: [[models.ProjectPhase, sortParameters[0], sortParameters[1]]],
    })
      .then((existingWorkStream) => {
        if (!existingWorkStream) {
        // handle 404
          const err = new Error(`active work stream not found for project id ${projectId} ` +
          `and work stream id ${workStreamId}`);
          err.status = 404;
          throw err;
        }

        // rename 'products' to 'workItems'
        return existingWorkStream.ProjectPhases.map((phase) => {
          const phaseObj = phase.get({ plain: true });
          if (_.has(phaseObj, 'products')) {
            _.set(phaseObj, 'workItems', _.get(phaseObj, 'products'));
            _.unset(phaseObj, 'products');
          }
          return phaseObj;
        });
      })
      .then(phases => res.json(phases))
      .catch(next);
  },
];
