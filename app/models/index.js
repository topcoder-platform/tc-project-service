"use strict"

var fs = require("fs")
var path = require("path")
var config = require("config")
var cls = require('continuation-local-storage')
// BIGINT string bug - https://github.com/sequelize/sequelize/issues/1774
var pg = require('pg')
pg.defaults.parseInt8 = true
delete pg.native

var Sequelize = require("sequelize")

Sequelize.cls = cls.createNamespace('tc.micro.service')

var sequelize = new Sequelize(config.get('dbConfig.masterUrl'), {
  logging: false,
  dialectOptions: {
    ssl: false
  },
  define: {
    timestamps: false
  },
  freezeTableName: true,
  pool: {
    max: config.dbConfig.maxPoolSize,
    min: config.dbConfig.minPoolSize,
    idle: config.dbConfig.idleTimeout
  }
})

var db = {}

fs
  .readdirSync(__dirname)
  .filter(function(file) {
    return (file.indexOf(".") !== 0) && (file !== "index.js")
  })
  .forEach(function(file) {
    var model = sequelize["import"](path.join(__dirname, file))
    db[model.name] = model
  })

Object.keys(db).forEach(function(modelName) {
    if ("associate" in db[modelName]) {
        db[modelName].associate(db)
    }
})

db.sequelize = sequelize
db.Sequelize = Sequelize

module.exports = db
