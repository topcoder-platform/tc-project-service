module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('project_member_invites', 'applicationId', {
      type: Sequelize.BIGINT,
      allowNull: true,
      references: {
        model: 'copilot_applications',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('project_member_invites', 'applicationId');
  },
};
