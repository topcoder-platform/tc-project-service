/* eslint-disable valid-jsdoc */
import _ from 'lodash';

import models from './';

/**
 * The Project Template model
 */
module.exports = (sequelize, DataTypes) => {
  const ProjectTemplate = sequelize.define('ProjectTemplate', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    key: { type: DataTypes.STRING(45), allowNull: false },
    category: { type: DataTypes.STRING(45), allowNull: false },
    icon: { type: DataTypes.STRING(255), allowNull: false },
    question: { type: DataTypes.STRING(255), allowNull: false },
    info: { type: DataTypes.STRING(255), allowNull: false },
    aliases: { type: DataTypes.JSON, allowNull: false },
    scope: { type: DataTypes.JSON, allowNull: true },
    phases: { type: DataTypes.JSON, allowNull: true },
    form: { type: DataTypes.JSON },
    planConfig: { type: DataTypes.JSON },
    priceConfig: { type: DataTypes.JSON },
    disabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    hidden: { type: DataTypes.BOOLEAN, defaultValue: false },
    deletedAt: DataTypes.DATE,
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    deletedBy: DataTypes.BIGINT,
    createdBy: { type: DataTypes.BIGINT, allowNull: false },
    updatedBy: { type: DataTypes.BIGINT, allowNull: false },
  }, {
    tableName: 'project_templates',
    paranoid: true,
    timestamps: true,
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
    deletedAt: 'deletedAt',
  });

  ProjectTemplate.getTemplate = templateId =>
    ProjectTemplate.findByPk(templateId, { raw: true })
      .then((template) => {
        const formRef = template.form;
        return formRef
          ? models.Form.findAll({ where: formRef, raw: true })
            .then(forms => Object.assign({}, template, { form: _.maxBy(forms, f => f.revision) }))
          : template;
      });

  return ProjectTemplate;
};
