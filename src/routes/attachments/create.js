
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

    // get presigned Url
    const httpClient = util.getHttpClient(req);
    httpClient.defaults.headers.common.Authorization = req.headers.authorization;

    let fileServiceUrl = config.get('fileServiceEndpoint');
    if (fileServiceUrl.substr(-1) !== '/') fileServiceUrl += '/';

    // get pre-signed Url
    req.log.debug('requesting presigned Url');
    return httpClient.post(`${fileServiceUrl}uploadurl/`, {
      param: {
        filePath,
        contentType: data.contentType,
        isPublic: false,
      },
    })
    .then((resp) => {
      req.log.debug('Presigned Url resp: ', JSON.stringify(resp.data, null, 2));
      if (resp.status !== 200 || resp.data.result.status !== 200) {
        return Promise.reject(new Error(resp.data.result.message));
      }
      // store deistination path & url
      const destinationUri = `s3://${config.get('attachmentsS3Bucket')}/${filePath}`;
      const sourceUri = `s3://${data.s3Bucket}/${data.filePath}`;
      req.log.debug('Moving s3 file');
      return util.s3FileTransfer(req, sourceUri, destinationUri);
    })
    .then(() => {
      // file copied to final destination, create DB record
      req.log.debug('creating db record');
      return models.ProjectAttachment
          .create({
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
    })
    .then((_newAttachment) => {
      newAttachment = _newAttachment.get({ plain: true });
      req.log.debug('New Attachment record: ', newAttachment);
      // retrieve download url for the response
      req.log.debug('retrieving download url');
      return httpClient.post(`${fileServiceUrl}downloadurl`, {
        param: {
          filePath,
        },
      });
    })
    .then((resp) => {
      req.log.debug('Retreiving Presigned Url resp: ', JSON.stringify(resp.data, null, 2));
      return new Promise((accept, reject) => {
        if (resp.status !== 200 || resp.data.result.status !== 200) {
          reject(new Error('Unable to fetch pre-signed url'));
        } else {
          let response = _.cloneDeep(newAttachment);
          response = _.omit(response, ['filePath', 'deletedAt']);

          response.downloadUrl = resp.data.result.content.preSignedURL;
          res.status(201).json(util.wrapResponse(req.id, response, 1, 201));
          accept();
        }
      });
    })
    .catch((err) => {
      req.log.error('Error adding attachment', err);
      const rerr = err;
      rerr.status = rerr.status || 500;
      next(rerr);
    });
  },
];
