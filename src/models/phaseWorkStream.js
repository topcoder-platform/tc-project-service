/* eslint-disable valid-jsdoc */

/**
 * The PhaseWorkStream model
 */

module.exports = (sequelize) => {
  const PhaseWorkStream = sequelize.define('PhaseWorkStream', {},
    {
      tableName: 'phase_work_streams',
    });

  return PhaseWorkStream;
};
