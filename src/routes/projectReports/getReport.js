/* eslint-disable no-unused-vars */
import config from 'config';

import { middleware as tcMiddleware } from 'tc-core-library-js';
import LookApi from './LookRun';
import mock from './mock';

const permissions = tcMiddleware.permissions;

module.exports = [
  permissions('project.view'),
  (req, res, next) => {
    const projectId = Number(req.params.projectId);
    const reportName = req.query.reportName;

    if (config.lookerConfig.USE_MOCK) {
      // using mock
      mock(projectId, reportName, res);
    } else {
      const lookApi = new LookApi();
      lookApi
        .runQuery(projectId)
        .then((result) => {
          res.send(result);
        })
        .catch((err) => {
          res.status(500).send(err.toString());
        });
    }
  },
];
