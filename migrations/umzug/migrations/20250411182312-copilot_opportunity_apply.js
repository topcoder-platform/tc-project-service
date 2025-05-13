

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('copilot_applications', {
      id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      opportunityId: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'copilot_opportunities',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      deletedBy: {
        type: Sequelize.BIGINT,
        allowNull: true,
      },
      createdBy: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      updatedBy: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('copilot_applications');
  },
};
