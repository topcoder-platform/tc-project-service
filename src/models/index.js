
import fs from 'fs';
import path from 'path';
import config from 'config';
import cls from 'continuation-local-storage';
import pg from 'pg';
import Sequelize from 'sequelize';

// // BIGINT string bug - https://github.com/sequelize/sequelize/issues/1774
pg.defaults.parseInt8 = true;
delete pg.native;

Sequelize.cls = cls.createNamespace('tc.micro.service');

const sequelize = new Sequelize(config.get('dbConfig.masterUrl'), {
  logging: false,
  dialectOptions: {
    ssl: false,
  },
  define: {
    timestamps: false,
  },
  freezeTableName: true,
  pool: {
    max: config.dbConfig.maxPoolSize,
    min: config.dbConfig.minPoolSize,
    idle: config.dbConfig.idleTimeout,
  },
});

const db = {};

fs
  .readdirSync(__dirname)
  .filter(file => (file.indexOf('.') !== 0) && (file !== 'index.js'))
  .forEach((file) => {
    const model = sequelize.import(path.join(__dirname, file));
    db[model.name] = model;
  });

Object.keys(db).forEach((modelName) => {
  if ('associate' in db[modelName]) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export default db;
