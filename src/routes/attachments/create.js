
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
  (req, res, next) => {
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
    const path = _.join([
      config.get('projectAttachmentPathPrefix'),
      data.projectId,
      config.get('projectAttachmentPathPrefix'),
      fileName,
    ], '/');
    let newAttachment = null;

    const httpClient = util.getHttpClient(req);
    // get presigned Url
    httpClient.defaults.headers.common.Authorization = req.headers.authorization;
    let fileServiceUrl = config.get('fileServiceEndpoint');
    if (fileServiceUrl.substr(-1) !== '/') {
      fileServiceUrl += '/';
    }

    const sourceBucket = data.s3Bucket;
    const sourceKey = data.path;
    const destBucket = config.get('attachmentsS3Bucket');
    const destKey = path;

    if (data.type === ATTACHMENT_TYPES.LINK) {
      // We create the record in the db and return (i.e. no need to handle transferring file between S3 buckets)
      Promise.resolve(models.ProjectAttachment.create({
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
      })).then((_link) => {
        const link = _link.get({ plain: true });
        req.log.debug('New Link Attachment record: ', link);

        // emit the Kafka event
        util.sendResourceToKafkaBus(
          req,
          EVENT.ROUTING_KEY.PROJECT_ATTACHMENT_ADDED,
          RESOURCES.ATTACHMENT,
          link);

        res.status(201).json(link);
        return Promise.resolve();
      })
        .catch((error) => {
          req.log.error('Error adding link attachment', error);
          const rerr = error;
          rerr.status = rerr.status || 500;
          next(rerr);
        });
    } else {
    // don't actually transfer file in development mode if file uploading is disabled, so we can test this endpoint
      const fileTransferPromise = (process.env.NODE_ENV !== 'development' || config.get('enableFileUpload') === 'true')
        ? util.s3FileTransfer(req, sourceBucket, sourceKey, destBucket, destKey)
        : Promise.resolve();

      fileTransferPromise.then(() => {
        // file copied to final destination, create DB record
        req.log.debug('creating db file record');
        return models.ProjectAttachment.create({
          projectId,
          allowedUsers,
          createdBy: req.authUser.userId,
          updatedBy: req.authUser.userId,
          title: data.title,
          size: data.size,
          category: data.category || null,
          description: data.description,
          contentType: data.contentType,
          path,
          type: data.type,
          tags: data.tags,
        });
      }).then((_newAttachment) => {
        newAttachment = _newAttachment.get({ plain: true });
        req.log.debug('New Attachment record: ', newAttachment);
        if (process.env.NODE_ENV !== 'development' || config.get('enableFileUpload') === 'true') {
          // retrieve download url for the response
          req.log.debug('retrieving download url');
          return httpClient.post(`${fileServiceUrl}downloadurl`, {
            param: {
              filePath: path,
            },
          });
        }
        return Promise.resolve();
      }).then((resp) => {
        if (process.env.NODE_ENV !== 'development' || config.get('enableFileUpload') === 'true') {
          req.log.debug('Retreiving Presigned Url resp: ', JSON.stringify(resp.data));
          return new Promise((accept, reject) => {
            if (resp.status !== 200 || resp.data.result.status !== 200) {
              reject(new Error('Unable to fetch pre-signed url'));
            } else {
              let response = _.cloneDeep(newAttachment);
              response = _.omit(response, ['path', 'deletedAt']);

              response.downloadUrl = resp.data.result.content.preSignedURL;

              // emit the event
              util.sendResourceToKafkaBus(
                req,
                EVENT.ROUTING_KEY.PROJECT_ATTACHMENT_ADDED,
                RESOURCES.ATTACHMENT,
                newAttachment);
              res.status(201).json(response);
              accept();
            }
          });
        }
        let response = _.cloneDeep(newAttachment);
        response = _.omit(response, ['path', 'deletedAt']);
        // only in development mode
        response.downloadUrl = path;
        // emit the event
        util.sendResourceToKafkaBus(
          req,
          EVENT.ROUTING_KEY.PROJECT_ATTACHMENT_ADDED,
          RESOURCES.ATTACHMENT,
          newAttachment);

        res.status(201).json(response);
        return Promise.resolve();
      })
        .catch((error) => {
          req.log.error('Error adding file attachment', error);
          const rerr = error;
          rerr.status = rerr.status || 500;
          next(rerr);
        });
    }
  },
];
