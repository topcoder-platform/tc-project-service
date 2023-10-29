/* eslint-disable no-unused-expressions */
/* eslint-disable max-len */
import chai from 'chai';
import request from 'supertest';
import _ from 'lodash';
import config from 'config';
import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';
import { ATTACHMENT_TYPES } from '../../constants';
import util from '../../util';

const ES_PROJECT_INDEX = config.get('elasticsearchConfig.indexName');
const ES_PROJECT_TYPE = config.get('elasticsearchConfig.docType');
const eClient = util.getElasticSearchClient();

const should = chai.should();

const data = [
  {
    id: 5,
    type: 'generic',
    billingAccountId: 1,
    name: 'test1',
    description: 'es_project',
    cancelReason: 'price/cost',
    status: 'draft',
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
        email: 'test@test.com',
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
    invites: [
      {
        id: 1,
        userId: 40051335,
        email: 'test@topcoder.com',
        status: 'pending',
      },
    ],
    phases: [

      {
        id: 45,
        name: 'test phases',
        spentBudget: 0,
        products: [
          {

            phaseId: 45,
            id: 3,
            name: 'tet product',
          },
        ],
      },
    ],
    attachments: [
      {
        id: 1,
        title: 'Spec',
        projectId: 1,
        description: 'specification',
        path: 'projects/1/spec.pdf',
        type: ATTACHMENT_TYPES.FILE,
        tags: ['tag1'],
        contentType: 'application/pdf',
        createdBy: 1,
        updatedBy: 1,
      },
      {
        id: 2,
        title: 'Link 1',
        projectId: 1,
        description: 'specification link',
        path: 'projects/1/linkA',
        type: ATTACHMENT_TYPES.LINK,
        tags: ['tag2'],
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
          id: 5,
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
            firstName: 'Firstname',
            lastName: 'Lastname',
            handle: 'test_tourist_handle',
            email: 'test@test.com',
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
          .then(() => eClient.index({
            index: ES_PROJECT_INDEX,
            type: ES_PROJECT_TYPE,
            id: data[0].id,
            body: data[0],
          })).then(() => {
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

    it('should return the project using M2M token with "read:projects" scope', (done) => {
      request(server)
        .get(`/v5/projects/${project1.id}/?fields=id%2Cname%2Cstatus%2Cmembers.role%2Cmembers.id%2Cmembers.userId`)
        .set({
          Authorization: `Bearer ${testUtil.m2m['read:projects']}`,
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
            should.not.exist(resJson.members);
            done();
          }
        });
    });

    it('should return the project with empty invites using M2M token without "read:project-invites" scope', (done) => {
      request(server)
        .get(`/v5/projects/${project1.id}`)
        .set({
          Authorization: `Bearer ${testUtil.m2m['read:projects']}`,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.invites.should.be.empty;
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

            resJson.attachments.should.have.lengthOf(2);
            resJson.attachments[0].id.should.eql(data[0].attachments[0].id);
            resJson.attachments[0].title.should.eql(data[0].attachments[0].title);
            resJson.attachments[0].projectId.should.eql(data[0].attachments[0].projectId);
            resJson.attachments[0].description.should.eql(data[0].attachments[0].description);
            resJson.attachments[0].path.should.eql(data[0].attachments[0].path);
            resJson.attachments[0].tags.should.eql(data[0].attachments[0].tags);
            resJson.attachments[0].contentType.should.eql(data[0].attachments[0].contentType);
            resJson.attachments[0].createdBy.should.eql(data[0].attachments[0].createdBy);
            resJson.attachments[0].updatedBy.should.eql(data[0].attachments[0].updatedBy);

            resJson.attachments[1].id.should.eql(data[0].attachments[1].id);
            resJson.attachments[1].title.should.eql(data[0].attachments[1].title);
            resJson.attachments[1].projectId.should.eql(data[0].attachments[1].projectId);
            resJson.attachments[1].description.should.eql(data[0].attachments[1].description);
            resJson.attachments[1].path.should.eql(data[0].attachments[1].path);
            resJson.attachments[1].tags.should.eql(data[0].attachments[1].tags);
            resJson.attachments[1].createdBy.should.eql(data[0].attachments[1].createdBy);
            resJson.attachments[1].updatedBy.should.eql(data[0].attachments[1].updatedBy);

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

    describe('URL Query fields', () => {
      it('should not return "email" for project members when "fields" query param is not defined (to non-admin users)', (done) => {
        request(server)
          .get(`/v5/projects/${project1.id}`)
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
              resJson.members[0].should.have.property('handle');
              resJson.members[0].should.not.have.property('email');
              done();
            }
          });
      });

      it('should not return "email" for project members even if it\'s listed in "fields" query param (to non-admin users)', (done) => {
        request(server)
          .get(`/v5/projects/${project1.id}?fields=members.email,members.handle`)
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
              resJson.members[0].should.have.property('handle');
              resJson.members[0].should.not.have.property('email');
              done();
            }
          });
      });


      it('should not return "cancelReason" if it is not listed in "fields" query param ', (done) => {
        request(server)
          .get(`/v5/projects/${project1.id}?fields=description`)
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
              resJson.should.have.property('description');
              resJson.description.should.be.eq('es_project');
              resJson.should.not.have.property('cancelReason');
              done();
            }
          });
      });

      it('should not return "email" for project members if it\'s not listed in "fields" query param (to admin users)', (done) => {
        request(server)
          .get(`/v5/projects/${project1.id}?fields=description,members.id`)
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
              resJson.members.should.have.lengthOf(2);
              resJson.members[0].should.not.have.property('email');
              done();
            }
          });
      });

      it('should return "email" for project members if it\'s listed in "fields" query param (to admin users)', (done) => {
        request(server)
          .get(`/v5/projects/${project1.id}?fields=description,members.id,members.email`)
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
              resJson.members.should.have.lengthOf(2);
              resJson.members[0].should.have.property('email');
              resJson.members[0].email.should.be.eq('test@test.com');
              done();
            }
          });
      });

      it('should only return "id" field, when it\'s the only field listed in "fields" query param', (done) => {
        request(server)
          .get(`/v5/projects/${project1.id}?fields=id`)
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
              resJson.should.have.property('id');
              _.keys(resJson).length.should.be.eq(1);
              done();
            }
          });
      });

      it('should only return "invites.userId" field, when it\'s the only field listed in "fields" query param', (done) => {
        request(server)
          .get(`/v5/projects/${project1.id}?fields=invites.userId`)
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
              resJson.invites[0].should.have.property('userId');
              _.keys(resJson.invites[0]).length.should.be.eq(1);
              done();
            }
          });
      });

      it('should not return "userId" for any invite which has "email" field', (done) => {
        request(server)
          .get(`/v5/projects/${project1.id}`)
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
              resJson.invites.length.should.be.eql(1);
              resJson.invites[0].should.have.property('email');
              should.not.exist(resJson.invites[0].userId);
              done();
            }
          });
      });

      it('should only return "members.role" field, when it\'s the only field listed in "fields" query param', (done) => {
        request(server)
          .get(`/v5/projects/${project1.id}?fields=members.role`)
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
              resJson.members[0].should.have.property('role');
              _.keys(resJson.members[0]).length.should.be.eq(1);
              done();
            }
          });
      });

      it('should only return "attachments.title" field, when it\'s the only field listed in "fields" query param', (done) => {
        request(server)
          .get(`/v5/projects/${project1.id}?fields=attachments.title`)
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
              resJson.attachments[0].should.have.property('title');
              _.keys(resJson.attachments[0]).length.should.be.eq(1);
              done();
            }
          });
      });

      it('should only return "phases.name" field, when it\'s the only field listed in "fields" query param', (done) => {
        request(server)
          .get(`/v5/projects/${project1.id}?fields=phases.name`)
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
              resJson.phases[0].should.have.property('name');
              _.keys(resJson.phases[0]).length.should.be.eq(1);
              done();
            }
          });
      });

      it('should only return "phases.products.name" field, when it\'s the only field listed in "fields" query param', (done) => {
        request(server)
          .get(`/v5/projects/${project1.id}?fields=phases.products.name`)
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
              resJson.phases[0].products[0].should.have.property('name');
              _.keys(resJson.phases[0].products[0]).length.should.be.eq(1);
              done();
            }
          });
      });
    });
  });
});
