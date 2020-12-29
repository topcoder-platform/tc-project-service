/* eslint-disable max-len */

import models from '../models';
import elasticsearchSync from '../../migrations/elasticsearch_sync';
import { M2M_SCOPES } from '../constants';

const jwt = require('jsonwebtoken');

export default {
  clearDb: done => models.sequelize.sync({ force: true })
    .then(() => {
      if (done) done();
    }),
  clearES: done => elasticsearchSync.sync()
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
    // userId = 40051332,roles: [ 'Connect copilot' ],handle: 'test1',email: 'test@topcoder.com'
    copilot: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlcyI6WyJUb3Bjb2RlciBVc2VyIiwiQ29ubmVjdCBDb3BpbG90Il0sImlzcyI6Imh0dHBzOi8vYXBpLnRvcGNvZGVyLWRldi5jb20iLCJoYW5kbGUiOiJ0ZXN0MSIsImV4cCI6MjU2MzA3NjY4OSwidXNlcklkIjo0MDA1MTMzMiwiZW1haWwiOiJ0ZXN0QHRvcGNvZGVyLmNvbSIsImlhdCI6MTQ3MDYyMDA0NH0.DnX17gBaVF2JTuRai-C2BDSdEjij9da_s4eYcMIjP0c',
    // userId = 40051333, roles: [ 'administrator', 'Topcoder User' ],handle: 'test1',email: 'test@topcoder.com'
    admin: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlcyI6WyJUb3Bjb2RlciBVc2VyIiwiYWRtaW5pc3RyYXRvciJdLCJpc3MiOiJodHRwczovL2FwaS50b3Bjb2Rlci1kZXYuY29tIiwiaGFuZGxlIjoidGVzdDEiLCJleHAiOjI1NjMwNzY2ODksInVzZXJJZCI6IjQwMDUxMzMzIiwiaWF0IjoxNDYzMDc2MDg5LCJlbWFpbCI6InRlc3RAdG9wY29kZXIuY29tIiwianRpIjoiYjMzYjc3Y2QtYjUyZS00MGZlLTgzN2UtYmViOGUwYWU2YTRhIn0.wKWUe0-SaiFVN-VR_-GwgFlvWaDkSbc8H55ktb9LAVw',
    // userId = 40051334, roles: [ 'Manager', 'Topcoder User' ],handle: 'test1',email: 'test@topcoder.com'
    manager: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlcyI6WyJUb3Bjb2RlciBVc2VyIiwiQ29ubmVjdCBNYW5hZ2VyIl0sImlzcyI6Imh0dHBzOi8vYXBpLnRvcGNvZGVyLWRldi5jb20iLCJoYW5kbGUiOiJ0ZXN0MSIsImV4cCI6MjU2MzA3NjY4OSwidXNlcklkIjoiNDAwNTEzMzQiLCJpYXQiOjE0NjMwNzYwODksImVtYWlsIjoidGVzdEB0b3Bjb2Rlci5jb20iLCJqdGkiOiJiMzNiNzdjZC1iNTJlLTQwZmUtODM3ZS1iZWI4ZTBhZTZhNGEifQ.J5VtOEQVph5jfe2Ji-NH7txEDcx_5gthhFeD-MzX9ck',
    // userId = 40051337, roles: [ 'Connect Copilot Manager', 'Connect Manager', 'Topcoder User' ], handle: 'connect_copilot_manger', email: 'connect_copilot_manger@topcoder.com'
    copilotManager: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlcyI6WyJUb3Bjb2RlciBVc2VyIiwiQ29ubmVjdCBNYW5hZ2VyIiwiQ29ubmVjdCBDb3BpbG90IE1hbmFnZXIiXSwiaXNzIjoiaHR0cHM6Ly9hcGkudG9wY29kZXItZGV2LmNvbSIsImhhbmRsZSI6ImNvbm5lY3RfY29waWxvdF9tYW5nZXIiLCJleHAiOjI1NjMwNzY2ODksInVzZXJJZCI6IjQwMDUxMzM3IiwiaWF0IjoxNDYzMDc2MDg5LCJlbWFpbCI6ImNvbm5lY3RfY29waWxvdF9tYW5nZXJAdG9wY29kZXIuY29tIiwianRpIjoiYjMzYjc3Y2QtYjUyZS00MGZlLTgzN2UtYmViOGUwYWU2YTRhIn0.j9nTufEslU5CLXqkwHixC-nNdysJSCYQC9MhacOca64',
    // userId = 40051335, [ 'Topcoder User' ],handle: 'member2',email: 'test@topcoder.com'
    member2: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlcyI6WyJUb3Bjb2RlciBVc2VyIl0sImlzcyI6Imh0dHBzOi8vYXBpLnRvcGNvZGVyLWRldi5jb20iLCJoYW5kbGUiOiJtZW1iZXIyIiwiZXhwIjoyNTYzMDc2Njg5LCJ1c2VySWQiOiI0MDA1MTMzNSIsImlhdCI6MTQ2MzA3NjA4OSwiZW1haWwiOiJ0ZXN0QHRvcGNvZGVyLmNvbSIsImp0aSI6ImIzM2I3N2NkLWI1MmUtNDBmZS04MzdlLWJlYjhlMGFlNmE0YSJ9.Mh4bw3wm-cn5Kcf96gLFVlD0kySOqqk4xN3qnreAKL4',
    // userId = 40051336, [ 'Connect Admin' ], handle: 'connect_admin1', email: 'connect_admin1@topcoder.com'
    connectAdmin: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlcyI6WyJDb25uZWN0IEFkbWluIl0sImlzcyI6Imh0dHBzOi8vYXBpLnRvcGNvZGVyLWRldi5jb20iLCJoYW5kbGUiOiJjb25uZWN0X2FkbWluMSIsImV4cCI6MjU2MzA3NjY4OSwidXNlcklkIjoiNDAwNTEzMzYiLCJpYXQiOjE0NjMwNzYwODksImVtYWlsIjoiY29ubmVjdF9hZG1pbjFAdG9wY29kZXIuY29tIiwianRpIjoiYjMzYjc3Y2QtYjUyZS00MGZlLTgzN2UtYmViOGUwYWU2YTRhIn0.nSGfXMl02NZ90ZKLiEKPg75iAjU92mfteaY6xgqkM30',
    // userId = 40158431, [ 'Topcoder user' ], handle: 'romitchoudhary', email: 'romit.choudhary@rivigo.com'
    romit: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlcyI6WyJUb3Bjb2RlciBVc2VyIl0sImlzcyI6Imh0dHBzOi8vYXBpLnRvcGNvZGVyLWRldi5jb20iLCJoYW5kbGUiOiJyb21pdGNob3VkaGFyeSIsImV4cCI6MTU2MjkxOTc5MSwidXNlcklkIjoiNDAxNTg0MzEiLCJpYXQiOjE1NjI5MTkxOTEsImVtYWlsIjoicm9taXQuY2hvdWRoYXJ5QHJpdmlnby5jb20iLCJqdGkiOiJlMmM1ZTc2NS03OTI5LTRiNzgtYjI2OS1iZDRlODA0NDI4YjMifQ.P1CoydCJuQ8Hv_b0-a8V7Wu0pgIt9qv4NYyB7FTbua0',
  },
  m2m: {
    [M2M_SCOPES.CONNECT_PROJECT_ADMIN]: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3RvcGNvZGVyLWRldi5hdXRoMC5jb20vIiwic3ViIjoidGVzdEBjbGllbnRzIiwiYXVkIjoiaHR0cHM6Ly9tMm0udG9wY29kZXItZGV2LmNvbS8iLCJpYXQiOjE1ODc3MzI0NTksImV4cCI6MjU4NzgxODg1OSwiYXpwIjoidGVzdCIsInNjb3BlIjoiYWxsOmNvbm5lY3RfcHJvamVjdCIsImd0eSI6ImNsaWVudC1jcmVkZW50aWFscyJ9.q34b2IC1pw3ksl5RtnSEW5_HGwN0asx2MD3LV9-Wffg',
    [M2M_SCOPES.PROJECTS.ALL]: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3RvcGNvZGVyLWRldi5hdXRoMC5jb20vIiwic3ViIjoidGVzdEBjbGllbnRzIiwiYXVkIjoiaHR0cHM6Ly9tMm0udG9wY29kZXItZGV2LmNvbS8iLCJpYXQiOjE1ODc3MzI0NTksImV4cCI6MjU4NzgxODg1OSwiYXpwIjoidGVzdCIsInNjb3BlIjoiYWxsOnByb2plY3RzIiwiZ3R5IjoiY2xpZW50LWNyZWRlbnRpYWxzIn0.ixFXMCsBmIN9mQ9Z3s-Apkg20A3d86Pm9RouL7bZMV4',
    [M2M_SCOPES.PROJECTS.READ]: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3RvcGNvZGVyLWRldi5hdXRoMC5jb20vIiwic3ViIjoidGVzdEBjbGllbnRzIiwiYXVkIjoiaHR0cHM6Ly9tMm0udG9wY29kZXItZGV2LmNvbS8iLCJpYXQiOjE1ODc3MzI0NTksImV4cCI6MjU4NzgxODg1OSwiYXpwIjoidGVzdCIsInNjb3BlIjoicmVhZDpwcm9qZWN0cyIsImd0eSI6ImNsaWVudC1jcmVkZW50aWFscyJ9.IpYgfbem-eR6tGjBoxQBPDw6YIulBTZLBn48NuyJT_g',
    [M2M_SCOPES.PROJECTS.WRITE]: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3RvcGNvZGVyLWRldi5hdXRoMC5jb20vIiwic3ViIjoidGVzdEBjbGllbnRzIiwiYXVkIjoiaHR0cHM6Ly9tMm0udG9wY29kZXItZGV2LmNvbS8iLCJpYXQiOjE1ODc3MzI0NTksImV4cCI6MjU4NzgxODg1OSwiYXpwIjoidGVzdCIsInNjb3BlIjoid3JpdGU6cHJvamVjdHMiLCJndHkiOiJjbGllbnQtY3JlZGVudGlhbHMifQ.cAMbmnSKXB8Xl4s4Nlo1LduPySBcvKz2Ygilq5b0OD0',
    [M2M_SCOPES.PROJECT_MEMBERS.ALL]: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3RvcGNvZGVyLWRldi5hdXRoMC5jb20vIiwic3ViIjoidGVzdEBjbGllbnRzIiwiYXVkIjoiaHR0cHM6Ly9tMm0udG9wY29kZXItZGV2LmNvbS8iLCJpYXQiOjE1ODc3MzI0NTksImV4cCI6MjU4NzgxODg1OSwiYXpwIjoidGVzdCIsInNjb3BlIjoiYWxsOnByb2plY3QtbWVtYmVycyIsImd0eSI6ImNsaWVudC1jcmVkZW50aWFscyJ9.6KNEtsb1Y9F8wS5LPgJbCi4dThaIH9v1mMJEGoXWTug',
    [M2M_SCOPES.PROJECT_MEMBERS.READ]: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3RvcGNvZGVyLWRldi5hdXRoMC5jb20vIiwic3ViIjoidGVzdEBjbGllbnRzIiwiYXVkIjoiaHR0cHM6Ly9tMm0udG9wY29kZXItZGV2LmNvbS8iLCJpYXQiOjE1ODc3MzI0NTksImV4cCI6MjU4NzgxODg1OSwiYXpwIjoidGVzdCIsInNjb3BlIjoicmVhZDpwcm9qZWN0LW1lbWJlcnMiLCJndHkiOiJjbGllbnQtY3JlZGVudGlhbHMifQ.7qoDXT76_aQ3xggzMnb6qk49HD4GtD-ePDGAEtinh_U',
    [M2M_SCOPES.PROJECT_MEMBERS.WRITE]: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3RvcGNvZGVyLWRldi5hdXRoMC5jb20vIiwic3ViIjoidGVzdEBjbGllbnRzIiwiYXVkIjoiaHR0cHM6Ly9tMm0udG9wY29kZXItZGV2LmNvbS8iLCJpYXQiOjE1ODc3MzI0NTksImV4cCI6MjU4NzgxODg1OSwiYXpwIjoidGVzdCIsInNjb3BlIjoid3JpdGU6cHJvamVjdC1tZW1iZXJzIiwiZ3R5IjoiY2xpZW50LWNyZWRlbnRpYWxzIn0.FOF8Ej8vOkjCrihPEHR4tG2LNwwV180oHaxMpFgxb7Y',
    [M2M_SCOPES.PROJECT_INVITES.ALL]: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3RvcGNvZGVyLWRldi5hdXRoMC5jb20vIiwic3ViIjoidGVzdEBjbGllbnRzIiwiYXVkIjoiaHR0cHM6Ly9tMm0udG9wY29kZXItZGV2LmNvbS8iLCJpYXQiOjE1ODc3MzI0NTksImV4cCI6MjU4NzgxODg1OSwiYXpwIjoidGVzdCIsInNjb3BlIjoiYWxsOnByb2plY3QtaW52aXRlcyIsImd0eSI6ImNsaWVudC1jcmVkZW50aWFscyJ9.5nfgbHkZA7psRNtxSF94hcUL0BIaUs92URtzi_oS3bQ',
    [M2M_SCOPES.PROJECT_INVITES.READ]: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3RvcGNvZGVyLWRldi5hdXRoMC5jb20vIiwic3ViIjoidGVzdEBjbGllbnRzIiwiYXVkIjoiaHR0cHM6Ly9tMm0udG9wY29kZXItZGV2LmNvbS8iLCJpYXQiOjE1ODc3MzI0NTksImV4cCI6MjU4NzgxODg1OSwiYXpwIjoidGVzdCIsInNjb3BlIjoicmVhZDpwcm9qZWN0LWludml0ZXMiLCJndHkiOiJjbGllbnQtY3JlZGVudGlhbHMifQ.Ku0ti5MGg6rfDMg2ls17MrRjsc9XWdX6iKaPBDDCVSE',
    [M2M_SCOPES.PROJECT_INVITES.WRITE]: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3RvcGNvZGVyLWRldi5hdXRoMC5jb20vIiwic3ViIjoidGVzdEBjbGllbnRzIiwiYXVkIjoiaHR0cHM6Ly9tMm0udG9wY29kZXItZGV2LmNvbS8iLCJpYXQiOjE1ODc3MzI0NTksImV4cCI6MjU4NzgxODg1OSwiYXpwIjoidGVzdCIsInNjb3BlIjoid3JpdGU6cHJvamVjdC1pbnZpdGVzIiwiZ3R5IjoiY2xpZW50LWNyZWRlbnRpYWxzIn0.pdSdglTBxHjorU_sfXLG5fSqU8UzHpTLVt_0RY0pX0U',
  },
  userIds: {
    member: 40051331,
    copilot: 40051332,
    admin: 40051333,
    manager: 40051334,
    member2: 40051335,
    connectAdmin: 40051336,
    copilotManager: 40051337,
    romit: 40158431,
  },
  getDecodedToken: token => jwt.decode(token),

  // Waits for 500ms and executes cb function
  wait: cb => setTimeout(cb, 500),
};
