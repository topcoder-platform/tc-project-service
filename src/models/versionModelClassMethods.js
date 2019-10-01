/* eslint-disable valid-jsdoc */
/**
 * generate class methods for version model
 *
 * @param {Model} model  Model
 * @param {string} jsonField field for json
 *
 * @returns classMethod for Model
 */
function versionModelClassMethods(model, jsonField) {
  return {
    findOneWithLatestRevision(query) {
      return model.findOne({
        where: {
          key: query.key,
          version: query.version,
        },
        order: [['revision', 'DESC']],
        limit: 1,
        attributes: { exclude: ['deletedAt', 'deletedBy'] },
      });
    },
    deleteOldestRevision(userId, key, version) {
      return model.findOne({
        where: {
          key,
          version,
        },
        order: [['revision', 'ASC']],
      }).then(record => record.update({ deletedBy: userId })).then(record => record.destroy());
    },
    newVersionNumber(key) {
      return model.findAll({
        where: {
          key,
        },
        order: [['version', 'DESC']],
      }).then((records) => {
        let latestVersion = 1;
        if (records.length !== 0) {
          const latestVersionRecord = records.reduce((prev, current) =>
            ((prev.version < current.version) ? current : prev));
          latestVersion = latestVersionRecord.version + 1;
        }
        return Promise.resolve(latestVersion);
      });
    },
    createNewVersion(key, json, userId) {
      return model.newVersionNumber(key)
        .then(newVersion => model.create({
          version: newVersion,
          revision: 1,
          key,
          [jsonField]: json,
          createdBy: userId,
          updatedBy: userId,
        }));
    },
    latestVersion() {
      const query = {
        attributes: { exclude: ['deletedAt', 'deletedBy'] },
        raw: true,
      };
      return model.findAll(query)
        .then((records) => {
          const keys = {};
          records.forEach((record) => {
            const { key, version, revision } = record;
            const isNewerVersion = (keys[key] != null) && (keys[key].version < version);
            const isNewerRevision = (keys[key] != null) &&
              (keys[key].version === version) && (keys[key].revision < revision);
            if ((keys[key] == null) || isNewerVersion || isNewerRevision) {
              keys[key] = record;
            }
          });
          return Promise.resolve(Object.values(keys));
        });
    },
    latestRevisionOfLatestVersion(key) {
      return model.findAll({
        where: {
          key,
        },
        order: [['version', 'DESC'], ['revision', 'DESC']],
        attributes: { exclude: ['deletedAt', 'deletedBy'] },
      })
        .then(records => (records.length > 0 ? Promise.resolve(records[0]) : Promise.resolve(null)));
    },
    latestVersionIncludeUsed(usedKeyVersionsMap) {
      const query = {
        attributes: { exclude: ['deletedAt', 'deletedBy'] },
        raw: true,
      };
      let allRecord;
      let latestVersionRecord;
      const usedKeyVersion = usedKeyVersionsMap;
      return model.findAll(query)
        .then((records) => {
          allRecord = records;
          return model.latestVersion();
        }).then((records) => {
          latestVersionRecord = records;
          const versions = {};
          latestVersionRecord.forEach((record) => {
            usedKeyVersion[record.key] = usedKeyVersion[record.key] ? usedKeyVersion[record.key] : {};
            usedKeyVersion[record.key][record.version] = true;
          });

          allRecord.forEach((record) => {
            const { key, version, revision } = record;
            if (usedKeyVersion[key] && usedKeyVersion[key][version]) {
              if (versions[key] && versions[key][version]) {
                if (versions[key][version].revision < revision) {
                  versions[record.key][record.version] = record;
                }
              } else {
                versions[key] = versions[key] ? versions[key] : {};
                versions[key][version] = record;
              }
            }
          });
          const result = [];
          Object.values(versions).forEach((key) => {
            Object.values(key).forEach((record) => {
              result.push(record);
            });
          });
          return Promise.resolve(result);
        });
    },
  };
}


export default versionModelClassMethods;
