/* eslint-disable no-unused-expressions */
import _ from 'lodash';
import request from 'supertest';
import config from 'config';
import sleep from 'sleep';
import chai from 'chai';
import server from '../../app';
import models from '../../models';
import testUtil from '../../tests/util';

const ES_PROJECT_INDEX = config.get('elasticsearchConfig.indexName');
const ES_PROJECT_TYPE = config.get('elasticsearchConfig.docType');

const should = chai.should();

const body = {
  name: 'test project phase',
  status: 'active',
  startDate: '2018-05-15T00:00:00Z',
  endDate: '2018-05-15T12:00:00Z',
  budget: 20.0,
  progress: 1.23456,
  details: {
    message: 'This can be any json',
  },
  createdBy: 1,
  updatedBy: 1,
};

describe('Project Phases', () => {
  let projectId;
  let project;
  before(function beforeHook(done) {
    this.timeout(10000);
    // mocks
    testUtil.clearDb()
      .then(() => {
        models.Project.create({
          type: 'generic',
          billingAccountId: 1,
          name: 'test1',
          description: 'test project1',
          status: 'draft',
          details: {},
          createdBy: 1,
          updatedBy: 1,
        }).then((p) => {
          projectId = p.id;
          project = p.toJSON();
          // create members
          models.ProjectMember.create({
            userId: 40051332,
            projectId,
            role: 'copilot',
            isPrimary: true,
            createdBy: 1,
            updatedBy: 1,
          }).then(() => {
            _.assign(body, { projectId });
            return models.ProjectPhase.create(body);
          }).then((phase) => {
            // Index to ES
            project.phases = [phase];
            return server.services.es.index({
              index: ES_PROJECT_INDEX,
              type: ES_PROJECT_TYPE,
              id: projectId,
              body: project,
            }).then(() => {
              // sleep for some time, let elasticsearch indices be settled
              sleep.sleep(5);
              done();
            });
          });
        });
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('GET /projects/{id}/phases/', () => {
    it('should return 403 when user have no permission', (done) => {
      request(server)
        .get(`/v4/projects/${projectId}/phases/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send({ param: body })
        .expect('Content-Type', /json/)
        .expect(403, done);
    });

    it('should return 404 when no project with specific projectId', (done) => {
      request(server)
        .get('/v4/projects/999/phases/')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({ param: body })
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 1 phase when user have project permission', (done) => {
      request(server)
        .get(`/v4/projects/${projectId}/phases/`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({ param: body })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.result.content;
            should.exist(resJson);
            resJson.should.have.lengthOf(1);
            done();
          }
        });
    });
  });
});
