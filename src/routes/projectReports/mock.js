import fs from 'fs';
import path from 'path';

module.exports = (projectId, reportName, res) => {
  if (Number(projectId) === 123456) {
    res.status(500).json('Invalid project id');
  } else if (reportName === 'summary') {
    res.status(200).type('application/json');
    const fileName = path.resolve(__dirname, './mockFiles/summary.txt');
    fs.createReadStream(fileName).pipe(res);
  } else {
    res.status(400).json('Invalid report name');
  }
};
