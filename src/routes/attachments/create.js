
/**
 * API to handle adding project attachment.
 *
 */
import validate from 'express-validation';
import _ from 'lodash';
import config from 'config';
import Joi from 'joi';
import Path from 'path';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import { getDownloadUrl } from '../../services/fileService';
import { EVENT, RESOURCES, ATTACHMENT_TYPES } from '../../constants';

const permissions = tcMiddleware.permissions;

const addAttachmentValidations = {
  body: Joi.object().keys({
    title: Joi.string().required(),
    description: Joi.string().optional().allow(null).allow(''),
    category: Joi.string().optional().allow(null).allow(''),
    size: Joi.number().optional(),
    path: Joi.string().required(),
    type: Joi.string().required().valid(_.values(ATTACHMENT_TYPES)),
    tags: Joi.array().items(Joi.string().min(1)).optional(),
    s3Bucket: Joi.string().when('type', { is: ATTACHMENT_TYPES.FILE, then: Joi.string().required() }),
    contentType: Joi.string().when('type', { is: ATTACHMENT_TYPES.FILE, then: Joi.string().required() }),
    allowedUsers: Joi.array().items(Joi.number().integer().positive()).allow(null).default(null),
  }).required(),
};

module.exports = [
  // handles request validations
  validate(addAttachmentValidations),
  permissions('projectAttachment.create'),
  /*
   * Add project attachment
   * In development mode we have to mock the ec2 file transfer and file service calls
   */
  async (req, res, next) => {
    const data = req.body;
    // default values
    const projectId = req.params.projectId;
    const allowedUsers = data.allowedUsers;
    _.assign(data, {
      projectId,
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId,
    });

    // extract file name
    const fileName = Path.parse(data.path).base;
    // create file path
    const attachmentPath = _.join([
      config.get('projectAttachmentPathPrefix'),
      data.projectId,
      config.get('projectAttachmentPathPrefix'),
      fileName,
    ], '/');

    const sourceBucket = data.s3Bucket;
    const sourceKey = data.path;
    const destBucket = config.get('attachmentsS3Bucket');
    const destKey = attachmentPath;

    try {
      if (data.type === ATTACHMENT_TYPES.LINK) {
        // Create the record and return immediately (no file transfer needed)
        const linkInstance = await models.ProjectAttachment.create({
          projectId,
          allowedUsers,
          createdBy: req.authUser.userId,
          updatedBy: req.authUser.userId,
          title: data.title,
          size: data.size,
          category: data.category || null,
          description: data.description,
          contentType: data.contentType,
          path: data.path,
          type: data.type,
          tags: data.tags,
        });
        const link = linkInstance.get({ plain: true });
        req.log.debug('New Link Attachment record: ', link);

        util.sendResourceToKafkaBus(
          req,
          EVENT.ROUTING_KEY.PROJECT_ATTACHMENT_ADDED,
          RESOURCES.ATTACHMENT,
          link,
        );

        res.status(201).json(link);
        return;
      }

      const shouldTransfer = process.env.NODE_ENV !== 'development' || config.get('enableFileUpload') === 'true';
      const downloadUrlPromise = shouldTransfer
        ? getDownloadUrl(destBucket, destKey)
        : Promise.resolve(destKey);

      req.log.debug('creating db file record');
      const attachmentInstance = await models.ProjectAttachment.create({
        projectId,
        allowedUsers,
        createdBy: req.authUser.userId,
        updatedBy: req.authUser.userId,
        title: data.title,
        size: data.size,
        category: data.category || null,
        description: data.description,
        contentType: data.contentType,
        path: destKey,
        type: data.type,
        tags: data.tags,
      });

      const newAttachment = attachmentInstance.get({ plain: true });
      req.log.debug('New Attachment record: ', newAttachment);

      const downloadUrl = await downloadUrlPromise;
      req.log.debug('Retrieved presigned url for new attachment');

      let response = _.cloneDeep(newAttachment);
      response = _.omit(response, ['path', 'deletedAt']);
      response.downloadUrl = downloadUrl;

      util.sendResourceToKafkaBus(
        req,
        EVENT.ROUTING_KEY.PROJECT_ATTACHMENT_ADDED,
        RESOURCES.ATTACHMENT,
        newAttachment,
      );

      res.status(201).json(response);

      if (shouldTransfer) {
        util.s3FileTransfer(req, sourceBucket, sourceKey, destBucket, destKey)
          .then(() => {
            req.log.debug('File attachment copied asynchronously', { attachmentId: newAttachment.id });
          })
          .catch((error) => {
            req.log.error('Async S3 file transfer failed', {
              error: error.message,
              stack: error.stack,
              attachmentId: newAttachment.id,
              source: `${sourceBucket}/${sourceKey}`,
              destination: `${destBucket}/${destKey}`,
            });
          });
      }
    } catch (error) {
      req.log.error('Error adding attachment', error);
      const rerr = error;
      rerr.status = rerr.status || 500;
      next(rerr);
    }
  },
];
