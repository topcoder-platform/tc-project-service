/* eslint-disable max-len */

const http = require('https');
const _ = require('lodash');

const options = {
  method: 'POST',
  hostname: 'localhost',
  port: 8443,
  rejectUnauthorized: false,
  path: '/v3/direct/projects/1/copilot',
  headers: {
    'Content-Type': 'application/json',
    authorization: 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlcyI6WyJhZG1pbmlzdHJhdG9yIl0sImlzcyI6Imh0dHBzOi8vYXBpLnRvcGNvZGVyLmNvbSIsImhhbmRsZSI6InRlc3QxIiwiZXhwIjoyNTYzMDc2Njg5LCJ1c2VySWQiOiI0MDA1MTMzMyIsImlhdCI6MTQ2MzA3NjA4OSwiZW1haWwiOiJ0ZXN0QHRvcGNvZGVyLmNvbSIsImp0aSI6ImIzM2I3N2NkLWI1MmUtNDBmZS04MzdlLWJlYjhlMGFlNmE0YSJ9.uiZHiDXF-_KysU5tq-G82oBTYBR0gV_w-svLX_2O6ts',
    'cache-control': 'no-cache',
    'postman-token': 'cf9afe9c-dee8-b6bd-ccfb-de528e06b262',
  },
};

const req = http.request(options, (res) => {
  const chunks = [];

  res.on('data', (chunk) => {
    chunks.push(chunk);
  });

  res.on('end', _.noop);
});
req.write('{\n "copilotUserId": 123456789\n}');
req.end();
