/* eslint-disable valid-jsdoc */

/**
 * The Timeline model
 */
import _ from 'lodash';

module.exports = (sequelize, DataTypes) => {
  const Timeline = sequelize.define('Timeline', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    description: DataTypes.STRING(255),
    startDate: { type: DataTypes.DATE, allowNull: false },
    endDate: DataTypes.DATE,
    reference: { type: DataTypes.STRING(45), allowNull: false },
    referenceId: { type: DataTypes.BIGINT, allowNull: false },
    deletedAt: DataTypes.DATE,
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    deletedBy: DataTypes.BIGINT,
    createdBy: { type: DataTypes.BIGINT, allowNull: false },
    updatedBy: { type: DataTypes.BIGINT, allowNull: false },
  }, {
    tableName: 'timelines',
    paranoid: true,
    timestamps: true,
    updatedAt: 'updatedAt',
    createdAt: 'createdAt',
    deletedAt: 'deletedAt',
  });

  Timeline.associate = (models) => {
    Timeline.hasMany(models.Milestone, { as: 'milestones', foreignKey: 'timelineId', onDelete: 'cascade' });
  };

  /**
   * Search keyword in name, description, details.utm.code (To be deprecated)
   * @param filters: the filters contains reference & referenceId
   * @param log the request log
   * @return the result rows
   */
  Timeline.search = (filters, log) => {
    // special handling for keyword filter
    let query = '1=1 ';
    const replacements = {};
    if (_.has(filters, 'reference')) {
      query += 'AND timelines.reference = :reference ';
      replacements.reference = filters.reference;
    }
    if (_.has(filters, 'referenceId')) {
      query += 'AND timelines."referenceId" = :referenceId';
      replacements.referenceId = filters.referenceId;
    }

    // select timelines
    return sequelize.query(`SELECT * FROM timelines AS timelines
      WHERE ${query}`,
    { type: sequelize.QueryTypes.SELECT,
      replacements,
      logging: (str) => { log.debug(str); },
      raw: true,
    })
      .then(timelines => timelines);
  };


  return Timeline;
};
