import chai from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import config from 'config';
import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const summaryJson = require('./mockFiles/summary.json');
const projectBudget = require('./mockFiles/projectBudget.json');
const axios = require('axios');

const should = chai.should();

describe('GET report', () => {
  let project1;
  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => {
        models.Project.create({
          type: 'generic',
          directProjectId: 1,
          billingAccountId: 1,
          name: 'test1',
          description: 'test project1',
          status: 'reviewed',
          details: {},
          createdBy: 1,
          updatedBy: 1,
          lastActivityAt: 1,
          lastActivityUserId: '1',
        }).then((p) => {
          project1 = p;
          // create members
          return models.ProjectMember.create({
            userId: 40051332,
            projectId: project1.id,
            role: 'copilot',
            isPrimary: true,
            createdBy: 1,
            updatedBy: 1,
          }).then(() => models.ProjectMember.create({
            userId: 40051334,
            projectId: project1.id,
            role: 'manager',
            isPrimary: true,
            createdBy: 1,
            updatedBy: 1,
          }).then(() => models.ProjectMember.create({
            userId: 40051331,
            projectId: project1.id,
            role: 'customer',
            isPrimary: true,
            createdBy: 1,
            updatedBy: 1,
          }).then(() => {
            done();
          }),
          ),
          );
        });
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('GET /projects/{id}/reports', () => {
    let sandbox;
    beforeEach(() => {
      sandbox = sinon.sandbox.create();
    });
    afterEach(() => {
      sandbox.restore();
    });

    it('should return 403 if user does not have permissions', (done) => {
      request(server)
        .get(`/v5/projects/${project1.id}/reports/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .expect('Content-Type', /json/)
        .expect(403, done);
    });

    it('should return 403 if project not exist', (done) => {
      request(server)
        .get('/v5/projects/100100/reports/')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect('Content-Type', /json/)
        .expect(403, done);
    });

    it('should return 400 if report not exist and lookerConfig.USE_MOCK is true', (done) => {
      request(server)
        .get(`/v5/projects/${project1.id}/reports/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect('Content-Type', /json/)
        .expect(400, done);
    });

    it('should return mock summary report when lookerConfig.USE_MOCK is true', (done) => {
      request(server)
        .get(`/v5/projects/${project1.id}/reports?reportName=summary`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.should.deep.equal(summaryJson);
            done();
          }
        });
    });

    it('should return mock projectBudget report when lookerConfig.USE_MOCK is true', (done) => {
      request(server)
        .get(`/v5/projects/${project1.id}/reports?reportName=projectBudget`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.should.deep.equal(projectBudget);
            done();
          }
        });
    });

    it('should return 404 when report name illegal', (done) => {
      const cfg = sinon.stub(config, 'get');
      cfg.withArgs('lookerConfig.USE_MOCK').returns(false);
      request(server)
        .get(`/v5/projects/${project1.id}/reports?reportName=random`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(404, (err) => {
          cfg.restore();
          done(err);
        });
    });

    it('should return summary report when a customer get summary report', (done) => {
      const cfg = sinon.stub(config, 'get');
      const ast = sinon.stub(axios, 'post', () => Promise.resolve({ data: { report: 'summary' } }));
      cfg.withArgs('lookerConfig.USE_MOCK').returns(false);
      request(server)
        .get(`/v5/projects/${project1.id}/reports?reportName=summary`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          cfg.restore();
          ast.restore();
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.should.deep.equal({ report: 'summary' });
            const accessArgs = ast.lastCall.args;
            accessArgs[0].should.equal('/queries/run/json');
            accessArgs[1].id.should.equal(1234);
            accessArgs[1].model.should.equal('topcoder_model_main');
            accessArgs[1].view.should.equal('challenge');
            accessArgs[1].filters.should.deep.equal({ 'connect_project.id': 1 });
            accessArgs[1].fields[0].should.equal('connect_project.id');
            accessArgs[1].fields[1].should.equal('challenge.track');
            accessArgs[1].fields[2].should.equal('challenge.num_registrations');
            accessArgs[1].fields[3].should.equal('challenge.num_submissions');
            accessArgs[1].limit.should.equal(10);
            accessArgs[1].query_timezon.should.equal('America/Los_Angeles');
            done();
          }
        });
    });

    it('should return projectBudget report when a customer get projectBudget report', (done) => {
      const cfg = sinon.stub(config, 'get');
      const ast = sinon.stub(axios, 'post', () => Promise.resolve({ data: { report: 'projectBudget' } }));
      cfg.withArgs('lookerConfig.USE_MOCK').returns(false);
      request(server)
        .get(`/v5/projects/${project1.id}/reports?reportName=projectBudget`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          cfg.restore();
          ast.restore();
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.should.deep.equal({ report: 'projectBudget' });
            const accessArgs = ast.lastCall.args;
            accessArgs[0].should.equal('/queries/run/json');
            accessArgs[1].id.should.equal(123);
            accessArgs[1].model.should.equal('topcoder_model_main');
            accessArgs[1].view.should.equal('project_stream');
            accessArgs[1].filters.should.deep.equal({ 'project_stream.tc_connect_project_id': 1 });
            accessArgs[1].fields[0].should.equal('project_stream.tc_connect_project_id');
            accessArgs[1].fields[1].should.equal('project_stream.total_invoiced_amount');
            accessArgs[1].fields[2].should.equal('project_stream.remaining_invoiced_budget');
            accessArgs[1].limit.should.equal(10);
            accessArgs[1].query_timezon.should.equal('America/Los_Angeles');
            done();
          }
        });
    });

    it('should return projectBudget report when a copilot get projectBudget report', (done) => {
      const cfg = sinon.stub(config, 'get');
      const ast = sinon.stub(axios, 'post', () => Promise.resolve({ data: { report: 'projectBudget' } }));
      cfg.withArgs('lookerConfig.USE_MOCK').returns(false);
      request(server)
        .get(`/v5/projects/${project1.id}/reports?reportName=projectBudget`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          cfg.restore();
          ast.restore();
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.should.deep.equal({ report: 'projectBudget' });
            const accessArgs = ast.lastCall.args;
            accessArgs[0].should.equal('/queries/run/json');
            accessArgs[1].id.should.equal(123);
            accessArgs[1].model.should.equal('topcoder_model_main');
            accessArgs[1].view.should.equal('project_stream');
            accessArgs[1].filters.should.deep.equal({ 'project_stream.tc_connect_project_id': 1 });
            accessArgs[1].fields[0].should.equal('project_stream.tc_connect_project_id');
            accessArgs[1].fields[1].should.equal('project_stream.total_actual_member_payment');
            accessArgs[1].limit.should.equal(10);
            accessArgs[1].query_timezon.should.equal('America/Los_Angeles');
            done();
          }
        });
    });

    it('should return projectBudget report when an admin get projectBudget report', (done) => {
      const cfg = sinon.stub(config, 'get');
      const ast = sinon.stub(axios, 'post', () => Promise.resolve({ data: { report: 'projectBudget' } }));
      cfg.withArgs('lookerConfig.USE_MOCK').returns(false);
      request(server)
        .get(`/v5/projects/${project1.id}/reports?reportName=projectBudget`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          cfg.restore();
          ast.restore();
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.should.deep.equal({ report: 'projectBudget' });
            const accessArgs = ast.lastCall.args;
            accessArgs[0].should.equal('/queries/run/json');
            accessArgs[1].id.should.equal(123);
            accessArgs[1].model.should.equal('topcoder_model_main');
            accessArgs[1].view.should.equal('project_stream');
            accessArgs[1].filters.should.deep.equal({ 'project_stream.tc_connect_project_id': 1 });
            accessArgs[1].fields[0].should.equal('project_stream.tc_connect_project_id');
            accessArgs[1].fields[1].should.equal('project_stream.total_actual_challenge_fee');
            accessArgs[1].fields[2].should.equal('project_stream.total_actual_member_payment');
            accessArgs[1].fields[3].should.equal('project_stream.total_invoiced_amount');
            accessArgs[1].fields[4].should.equal('project_stream.remaining_invoiced_budget');
            accessArgs[1].limit.should.equal(10);
            accessArgs[1].query_timezon.should.equal('America/Los_Angeles');
            done();
          }
        });
    });
  });
});
