/* eslint-disable no-unused-expressions */
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
    members: [
      {
        id: 1,
        userId: 40051331,
        projectId: 1,
        role: 'customer',
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
    name: 'test2',
    description: 'test project3',
    status: 'reviewed',
    details: {},
    createdBy: 1,
    updatedBy: 1,
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
          name: 'test2',
          description: 'test project3',
          status: 'reviewed',
          details: {},
          createdBy: 1,
          updatedBy: 1,
        }).then((p) => {
          project3 = p;
          return Promise.resolve();
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
        .get('/v4/projects/')
        .expect(403, done);
    });

    it('should return 200 and no projects if user does not have access', (done) => {
      request(server)
        .get(`/v4/projects/?filter=id%3Din%28${project2.id}%29`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            res.body.result.content.should.have.lengthOf(0);
            done();
          }
        });
    });

    it('should return the project when registerd member attempts to access the project', (done) => {
      request(server)
        .get('/v4/projects/?filter=status%3Ddraft')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.result.content;
            res.body.result.metadata.totalCount.should.equal(1);
            should.exist(resJson);
            resJson.should.have.lengthOf(1);
            // since project 2 is indexed with id 2
            resJson[0].id.should.equal(2);
            done();
          }
        });
    });

    it('should return the project when project that is in reviewed state AND does not yet ' +
      'have a co-pilot assigned', (done) => {
      request(server)
          .get('/v4/projects')
          .set({
            Authorization: `Bearer ${testUtil.jwts.copilot}`,
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err, res) => {
            if (err) {
              done(err);
            } else {
              const resJson = res.body.result.content;
              res.body.result.metadata.totalCount.should.equal(3);
              should.exist(resJson);
              resJson.should.have.lengthOf(3);
              done();
            }
          });
    });

    it('should return the project for administrator ', (done) => {
      request(server)
        .get('/v4/projects/?fields=id%2Cmembers.id')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.result.content;
            should.exist(resJson);
            resJson.should.have.lengthOf(3);
            done();
          }
        });
    });

    it('should return all projects that match when filtering by name', (done) => {
      request(server)
        .get('/v4/projects/?filter=keyword%3Dtest')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.result.content;
            should.exist(resJson);
            resJson.should.have.lengthOf(3);
            done();
          }
        });
    });

    it('should return the project when filtering by keyword, which matches the name', (done) => {
      request(server)
        .get('/v4/projects/?filter=keyword%3D1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.result.content;
            should.exist(resJson);
            resJson.should.have.lengthOf(1);
            resJson[0].name.should.equal('test1');
            done();
          }
        });
    });

    it('should return the project when filtering by keyword, which matches the description', (done) => {
      request(server)
        .get('/v4/projects/?filter=keyword%3Dproject')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.result.content;
            should.exist(resJson);
            resJson.should.have.lengthOf(3);
            done();
          }
        });
    });

    it('should return the project when filtering by keyword, which matches the member handle', (done) => {
      request(server)
        .get('/v4/projects/?filter=keyword%3Dtourist')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.result.content;
            should.exist(resJson);
            resJson.should.have.lengthOf(1);
            resJson[0].name.should.equal('test1');
            done();
          }
        });
    });

    describe('GET All /projects/ for Connect Admin, ', () => {
      it('should return the project ', (done) => {
        request(server)
          .get('/v4/projects/?fields=id%2Cmembers.id')
          .set({
            Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err, res) => {
            if (err) {
              done(err);
            } else {
              const resJson = res.body.result.content;
              should.exist(resJson);
              resJson.should.have.lengthOf(3);
              done();
            }
          });
      });

      it('should return all projects, that match when filtering by name', (done) => {
        request(server)
          .get('/v4/projects/?filter=keyword%3Dtest')
          .set({
            Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err, res) => {
            if (err) {
              done(err);
            } else {
              const resJson = res.body.result.content;
              should.exist(resJson);
              resJson.should.have.lengthOf(3);
              done();
            }
          });
      });

      it('should return the project, when filtering by keyword, which matches the name', (done) => {
        request(server)
          .get('/v4/projects/?filter=keyword%3D1')
          .set({
            Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err, res) => {
            if (err) {
              done(err);
            } else {
              const resJson = res.body.result.content;
              should.exist(resJson);
              resJson.should.have.lengthOf(1);
              resJson[0].name.should.equal('test1');
              done();
            }
          });
      });

      it('should return the project, when filtering by keyword, which matches the description', (done) => {
        request(server)
          .get('/v4/projects/?filter=keyword%3Dproject')
          .set({
            Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err, res) => {
            if (err) {
              done(err);
            } else {
              const resJson = res.body.result.content;
              should.exist(resJson);
              resJson.should.have.lengthOf(3);
              done();
            }
          });
      });

      it('should return the project, when filtering by keyword, which matches the member handle', (done) => {
        request(server)
          .get('/v4/projects/?filter=keyword%3Dtourist')
          .set({
            Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
          })
          .expect('Content-Type', /json/)
          .expect(200)
          .end((err, res) => {
            if (err) {
              done(err);
            } else {
              const resJson = res.body.result.content;
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
