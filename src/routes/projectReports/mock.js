import _ from 'lodash';

const summaryJson = require('./mockFiles/summary.json');
let projectBudgetJson = require('./mockFiles/projectBudget.json');

module.exports = (projectId, reportName, req, res) => {
  if (Number(projectId) === 123456) {
    res.status(500).json('Invalid project id');
  }

  switch (reportName) {
    case 'summary':
      res.status(200).json(summaryJson);
      break;
    case 'projectBudget': {
      const augmentProjectId = pb => _.assign(pb, { 'project_stream.tc_connect_project_id': projectId });
      projectBudgetJson = _.map(projectBudgetJson, augmentProjectId);
      res.status(200).json(projectBudgetJson);
      break;
    }
    default:
      res.status(400).json('Invalid report name');
  }
};
