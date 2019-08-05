import util from '../../util';

const summaryJson = require('./mockFiles/summary.json');

module.exports = (projectId, reportName, req, res) => {
  if (Number(projectId) === 123456) {
    res.status(500).json('Invalid project id');
  } else if (reportName === 'summary') {
    res.status(200).json(util.wrapResponse(req.id, summaryJson));
  } else {
    res.status(400).json('Invalid report name');
  }
};
