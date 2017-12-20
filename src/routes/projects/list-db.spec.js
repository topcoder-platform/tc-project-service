/* eslint-disable no-unused-expressions */
import chai from 'chai';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const should = chai.should();

/**
 * Add full text index for projects.
 * @return {Promise}        returns the promise
 */
function addFullTextIndex() {
  if (models.sequelize.options.dialect !== 'postgres') {
    return null;
  }

  return models.sequelize
    .query('ALTER TABLE projects ADD COLUMN "projectFullText" text;')
    .then(() => models.sequelize
      .query('UPDATE projects SET "projectFullText" = lower(' +
        'name || \' \' || coalesce(description, \'\') || \' \' || coalesce(details#>>\'{utm, code}\', \'\'));'))
    .then(() => models.sequelize
      .query('CREATE EXTENSION IF NOT EXISTS pg_trgm;')).then(() => models.sequelize
      .query('CREATE INDEX project_text_search_idx ON projects USING GIN("projectFullText" gin_trgm_ops);'))
    .then(() => models.sequelize
      .query('CREATE OR REPLACE FUNCTION project_text_update_trigger() RETURNS trigger AS $$ ' +
        'begin ' +
        'new."projectFullText" := ' +
        'lower(new.name || \' \' || coalesce(new.description, \'\') || \' \' || ' +
        ' coalesce(new.details#>>\'{utm, code}\', \'\')); ' +
        'return new; ' +
        'end ' +
        '$$ LANGUAGE plpgsql;'))
    .then(() => models.sequelize
      .query('DROP TRIGGER IF EXISTS project_text_update ON projects;'))
      .then(() => models.sequelize
        .query('CREATE TRIGGER project_text_update BEFORE INSERT OR UPDATE ON projects' +
          ' FOR EACH ROW EXECUTE PROCEDURE project_text_update_trigger();'));
}

describe('LIST Project db', () => {
  let project1;
  let project2;
  before((done) => {
    testUtil.clearDb()
      .then(() => addFullTextIndex())
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
        });
        return Promise.all([p1, p2, p3])
          .then(() => done());
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('GET All /projects/', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .get('/v4/projects/db/')
        .expect(403, done);
    });

    it('should return 200 and no projects if user does not have access', (done) => {
      request(server)
        .get(`/v4/projects/db/?filter=id%3Din%28${project2.id}%29`)
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
        .get('/v4/projects/db/?filter=status%3Ddraft')
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
            resJson[0].id.should.equal(project2.id);
            done();
          }
        });
    });

    it('should return the project when project that is in reviewed state AND does not yet' +
      'have a co-pilot assigned', (done) => {
      request(server)
          .get('/v4/projects/db/')
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
        .get('/v4/projects/db/?fields=id%2Cmembers.id')
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
        .get('/v4/projects/db/?filter=keyword%3Dtest')
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
        .get('/v4/projects/db/?filter=keyword%3D1')
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
        .get('/v4/projects/db/?filter=keyword%3Dproject')
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

    it('should return the project when filtering by keyword, which matches the details', (done) => {
      request(server)
        .get('/v4/projects/db/?filter=keyword%3Dcode')
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

    describe('for connect admin ', () => {
      it('should return the project ', (done) => {
        request(server)
          .get('/v4/projects/db/?fields=id%2Cmembers.id')
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

      it('should return all projects that match when filtering by name', (done) => {
        request(server)
          .get('/v4/projects/db/?filter=keyword%3Dtest')
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

      it('should return the project when filtering by keyword, which matches the name', (done) => {
        request(server)
          .get('/v4/projects/db/?filter=keyword%3D1')
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

      it('should return the project when filtering by keyword, which matches the description', (done) => {
        request(server)
          .get('/v4/projects/db/?filter=keyword%3Dproject')
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

      it('should return the project when filtering by keyword, which matches the details', (done) => {
        request(server)
          .get('/v4/projects/db/?filter=keyword%3Dcode')
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
