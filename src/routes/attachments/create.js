
/**
 * API to handle adding project attachment.
 *
 */
import validate from 'express-validation';
import _ from 'lodash';
import config from 'config';
import Joi from 'joi';
import path from 'path';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import models from '../../models';
import util from '../../util';
import { EVENT } from '../../constants';

const permissions = tcMiddleware.permissions;

const addAttachmentValidations = {
  body: {
    param: Joi.object().keys({
      title: Joi.string().required(),
      description: Joi.string().optional().allow(null).allow(''),
      category: Joi.string().optional().allow(null).allow(''),
      size: Joi.number().optional(),
      filePath: Joi.string().required(),
      s3Bucket: Joi.string().required(),
      contentType: Joi.string().required(),
    }).required(),
  },
};

module.exports = [
  // handles request validations
  validate(addAttachmentValidations),
  permissions('project.addAttachment'),
  /**
   * Add project attachment
   * In development mode we have to mock the ec2 file transfer and file service calls
   */
  (req, res, next) => {
    const data = req.body.param;
    // default values
    const projectId = req.params.projectId;
    _.assign(data, {
      projectId,
      createdBy: req.authUser.userId,
      updatedBy: req.authUser.userId,
    });

    // extract file name
    const fileName = path.parse(data.filePath).base;
    // create file path
    const filePath = _.join([
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

    const fileTransferPromise = new Promise((accept, reject) => {
      if (process.env.NODE_ENV !== 'development') {
        // get pre-signed Url
        req.log.debug('requesting presigned Url');
        httpClient.post(`${fileServiceUrl}uploadurl/`, {
          param: {
            filePath,
            contentType: data.contentType,
            isPublic: false,
          },
        }).then((resp) => {
          req.log.debug('Presigned Url resp: ', JSON.stringify(resp.data, null, 2));
          if (resp.status !== 200 || resp.data.result.status !== 200) {
            return reject(new Error(resp.data.result.message));
          }
          // store deistination path & url
          const destinationUri = `s3://${config.get('attachmentsS3Bucket')}/${filePath}`;
          const sourceUri = `s3://${data.s3Bucket}/${data.filePath}`;
          req.log.debug('Moving s3 file');
          // transfer file
          return util.s3FileTransfer(req, sourceUri, destinationUri);
        }).then(() => accept()).catch(reject);
      } else {
        accept();
      }
    });

    fileTransferPromise.then(() => {
      // file copied to final destination, create DB record
      req.log.debug('creating db record');
      return models.ProjectAttachment.create({
        projectId,
        createdBy: req.authUser.userId,
        updatedBy: req.authUser.userId,
        title: data.title,
        size: data.size,
        category: data.category || null,
        description: data.description,
        contentType: data.contentType,
        filePath,
      });
    }).then((_newAttachment) => {
      newAttachment = _newAttachment.get({ plain: true });
      req.log.debug('New Attachment record: ', newAttachment);
      if (process.env.NODE_ENV !== 'development') {
        // retrieve download url for the response
        req.log.debug('retrieving download url');
        return httpClient.post(`${fileServiceUrl}downloadurl`, {
          param: {
            filePath,
          },
        });
      }
      return Promise.resolve();
    }).then((resp) => {
      if (process.env.NODE_ENV !== 'development') {
        req.log.debug('Retreiving Presigned Url resp: ', JSON.stringify(resp.data));
        return new Promise((accept, reject) => {
          if (resp.status !== 200 || resp.data.result.status !== 200) {
            reject(new Error('Unable to fetch pre-signed url'));
          } else {
            let response = _.cloneDeep(newAttachment);
            response = _.omit(response, ['filePath', 'deletedAt']);

            response.downloadUrl = resp.data.result.content.preSignedURL;
            // publish event
            req.app.services.pubsub.publish(
              EVENT.ROUTING_KEY.PROJECT_ATTACHMENT_ADDED,
              newAttachment,
              { correlationId: req.id },
            );
            req.app.emit(EVENT.ROUTING_KEY.PROJECT_ATTACHMENT_ADDED, { req, attachment: newAttachment });
            res.status(201).json(util.wrapResponse(req.id, response, 1, 201));
            accept();
          }
        });
      }
      let response = _.cloneDeep(newAttachment);
      response = _.omit(response, ['filePath', 'deletedAt']);
      // only in development mode
      response.downloadUrl = filePath;
      // publish event
      req.app.services.pubsub.publish(
        EVENT.ROUTING_KEY.PROJECT_ATTACHMENT_ADDED,
        newAttachment,
        { correlationId: req.id },
      );
      req.app.emit(EVENT.ROUTING_KEY.PROJECT_ATTACHMENT_ADDED, { req, attachment: newAttachment });
      res.status(201).json(util.wrapResponse(req.id, response, 1, 201));
      return Promise.resolve();
    })
    .catch((error) => {
      req.log.error('Error adding attachment', error);
      const rerr = error;
      rerr.status = rerr.status || 500;
      next(rerr);
    });
  },
];
