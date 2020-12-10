/* eslint-disable no-unused-expressions */
/* eslint-disable max-len */
import chai from 'chai';
import _ from 'lodash';
import request from 'supertest';
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
// test data for 3 projects
const data = [
  {
    id: 1,
    type: 'generic',
    billingAccountId: 1,
    name: 'test1',
    description: 'test project1 abc/d',
    status: 'active',
    details: {
      utm: {
        code: 'code1',
      },
    },
    createdBy: 1,
    updatedBy: 1,
    cancelReason: 'price/cost',
    lastActivityAt: 1,
    lastActivityUserId: '1',
    members: [
      {
        id: 1,
        userId: 40051331,
        projectId: 1,
        role: 'customer',
        firstName: 'Firstname',
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
      {
        id: 2,
        email: 'hello@world.com',
        status: 'pending',
        createdBy: 1,
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
  {
    id: 2,
    type: 'visual_design',
    billingAccountId: 1,
    name: 'test2',
    description: 'test project2',
    status: 'draft',
    details: {},
    createdBy: 1,
    updatedBy: 1,
    lastActivityAt: 2,
    lastActivityUserId: '1',
    members: [
      {
        id: 1,
        userId: 40051332,
        projectId: 2,
        role: 'copilot',
        firstName: 'copi',
        lastName: 'lott',
        handle: 'tolipoc',
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
        status: 'requested',
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
  {
    id: 3,
    type: 'visual_design',
    billingAccountId: 1,
    name: 'test3',
    description: 'test project3',
    status: 'reviewed',
    details: {},
    createdBy: 1,
    updatedBy: 1,
    lastActivityAt: 3,
    lastActivityUserId: '1',
    members: [{
      id: 5,
      userId: 40051334,
      projectId: 2,
      role: 'manager',
      firstName: 'first',
      lastName: 'last',
      handle: 'MANAGER_HANDLE',
      isPrimary: true,
      createdBy: 1,
      updatedBy: 1,
    },
    ],
  },
];

describe('LIST Project', () => {
  let project1;
  let project2;
  let project3;
  before(function inner(done) {
    this.timeout(10000);
    testUtil.clearDb()
      .then(() => testUtil.clearES())
      .then(() => {
        const p1 = models.Project.create({
          type: 'generic',
          billingAccountId: 1,
          name: 'test1',
          description: 'test project1',
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
            userId: 40051332,
            projectId: project1.id,
            role: 'copilot',
            isPrimary: true,
            createdBy: 1,
            updatedBy: 1,
          });
          const pa1 = models.ProjectAttachment.create({
            title: 'Spec',
            projectId: project1.id,
            description: 'specification',
            path: 'projects/1/spec.pdf',
            type: ATTACHMENT_TYPES.FILE,
            tags: ['tag1'],
            contentType: 'application/pdf',
            createdBy: 1,
            updatedBy: 1,
          });
          return Promise.all([pm1, pm2, pa1]);
        });

        const p2 = models.Project.create({
          type: 'visual_design',
          billingAccountId: 1,
          name: 'test2',
          description: 'test project2',
          status: 'draft',
          details: {},
          createdBy: 1,
          updatedBy: 1,
          lastActivityAt: 2,
          lastActivityUserId: '1',
        }).then((p) => {
          project2 = p;
          return models.ProjectMember.create({
            userId: 40051332,
            projectId: project2.id,
            role: 'copilot',
            firstName: 'copi',
            lastName: 'lott',
            handle: 'tolipoc',
            isPrimary: true,
            createdBy: 1,
            updatedBy: 1,
          });
        });
        const p3 = models.Project.create({
          type: 'visual_design',
          billingAccountId: 1,
          name: 'test3',
          description: 'test project3',
          status: 'reviewed',
          details: {},
          createdBy: 1,
          updatedBy: 1,
          lastActivityAt: 3,
          lastActivityUserId: '1',
        }).then((p) => {
          project3 = p;
          // create members
          return models.ProjectMember.create({
            userId: 40051334,
            projectId: project3.id,
            role: 'manager',
            firstName: 'first',
            lastName: 'last',
            handle: 'manager_handle',
            isPrimary: true,
            createdBy: 1,
            updatedBy: 1,
          });
        });

        return Promise.all([p1, p2, p3]).then(() => {
          data[0].id = project1.id;
          data[1].id = project2.id;
          data[2].id = project3.id;
          const esp1 = eClient.index({
            index: ES_PROJECT_INDEX,
            type: ES_PROJECT_TYPE,
            id: project1.id,
            body: data[0],
            refresh: 'wait_for',
          });

          const esp2 = eClient.index({
            index: ES_PROJECT_INDEX,
            type: ES_PROJECT_TYPE,
            id: project2.id,
            body: data[1],
            refresh: 'wait_for',
          });

          const esp3 = eClient.index({
            index: ES_PROJECT_INDEX,
            type: ES_PROJECT_TYPE,
            id: project3.id,
            body: data[2],
            refresh: 'wait_for',
          });
          return Promise.all([esp1, esp2, esp3]);
        }).then(() => {
          testUtil.wait(done);
          // done();
        });
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('GET All /projects/', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .get('/v5/projects/')
        .expect(403, done);
    });

    it('should return 200 and no projects if user does not have access', (done) => {
      request(server)
        // .get(`/v5/projects/?id=in%28${project2.id}%29`)
        .get(`/v5/projects/?id=${project2.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            res.body.should.have.lengthOf(0);
            done();
          }
        });
    });

    it('should return the project when registerd member attempts to access the project', (done) => {
      request(server)
        .get('/v5/projects/?status=draft')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.should.have.lengthOf(1);
            // since project 2 is indexed with id 2
            resJson[0].id.should.equal(project2.id);
            done();
          }
        });
    });

    it('should return the project using M2M token with "read:projects" scope', (done) => {
      request(server)
        .get('/v5/projects/?status=draft')
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
            resJson.should.have.lengthOf(1);
            // since project 2 is indexed with id 2
            resJson[0].id.should.equal(project2.id);
            done();
          }
        });
    });

    it('should return the project with empty invites using M2M token without "read:project-invites" scope', (done) => {
      request(server)
        .get('/v5/projects')
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
            resJson.should.have.lengthOf(3);
            resJson.forEach((project) => {
              project.invites.should.be.empty;
            });
            done();
          }
        });
    });

    it('should not include the project members using M2M token without "read:project-members" scope', (done) => {
      request(server)
        .get('/v5/projects')
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
            resJson.should.have.lengthOf(3);
            resJson.forEach((project) => {
              should.not.exist(project.members);
            });
            done();
          }
        });
    });

    it('should return the project when project that is in reviewed state in which the copilot is its member or has been invited', (done) => {
      request(server)
        .get('/v5/projects')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.should.have.lengthOf(2);
            done();
          }
        });
    });

    it('should return the project for administrator ', (done) => {
      request(server)
        .get('/v5/projects/?fields=id,members.id')
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
            resJson.should.have.lengthOf(3);
            done();
          }
        });
    });

    it('should return the project for administrator with field description, billingAccountId and attachments',
      (done) => {
        request(server)
          .get('/v5/projects/?fields=description,billingAccountId,attachments&sort=id asc')
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
              resJson.should.have.lengthOf(3);
              const project = _.find(resJson, { id: project1.id });
              project.should.have.property('attachments');
              project.attachments.should.have.lengthOf(2);
              project.attachments[0].should.have.property('id');
              project.attachments[0].should.have.property('projectId');
              project.attachments[0].should.have.property('title');
              project.attachments[0].should.have.property('description');
              project.attachments[0].should.have.property('path');
              project.attachments[0].should.have.property('type');
              project.attachments[0].should.have.property('tags');
              project.attachments[0].should.have.property('contentType');
              project.attachments[0].should.have.property('createdBy');
              project.attachments[0].should.have.property('updatedBy');

              project.attachments[1].should.have.property('id');
              project.attachments[1].should.have.property('projectId');
              project.attachments[1].should.have.property('title');
              project.attachments[1].should.have.property('description');
              project.attachments[1].should.have.property('path');
              project.attachments[1].should.have.property('type');
              project.attachments[1].should.have.property('tags');
              project.attachments[1].should.have.property('createdBy');
              project.attachments[1].should.have.property('updatedBy');

              project.should.have.property('description');
              project.should.have.property('billingAccountId');
              done();
            }
          });
      });

    it('should return the project for administrator with field description and billingAccountId', (done) => {
      request(server)
        .get('/v5/projects/?fields=description,billingAccountId,attachments&sort=id asc')
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
            resJson.should.have.lengthOf(3);
            const project = _.find(resJson, p => p.id === project1.id);
            project.should.have.property('attachments');
            project.should.have.property('description');
            project.should.have.property('billingAccountId');
            done();
          }
        });
    });

    it('should return the project for administrator with all field', (done) => {
      request(server)
        .get('/v5/projects/?sort=id asc')
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
            resJson.should.have.lengthOf(3);
            const project = _.find(resJson, p => p.id === project1.id);
            project.should.have.property('id');
            project.should.have.property('type');
            project.should.have.property('billingAccountId');
            project.should.have.property('description');
            project.should.have.property('status');
            project.should.have.property('details');
            project.should.have.property('createdBy');
            project.should.have.property('updatedBy');
            project.should.have.property('members');
            project.should.have.property('attachments');
            done();
          }
        });
    });

    it('should return all projects that match when filtering by name', (done) => {
      request(server)
        .get('/v5/projects/?keyword=test')
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
            resJson.should.have.lengthOf(3);
            done();
          }
        });
    });

    it('should return the project when filtering by keyword, which matches the name', (done) => {
      request(server)
        .get('/v5/projects/?keyword=1')
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
            resJson.should.have.lengthOf(1);
            resJson[0].name.should.equal('test1');
            done();
          }
        });
    });

    it('should return the project when filtering by keyword, which matches the description', (done) => {
      request(server)
        .get('/v5/projects/?keyword=project')
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
            resJson.should.have.lengthOf(3);
            done();
          }
        });
    });

    it('should return the project when filtering by keyword, which matches the member handle', (done) => {
      request(server)
        .get('/v5/projects/?keyword=tourist')
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
            resJson.should.have.lengthOf(1);
            resJson[0].name.should.equal('test1');
            done();
          }
        });
    });

    it('should return project that match when filtering by id (exact)', (done) => {
      request(server)
        .get(`/v5/projects/?id=${project1.id}`)
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
            resJson.should.have.lengthOf(1);
            resJson[0].id.should.equal(project1.id);
            resJson[0].name.should.equal('test1');
            done();
          }
        });
    });

    it('should return project that match when filtering by name', (done) => {
      request(server)
        .get('/v5/projects/?name=test1')
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
            resJson.should.have.lengthOf(1);
            resJson[0].name.should.equal('test1');
            done();
          }
        });
    });

    it('should return project that match when filtering by name\'s substring', (done) => {
      request(server)
        .get('/v5/projects/?name=*st1')
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
            resJson.should.have.lengthOf(1);
            resJson[0].name.should.equal('test1');
            done();
          }
        });
    });

    it('should return all projects that match when filtering by details code', (done) => {
      request(server)
        .get('/v5/projects/?code=code1')
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
            resJson.should.have.lengthOf(1);
            resJson[0].name.should.equal('test1');
            resJson[0].details.utm.code.should.equal('code1');
            done();
          }
        });
    });

    it('should return all projects that match when filtering by details code\'s substring', (done) => {
      request(server)
        .get('/v5/projects/?code=*de1')
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
            resJson.should.have.lengthOf(1);
            resJson[0].name.should.equal('test1');
            resJson[0].details.utm.code.should.equal('code1');
            done();
          }
        });
    });

    it('should return all projects that match when filtering by customer', (done) => {
      request(server)
        .get('/v5/projects/?customer=first*')
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
            resJson.should.have.lengthOf(1);
            resJson[0].name.should.equal('test1');
            resJson[0].members.should.have.deep.property('[0].role', 'customer');
            resJson[0].members[0].userId.should.equal(40051331);
            done();
          }
        });
    });

    it('should return all projects that match when filtering by manager', (done) => {
      request(server)
        .get('/v5/projects/?manager=*ast')
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
            resJson.should.have.lengthOf(1);
            resJson[0].name.should.equal('test3');
            resJson[0].members.should.have.deep.property('[0].role', 'manager');
            resJson[0].members[0].userId.should.equal(40051334);
            done();
          }
        });
    });

    it('should return all projects that match when filtering by customer handle (lowercase)', (done) => {
      request(server)
        .get('/v5/projects/?customer=*tourist*')
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
            resJson.should.have.lengthOf(1);
            resJson[0].name.should.equal('test1');
            resJson[0].members.should.have.deep.property('[0].role', 'customer');
            resJson[0].members[0].userId.should.equal(40051331);
            done();
          }
        });
    });

    it('should return all projects that match when filtering by customer handle (uppercase)', (done) => {
      request(server)
        .get('/v5/projects/?customer=*TOUR*')
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
            resJson.should.have.lengthOf(1);
            resJson[0].name.should.equal('test1');
            resJson[0].members.should.have.deep.property('[0].role', 'customer');
            resJson[0].members[0].userId.should.equal(40051331);
            done();
          }
        });
    });

    it('should return all projects that match when filtering by customer handle (mixed case)', (done) => {
      request(server)
        .get('/v5/projects/?customer=*tOURiS*')
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
            resJson.should.have.lengthOf(1);
            resJson[0].name.should.equal('test1');
            resJson[0].members.should.have.deep.property('[0].role', 'customer');
            resJson[0].members[0].userId.should.equal(40051331);
            done();
          }
        });
    });

    it('should return all projects that match when filtering by manager handle (lowercase)', (done) => {
      request(server)
        .get('/v5/projects/?manager=*_handle')
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
            resJson.should.have.lengthOf(1);
            resJson[0].name.should.equal('test3');
            resJson[0].members.should.have.deep.property('[0].role', 'manager');
            resJson[0].members[0].userId.should.equal(40051334);
            done();
          }
        });
    });

    it('should return all projects that match when filtering by manager handle (uppercase)', (done) => {
      request(server)
        .get('/v5/projects/?manager=MANAG*')
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
            resJson.should.have.lengthOf(1);
            resJson[0].name.should.equal('test3');
            resJson[0].members.should.have.deep.property('[0].role', 'manager');
            resJson[0].members[0].userId.should.equal(40051334);
            done();
          }
        });
    });

    it('should return all projects that match when filtering by manager handle (mixed case)', (done) => {
      request(server)
        .get('/v5/projects/?manager=*_HAndLe')
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
            resJson.should.have.lengthOf(1);
            resJson[0].name.should.equal('test3');
            resJson[0].members.should.have.deep.property('[0].role', 'manager');
            resJson[0].members[0].userId.should.equal(40051334);
            done();
          }
        });
    });

    it('should return all projects that match when filtering by manager, searching on any non-customer role', (done) => {
      request(server)
        .get('/v5/projects/?manager=copi*')
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
            resJson.should.have.lengthOf(1);
            resJson[0].name.should.equal('test2');
            resJson[0].members.should.have.deep.property('[0].role', 'copilot');
            resJson[0].members[0].userId.should.equal(40051332);
            done();
          }
        });
    });

    it('should return list of projects ordered ascending by lastActivityAt when sort column is "lastActivityAt"', (done) => {
      request(server)
        .get('/v5/projects/?sort=lastActivityAt')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.should.have.lengthOf(3);
            resJson[0].name.should.equal('test1');
            resJson[1].name.should.equal('test2');
            resJson[2].name.should.equal('test3');
            done();
          }
        });
    });

    it('should return list of projects ordered descending by lastActivityAt when sort column is "lastActivityAt desc"', (done) => {
      request(server)
        .get('/v5/projects/?sort=lastActivityAt desc')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.should.have.lengthOf(3);
            resJson[0].name.should.equal('test3');
            resJson[1].name.should.equal('test2');
            resJson[2].name.should.equal('test1');
            done();
          }
        });
    });

    it('should return list of projects ordered ascending by lastActivityAt when sort column is "lastActivityAt asc"', (done) => {
      request(server)
        .get('/v5/projects/?sort=lastActivityAt asc')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.should.have.lengthOf(3);
            resJson[0].name.should.equal('test1');
            resJson[1].name.should.equal('test2');
            resJson[2].name.should.equal('test3');
            done();
          }
        });
    });

    describe('GET All /projects/ for Connect Admin, ', () => {
      it('should return the project ', (done) => {
        request(server)
          .get('/v5/projects/?fields=id,members.id')
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
              resJson.should.have.lengthOf(3);
              done();
            }
          });
      });

      it('should return all projects, that match when filtering by name', (done) => {
        request(server)
          .get('/v5/projects/?keyword=test')
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
              resJson.should.have.lengthOf(3);
              done();
            }
          });
      });

      it('should return the project, when filtering by keyword, which matches the name', (done) => {
        request(server)
          .get('/v5/projects/?keyword=1')
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
              resJson.should.have.lengthOf(1);
              resJson[0].name.should.equal('test1');
              done();
            }
          });
      });

      it('should return the project, when filtering by keyword, which matches the description', (done) => {
        request(server)
          .get('/v5/projects/?keyword=project')
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
              resJson.should.have.lengthOf(3);
              done();
            }
          });
      });

      it('should return the project, when filtering by keyword, which matches the member handle', (done) => {
        request(server)
          .get('/v5/projects/?keyword=tourist')
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
              resJson.should.have.lengthOf(1);
              resJson[0].name.should.equal('test1');
              done();
            }
          });
      });
    });
    describe('GET All /projects/ for non-admins users who are invited', () => {
      it('should return projects where a non-admin user has an invitation in pending status', (done) => {
        request(server)
          .get(`/v5/projects/?id=${project1.id}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.member2}`,
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err, res) => {
            if (err) {
              done(err);
            } else {
              const resJson = res.body;
              should.exist(resJson);
              resJson.should.have.lengthOf(1);
              resJson[0].name.should.equal('test1');
              resJson[0].invites.should.have.lengthOf(1);
              resJson[0].invites[0].should.have.property('email');
              resJson[0].invites[0].userId.should.equal(40051335);
              done();
            }
          });
      });
      it('should not return projects where a non-admin user has an invitation in requested status', (done) => {
        request(server)
          .get(`/v5/projects/?id=${project2.id}`)
          .set({
            Authorization: `Bearer ${testUtil.jwts.member2}`,
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err, res) => {
            if (err) {
              done(err);
            } else {
              const resJson = res.body;
              should.exist(resJson);
              resJson.should.have.lengthOf(0);
              done();
            }
          });
      });
    });

    describe('URL Query fields', () => {
      it('should not return "email" for project members when "fields" query param is not defined (to non-admin users)', (done) => {
        request(server)
          .get('/v5/projects/')
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
              resJson.should.have.lengthOf(1);
              resJson[0].members[0].should.not.have.property('email');
              done();
            }
          });
      });


      it('should not return "email" for project members even if it\'s listed in "fields" query param (to non-admin users)', (done) => {
        request(server)
          .get('/v5/projects/?fields=members.email,members.id')
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
              resJson.should.have.lengthOf(1);
              resJson[0].members[0].should.not.have.property('email');
              done();
            }
          });
      });


      it('should not return "cancelReason" if it is not listed in "fields" query param ', (done) => {
        request(server)
          .get('/v5/projects/?fields=description')
          .set({
            Authorization: `Bearer ${testUtil.jwts.member2}`,
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err, res) => {
            if (err) {
              done(err);
            } else {
              const resJson = res.body;
              should.exist(resJson);
              resJson.should.have.lengthOf(1);
              resJson[0].should.have.property('description');
              resJson[0].should.not.have.property('cancelReason');
              resJson[0].description.should.be.eq('test project1 abc/d');
              done();
            }
          });
      });

      it('should not return "email" for project members when it is not listed in "fields" query param (to admin users)', (done) => {
        request(server)
          .get('/v5/projects/?fields=description,members.id')
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
              const project = _.find(resJson, p => p.id === project1.id);
              const member = _.find(project.members, m => m.id === 1);
              member.should.not.have.property('email');
              done();
            }
          });
      });


      it('should return "email" for project members if it\'s listed in "fields" query param (to admin users)', (done) => {
        request(server)
          .get('/v5/projects/?fields=description,members.id,members.email')
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
              const project = _.find(resJson, p => p.id === project1.id);
              const member = _.find(project.members, m => m.id === 1);
              member.should.have.property('email');
              member.email.should.be.eq('test@test.com');
              done();
            }
          });
      });

      it('should only return "id" field, when it\'s the only fields listed in "fields" query param', (done) => {
        request(server)
          .get('/v5/projects/?fields=id')
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
              resJson[0].should.have.property('id');
              _.keys(resJson[0]).length.should.be.eq(1);
              done();
            }
          });
      });

      it('should only return "invites.userId" field, when it\'s the only field listed in "fields" query param', (done) => {
        request(server)
          .get('/v5/projects/?fields=invites.userId')
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
              const project = _.find(resJson, p => p.id === project1.id);
              project.invites[0].should.have.property('userId');
              _.keys(project.invites[0]).length.should.be.eq(1);
              done();
            }
          });
      });

      it('should only return "members.role" field, when it\'s the only field listed in "fields" query param', (done) => {
        request(server)
          .get('/v5/projects/?fields=members.role')
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
              const project = _.find(resJson, p => p.id === project1.id);
              project.members[0].should.have.property('role');
              _.keys(project.members[0]).length.should.be.eq(1);
              done();
            }
          });
      });

      it('should only return "attachments.title" field, when it\'s the only field listed in "fields" query param', (done) => {
        request(server)
          .get('/v5/projects/?fields=attachments.title')
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
              const project = _.find(resJson, p => p.id === project1.id);
              project.attachments[0].should.have.property('title');
              _.keys(project.attachments[0]).length.should.be.eq(1);
              done();
            }
          });
      });

      it('should only return "phases.name" field, when it\'s the only field listed in "fields" query param', (done) => {
        request(server)
          .get('/v5/projects/?fields=phases.name')
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
              const project = _.find(resJson, p => p.id === project1.id);
              project.phases[0].should.have.property('name');
              _.keys(project.phases[0]).length.should.be.eq(1);
              done();
            }
          });
      });

      it('should only return "phases.products.name" field, when it\'s the only field listed in "fields" query param', (done) => {
        request(server)
          .get('/v5/projects/?fields=phases.products.name')
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
              const project = _.find(resJson, p => p.id === project1.id);
              project.phases[0].products[0].should.have.property('name');
              _.keys(project.phases[0].products[0]).length.should.be.eq(1);
              done();
            }
          });
      });

      it('should find a project by quoted keyword with a special symbol in the name', (done) => {
        request(server)
          .get('/v5/projects/?keyword="abc/d"')
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
              resJson.should.have.lengthOf(1);
              done();
            }
          });
      });

      it('should find a project by keyword with a special symbol in the name', (done) => {
        request(server)
          .get('/v5/projects/?keyword=abc/d')
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
              resJson.should.have.lengthOf(1);
              done();
            }
          });
      });
    });
  });
});
