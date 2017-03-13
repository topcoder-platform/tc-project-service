
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import {
  middleware as tcMiddleware,
} from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';

/**
 * API to update a project member.
 */
const permissions = tcMiddleware.permissions;

const updateProjectAttachmentValidation = {
  body: {
    param: Joi.object().keys({
      title: Joi.string().required(),
      description: Joi.string().optional().allow(null).allow(''),
    }),
  },
};

module.exports = [
  // handles request validations
  validate(updateProjectAttachmentValidation),
  permissions('project.updateAttachment'),
  /**
   * Update a attachment if the user has access
   */
  (req, res, next) => {
    const updatedProps = req.body.param;
    const projectId = _.parseInt(req.params.projectId);
    const attachmentId = _.parseInt(req.params.id);
    updatedProps.updatedBy = req.authUser.userId;

    models.sequelize.transaction(() => models.ProjectAttachment.update(updatedProps, {
      where: {
        id: attachmentId,
        projectId,
      },
      returning: true,
    })
    .then(resp => new Promise((accept, reject) => {
      const affectedCount = resp.shift();
      if (affectedCount === 0) {
          // handle 404
        const err = new Error('project attachment not found for project id ' +
            `${projectId} and member id ${attachmentId}`);
        err.status = 404;
        reject(err);
      } else {
        const attachment = resp.shift()[0];
        req.log.debug('updated project attachment', JSON.stringify(attachment, null, 2));
        res.json(util.wrapResponse(req.id, attachment));
        accept();
      }
    }))
    .catch(err => next(err)));
  },
];
