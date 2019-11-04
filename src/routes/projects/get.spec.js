/* eslint-disable no-unused-expressions */
/* eslint-disable max-len */
import chai from 'chai';
import sinon from 'sinon';
import request from 'supertest';

import config from 'config';
import models from '../../models';
import util from '../../util';
import server from '../../app';
import testUtil from '../../tests/util';


const ES_PROJECT_INDEX = config.get('elasticsearchConfig.indexName');
const ES_PROJECT_TYPE = config.get('elasticsearchConfig.docType');

const should = chai.should();

const data = [
  {
    id: 5,
    type: 'generic',
    billingAccountId: 1,
    name: 'test1',
    description: 'es_project',
    status: 'active',
    details: {
      utm: {
        code: 'code1',
      },
    },
    createdBy: 1,
    updatedBy: 1,
    lastActivityAt: 1,
    lastActivityUserId: '1',
    members: [
      {
        id: 1,
        userId: 40051331,
        projectId: 1,
        role: 'customer',
        firstName: 'es_member_1_firstName',
        lastName: 'Lastname',
        handle: 'test_tourist_handle',
        isPrimary: true,
        createdBy: 1,
        updatedBy: 1,
      },
      {
        id: 2,
        userId: 40051332,
        projectId: 1,
        role: 'copilot',
        isPrimary: true,
        createdBy: 1,
        updatedBy: 1,
      },
    ],
    attachments: [
      {
        id: 1,
        title: 'Spec',
        projectId: 1,
        description: 'specification',
        filePath: 'projects/1/spec.pdf',
        contentType: 'application/pdf',
        createdBy: 1,
        updatedBy: 1,
      },
    ],
  },
];

describe('GET Project', () => {
  // only add project1 to es
  let project1;
  let project2;
  before((done) => {
    testUtil.clearDb()
        .then(() => testUtil.clearES())
        .then(() => {
          const p1 = models.Project.create({
            type: 'generic',
            billingAccountId: 1,
            name: 'test1',
            description: 'test project1',
            status: 'draft',
            details: {},
            createdBy: 1,
            updatedBy: 1,
            lastActivityAt: 1,
            lastActivityUserId: '1',
          }).then((p) => {
            project1 = p;
            // create members
            const pm1 = models.ProjectMember.create({
              userId: 40051331,
              projectId: project1.id,
              role: 'customer',
              isPrimary: true,
              createdBy: 1,
              updatedBy: 1,
            });
            const pm2 = models.ProjectMember.create({
              userId: 40051333,
              projectId: project1.id,
              role: 'copilot',
              isPrimary: true,
              createdBy: 1,
              updatedBy: 1,
            });
            return Promise.all([pm1, pm2]);
          });

          const p2 = models.Project.create({
            type: 'visual_design',
            billingAccountId: 1,
            name: 'test2',
            description: 'db_project',
            id: 2,
            status: 'draft',
            details: {},
            createdBy: 1,
            updatedBy: 1,
            lastActivityAt: 1,
            lastActivityUserId: '1',
          }).then((p) => {
            project2 = p;
            return models.ProjectMember.create({
              userId: 40051335,
              projectId: project2.id,
              role: 'manager',
              handle: 'manager_handle',
              isPrimary: true,
              createdBy: 1,
              updatedBy: 1,
            });
          });
          return Promise.all([p1, p2])
              .then(() => server.services.es.index({
                index: ES_PROJECT_INDEX,
                type: ES_PROJECT_TYPE,
                id: data[0].id,
                body: data[0],
              })).then(() => {
                // sleep for some time, let elasticsearch indices be settled
                // sleep.sleep(5);
                testUtil.wait(done);
                // done();
              });
        });
  });

  after((done) => {
    testUtil.clearDb()
      .then(() => testUtil.clearES())
      .then(done);
  });

  describe('GET /projects/{id}', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
          .get(`/v5/projects/${project2.id}`)
          .expect(403)
          .end(done);
    });

    it('should return 404 if requested project doesn\'t exist', (done) => {
      request(server)
          .get('/v5/projects/14343323')
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .expect(404)
          .end(done);
    });

    it('should return 403 if user does not have access to the project', (done) => {
      request(server)
          .get(`/v5/projects/${project2.id}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.member}`,
          })
          .expect(403)
          .end(done);
    });

    it('should return the project when registerd member attempts to access the project', (done) => {
      request(server)
          .get(`/v5/projects/${project1.id}/?fields=id%2Cname%2Cstatus%2Cmembers.role%2Cmembers.id%2Cmembers.userId`)
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
              should.not.exist(resJson.deletedAt);
              should.not.exist(resJson.billingAccountId);
              should.exist(resJson.name);
              resJson.status.should.be.eql('draft');
              resJson.members.should.have.lengthOf(2);
              done();
            }
          });
    });

    it('should return project with "members", "invites", and "attachments" by default when data comes from ES', (done) => {
      request(server)
          .get(`/v5/projects/${data[0].id}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err, res) => {
            if (err) {
              done(err);
            } else {
              const resJson = res.body;
              should.exist(resJson);
              resJson.description.should.be.eql('es_project');
              resJson.members.should.have.lengthOf(2);
              resJson.members[0].firstName.should.equal('es_member_1_firstName');
              done();
            }
          });
    });

    it('should return project with "members", "invites", and "attachments" by default when data comes from DB', (done) => {
      request(server)
          .get(`/v5/projects/${project2.id}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err, res) => {
            if (err) {
              done(err);
            } else {
              const resJson = res.body;
              should.exist(resJson);
              resJson.description.should.be.eql('db_project');
              resJson.members.should.have.lengthOf(1);
              resJson.members[0].role.should.equal('manager');
              done();
            }
          });
    });

    it('should return the project for administrator ', (done) => {
      request(server)
          .get(`/v5/projects/${project1.id}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.admin}`,
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err, res) => {
            if (err) {
              done(err);
            } else {
              const resJson = res.body;
              should.exist(resJson);
              done();
            }
          });
    });

    it('should return the project for connect admin ', (done) => {
      request(server)
          .get(`/v5/projects/${project1.id}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err, res) => {
            if (err) {
              done(err);
            } else {
              const resJson = res.body;
              should.exist(resJson);
              done();
            }
          });
    });

    it('should return attachment with downloadUrl', (done) => {
      models.ProjectAttachment.create({
        projectId: project1.id,
        filePath: 'projects/1/spec.pdf',
        contentType: 'application/pdf',
        createdBy: 1,
        updatedBy: 1,
        name: 'spec.pdf',
        description: 'blah',
      }).then((attachment) => {
        const mockHttpClient = {
          defaults: { headers: { common: {} } },
          post: () => new Promise(resolve => resolve({
            status: 200,
            data: {
              result: {
                status: 200,
                content: {
                  filePath: 'projects/1/spec.pdf',
                  preSignedURL: 'https://www.topcoder-dev.com/downloadUrl',
                },
              },
            },
          })),
        };
        const spy = sinon.spy(mockHttpClient, 'post');
        const stub = sinon.stub(util, 'getHttpClient', () => mockHttpClient);

        request(server)
            .get(`/v5/projects/${project1.id}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .expect('Content-Type', /json/)
            .expect(200)
            .end((err, res) => {
              stub.restore();
              if (err) {
                done(err);
              } else {
                const resJson = res.body;
                should.exist(resJson);
                spy.should.have.been.calledOnce;
                resJson.attachments.should.have.lengthOf(1);
                resJson.attachments[0].filePath.should.equal(attachment.filePath);
                // downloadUrl no more needed
                // resJson.attachments[0].downloadUrl.should.exist;
                done();
              }
            });
      });
    });
  });
});
