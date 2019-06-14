/* eslint-disable no-unused-expressions */
/* eslint-disable max-len */
import chai from 'chai';
import request from 'supertest';
import sleep from 'sleep';
import config from 'config';
import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';


const ES_PROJECT_INDEX = config.get('elasticsearchConfig.indexName');
const ES_PROJECT_TYPE = config.get('elasticsearchConfig.docType');

const should = chai.should();
// test data for 3 projects
const data = [
  {
    id: 1,
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
    members: [
      {
        id: 1,
        userId: 40051331,
        projectId: 1,
        role: 'customer',
        firstName: 'Firstname',
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
        isPrimary: true,
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
      handle: 'manager_handle',
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
            filePath: 'projects/1/spec.pdf',
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
          const esp1 = server.services.es.index({
            index: ES_PROJECT_INDEX,
            type: ES_PROJECT_TYPE,
            id: project1.id,
            body: data[0],
          });

          const esp2 = server.services.es.index({
            index: ES_PROJECT_INDEX,
            type: ES_PROJECT_TYPE,
            id: project2.id,
            body: data[1],
          });

          const esp3 = server.services.es.index({
            index: ES_PROJECT_INDEX,
            type: ES_PROJECT_TYPE,
            id: project3.id,
            body: data[2],
          });
          return Promise.all([esp1, esp2, esp3]);
        }).then(() => {
          // sleep for some time, let elasticsearch indices be settled
          sleep.sleep(5);
          done();
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
            resJson[0].id.should.equal(2);
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
              resJson[0].should.have.property('attachments');
              resJson[0].attachments.should.have.lengthOf(1);
              resJson[0].attachments[0].should.have.property('id');
              resJson[0].attachments[0].should.have.property('projectId');
              resJson[0].attachments[0].should.have.property('title');
              resJson[0].attachments[0].should.have.property('description');
              resJson[0].attachments[0].should.have.property('filePath');
              resJson[0].attachments[0].should.have.property('contentType');
              resJson[0].attachments[0].should.have.property('createdBy');
              resJson[0].attachments[0].should.have.property('updatedBy');
              resJson[0].should.have.property('description');
              resJson[0].should.have.property('billingAccountId');
              done();
            }
          });
      });

    it('should return the project for administrator with field description and billingAccountId', (done) => {
      request(server)
        .get('/v5/projects/?fields=description,billingAccountId&sort=id asc')
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
            resJson[0].should.have.property('attachments');
            resJson[0].should.have.property('description');
            resJson[0].should.have.property('billingAccountId');
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
            resJson[0].should.have.property('id');
            resJson[0].should.have.property('type');
            resJson[0].should.have.property('billingAccountId');
            resJson[0].should.have.property('description');
            resJson[0].should.have.property('status');
            resJson[0].should.have.property('details');
            resJson[0].should.have.property('createdBy');
            resJson[0].should.have.property('updatedBy');
            resJson[0].should.have.property('members');
            resJson[0].should.have.property('attachments');
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
        .get('/v5/projects/?id=1')
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
            resJson[0].id.should.equal(1);
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
  });
});
