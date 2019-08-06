import util from '../../util';

const summaryJson = require('./mockFiles/summary.json');
const projectBudgetJson = require('./mockFiles/projectBudget.json');

module.exports = (projectId, reportName, req, res) => {
  if (Number(projectId) === 123456) {
    res.status(500).json('Invalid project id');
  }

  switch (reportName) {
    case 'summary':
      res.status(200).json(util.wrapResponse(req.id, summaryJson));
      break;
    case 'projectBudget':
      res.status(200).json(util.wrapResponse(req.id, projectBudgetJson));
      break;
    default:
      res.status(400).json('Invalid report name');
  }
};
