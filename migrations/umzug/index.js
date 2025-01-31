const config = require('config');
const { Sequelize } = require('sequelize');
const { Umzug, SequelizeStorage } = require('umzug');

// Initialize Sequelize
const sequelize = new Sequelize(config.get('dbConfig.masterUrl'), {
  dialect: 'postgres',
});

console.log('Umzug migration script:', __dirname);

// Initialize Umzug
const umzug = new Umzug({
  migrations: {
    glob: 'migrations/*.js',
    resolve: ({ name, path, context }) => {
      console.log('Loading migration:', name, path);
      const migration = require(path);
      return {
        name,
        up: async () => migration.up(context, Sequelize),
        down: async () => migration.down(context, Sequelize),
      };
    },
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

// Run migrations
if (require.main === module) {
  umzug
    .up()
    .then(() => {
      console.log('Migrations executed successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed', err);
      process.exit(1);
    });
}

module.exports = umzug;
