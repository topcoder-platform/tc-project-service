module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('copilot_applications', 'status', {
      type: Sequelize.STRING(16),
      allowNull: true,
    });

    await queryInterface.sequelize.query(
      `UPDATE copilot_applications SET status = 'pending' WHERE status IS NULL`
    );

    await queryInterface.changeColumn('copilot_applications', 'status', {
      type: Sequelize.STRING(16),
      allowNull: false,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('copilot_applications', 'status');
  },
};
