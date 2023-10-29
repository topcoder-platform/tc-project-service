/* eslint-disable valid-jsdoc */

/**
 * The CustomerPayment model
 */
import _ from 'lodash';
import { CUSTOMER_PAYMENT_STATUS, CUSTOMER_PAYMENT_CURRENCY } from '../constants';

module.exports = (sequelize, DataTypes) => {
  const CustomerPayment = sequelize.define('CustomerPayment', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    reference: { type: DataTypes.STRING(45), allowNull: true },
    referenceId: { type: DataTypes.STRING(255), allowNull: true },
    amount: { type: DataTypes.INTEGER, allowNull: false },
    currency: {
      type: DataTypes.STRING(16),
      allowNull: false,
      validate: {
        isIn: [_.values(CUSTOMER_PAYMENT_CURRENCY)],
      },
    },
    paymentIntentId: { type: DataTypes.STRING(255), allowNull: false },
    clientSecret: { type: DataTypes.STRING(255), allowNull: true },
    status: {
      type: DataTypes.STRING(64),
      allowNull: false,
      validate: {
        isIn: [_.values(CUSTOMER_PAYMENT_STATUS)],
      },
    },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    createdBy: { type: DataTypes.BIGINT, allowNull: false },
    updatedBy: { type: DataTypes.BIGINT, allowNull: false },
  }, {
    tableName: 'customer_payments',
    paranoid: true,
    timestamps: true,
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
    deletedAt: 'deletedAt',
  });
  return CustomerPayment;
};
