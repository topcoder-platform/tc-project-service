/* eslint-disable max-len */

import models from '../models';

export default {
  clearDb: done => models.sequelize.sync({ force: true })
      .then(() => {
        if (done) done();
      }),
  mockHttpClient: {
    defaults: { headers: { common: {} } },
    interceptors: { response: { use: () => {} } },
  },
  jwts: {
    // userId = 40051331, [ 'Topcoder User' ],handle: 'test1',email: 'test@topcoder.com'
    member: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlcyI6WyJUb3Bjb2RlciBVc2VyIl0sImlzcyI6Imh0dHBzOi8vYXBpLnRvcGNvZGVyLWRldi5jb20iLCJoYW5kbGUiOiJ0ZXN0MSIsImV4cCI6MjU2MzA3NjY4OSwidXNlcklkIjoiNDAwNTEzMzEiLCJpYXQiOjE0NjMwNzYwODksImVtYWlsIjoidGVzdEB0b3Bjb2Rlci5jb20iLCJqdGkiOiJiMzNiNzdjZC1iNTJlLTQwZmUtODM3ZS1iZWI4ZTBhZTZhNGEifQ.pDtRzcGQjgCBD6aLsW-1OFhzmrv5mXhb8YLDWbGAnKo',
    // userId = 40051332,roles: [ 'Topcoder copilot' ],handle: 'test1',email: 'test@topcoder.com'
    copilot: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlcyI6WyJUb3Bjb2RlciBVc2VyIiwiQ29ubmVjdCBDb3BpbG90Il0sImlzcyI6Imh0dHBzOi8vYXBpLnRvcGNvZGVyLWRldi5jb20iLCJoYW5kbGUiOiJ0ZXN0MSIsImV4cCI6MjU2MzA3NjY4OSwidXNlcklkIjo0MDA1MTMzMiwiZW1haWwiOiJ0ZXN0QHRvcGNvZGVyLmNvbSIsImlhdCI6MTQ3MDYyMDA0NH0.DnX17gBaVF2JTuRai-C2BDSdEjij9da_s4eYcMIjP0c',
    // userId = 40051333, roles: [ 'administrator', 'Topcoder User' ],handle: 'test1',email: 'test@topcoder.com'
    admin: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlcyI6WyJUb3Bjb2RlciBVc2VyIiwiYWRtaW5pc3RyYXRvciJdLCJpc3MiOiJodHRwczovL2FwaS50b3Bjb2Rlci1kZXYuY29tIiwiaGFuZGxlIjoidGVzdDEiLCJleHAiOjI1NjMwNzY2ODksInVzZXJJZCI6IjQwMDUxMzMzIiwiaWF0IjoxNDYzMDc2MDg5LCJlbWFpbCI6InRlc3RAdG9wY29kZXIuY29tIiwianRpIjoiYjMzYjc3Y2QtYjUyZS00MGZlLTgzN2UtYmViOGUwYWU2YTRhIn0.wKWUe0-SaiFVN-VR_-GwgFlvWaDkSbc8H55ktb9LAVw',
    // userId = 40051334, roles: [ 'Manager', 'Topcoder User' ],handle: 'test1',email: 'test@topcoder.com'
    manager: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlcyI6WyJUb3Bjb2RlciBVc2VyIiwiQ29ubmVjdCBNYW5hZ2VyIl0sImlzcyI6Imh0dHBzOi8vYXBpLnRvcGNvZGVyLWRldi5jb20iLCJoYW5kbGUiOiJ0ZXN0MSIsImV4cCI6MjU2MzA3NjY4OSwidXNlcklkIjoiNDAwNTEzMzQiLCJpYXQiOjE0NjMwNzYwODksImVtYWlsIjoidGVzdEB0b3Bjb2Rlci5jb20iLCJqdGkiOiJiMzNiNzdjZC1iNTJlLTQwZmUtODM3ZS1iZWI4ZTBhZTZhNGEifQ.J5VtOEQVph5jfe2Ji-NH7txEDcx_5gthhFeD-MzX9ck',
    // userId = 40051335, [ 'Topcoder User' ],handle: 'member2',email: 'test@topcoder.com'
    member2: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlcyI6WyJUb3Bjb2RlciBVc2VyIl0sImlzcyI6Imh0dHBzOi8vYXBpLnRvcGNvZGVyLWRldi5jb20iLCJoYW5kbGUiOiJtZW1iZXIyIiwiZXhwIjoyNTYzMDc2Njg5LCJ1c2VySWQiOiI0MDA1MTMzNSIsImlhdCI6MTQ2MzA3NjA4OSwiZW1haWwiOiJ0ZXN0QHRvcGNvZGVyLmNvbSIsImp0aSI6ImIzM2I3N2NkLWI1MmUtNDBmZS04MzdlLWJlYjhlMGFlNmE0YSJ9.Mh4bw3wm-cn5Kcf96gLFVlD0kySOqqk4xN3qnreAKL4',
    // userId = 40051336, [ 'Connect Admin' ], handle: 'connect_admin1', email: 'connect_admin1@topcoder.com'
    connectAdmin: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlcyI6WyJDb25uZWN0IEFkbWluIl0sImlzcyI6Imh0dHBzOi8vYXBpLnRvcGNvZGVyLWRldi5jb20iLCJoYW5kbGUiOiJjb25uZWN0X2FkbWluMSIsImV4cCI6MjU2MzA3NjY4OSwidXNlcklkIjoiNDAwNTEzMzYiLCJpYXQiOjE0NjMwNzYwODksImVtYWlsIjoiY29ubmVjdF9hZG1pbjFAdG9wY29kZXIuY29tIiwianRpIjoiYjMzYjc3Y2QtYjUyZS00MGZlLTgzN2UtYmViOGUwYWU2YTRhIn0.nSGfXMl02NZ90ZKLiEKPg75iAjU92mfteaY6xgqkM30',
  },
};
