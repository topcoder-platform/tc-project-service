module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('copilot_requests', 'copilotOpportunityId', {
      type: Sequelize.BIGINT,
      allowNull: true,
      references: {
        model: 'copilot_opportunities',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('copilot_requests', 'copilotOpportunityId');
  },
};
