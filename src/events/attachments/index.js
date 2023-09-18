/**
 * Event handlers for attachment create, and av scan result
 */
import Joi from 'joi';
import config from 'config';
import util from '../../util';
import { BUS_API_EVENT } from '../../constants';
import { createEvent } from '../../services/busApi';

/**
 * Payload for new unified BUS events like `avscan.projects.assets.result` with `resource=attachment`
 */
const attachmentScanResultPayloadSchema = Joi.object().keys({
  url: Joi.string().required(),
  fileName: Joi.string().required(),
  isInfected: Joi.boolean().required(),
}).unknown(true).required();

/**
 * Updates project activity fields. throws exceptions in case of error
 * @param   {Object}  app       Application object used to interact with RMQ service
 * @param   {String}  topic     Kafka topic
 * @param   {Object}  payload   Message payload
 * @return  {Promise} Promise
 */
async function attachmentScanResultKafkaHandler(app, topic, payload) {
  // Validate payload
  const result = Joi.validate(payload, attachmentScanResultPayloadSchema);
  if (result.error) {
    throw new Error(result.error);
  }
  const sourceBucket = config.get('attachmentsDMZS3Bucket');
  // if the attachment is infected, move it to the quarantine s3 bucket, if not move it to the clean s3 bucket
  if (payload.isInfected) {
    // move to quarantine
    const destBucket = config.get('attachmentsQuarantineS3Bucket');
    util.s3FileTransfer({ log: app.logger }, sourceBucket, payload.path, destBucket, payload.path);
    app.logger.debug(`Attachment ${payload.fileName} is infected, moving to quarantine`);
  } else {
    // move to clean
    const destBucket = config.get('attachmentsS3Bucket');
    util.s3FileTransfer({ log: app.logger }, sourceBucket, payload.path, destBucket, payload.path);
  }
}

/**
 * Payload for new unified BUS events like `avscan.action.scan` with `resource=attachment`
 */
const attachmentPayloadSchema = Joi.object().keys({
  path: Joi.string().required(),
}).unknown(true).required();

/**
 * Attachment Created BUS API event handler.
 * - requests av scan by posting a kafka message to `avscan.action.scan` topic
 * - throws exceptions in case of error
 *
 * @param   {Object}  app       Application object
 * @param   {String}  topic     Kafka topic
 * @param   {Object}  payload   Message payload
 * @return  {Promise} Promise
 */
async function attachmentCreatedKafkaHandler(app, topic, payload) {
  // Validate payload
  const result = Joi.validate(payload, attachmentPayloadSchema);
  if (result.error) {
    throw new Error(result.error);
  }
  // Construct s3 url
  const avScanPayload = {
    url: `https://${config.get('attachmentsDMZS3Bucket')}.s3.amazonaws.com/${encodeURIComponent(payload.path)}`,
    fileName: payload.path.split('/').pop(),
    moveFile: false,
    callbackOption: 'kafka',
    callbackKafkaTopic: BUS_API_EVENT.PROJECT_ATTACHMENT_SCAN_RESULT,
  };
  await createEvent(
    BUS_API_EVENT.AV_SCAN_REQUEST,
    avScanPayload,
    app.logger,
  );
}

module.exports = {
  attachmentScanResultKafkaHandler,
  attachmentCreatedKafkaHandler,
};
