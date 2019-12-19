/**
 * API to add a new version of form
 */
import validate from 'express-validation';
import _ from 'lodash';
import Joi from 'joi';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import { EVENT, RESOURCES } from '../../constants';
import util from '../../util';
import models from '../../models';

const permissions = tcMiddleware.permissions;

const schema = {
  body: Joi.object().keys({
    form: Joi.object().keys({
      version: Joi.number().integer().positive().required(),
      key: Joi.string().required(),
    }).optional(),
  }).optional(),
};

module.exports = [
  validate(schema),
  permissions('productTemplate.upgrade'),
  (req, res, next) => {
    models.sequelize.transaction(
      () => models.ProductTemplate.findOne({
        where: {
          id: req.params.templateId,
        },
      }).then(async (productTemplate) => {
        if (_.isNil(productTemplate)) {
          const apiErr = new Error(`product template not found for id ${req.body.templateId}`);
          apiErr.status = 404;
          throw apiErr;
        }

        if (_.isNil(productTemplate.template)) {
          const apiErr = new Error('Current product template\'s template is null');
          apiErr.status = 400;
          throw apiErr;
        }

        let newForm = {};
        if (_.isNil(req.body.form)) {
          const { productKey, template = {} } = productTemplate;
          const { version } = await models.Form.createNewVersion(productKey, template, req.authUser.userId);
          newForm = {
            version,
            key: productKey,
          };
        } else {
          newForm = req.body.form;
          await util.checkModel(newForm, 'Form', models.Form, 'product template');
        }
        // update product template with new form data
        const updatePayload = {
          template: null,
          form: newForm,
          updatedBy: req.authUser.userId,
        };

        const newProductTemplate = await productTemplate.update(updatePayload);

        // emit event
        util.sendResourceToKafkaBus(req,
          EVENT.ROUTING_KEY.PROJECT_METADATA_UPDATE,
          RESOURCES.PRODUCT_TEMPLATE,
          updatePayload);

        return res.status(201).json(_.omit(newProductTemplate.toJSON(), 'deletedAt', 'deletedBy'));
      }).catch(next));
  },
];
