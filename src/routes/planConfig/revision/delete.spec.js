/**
 * Tests for delete.js
 */
import request from 'supertest';
import chai from 'chai';
import models from '../../../models';
import server from '../../../app';
import testUtil from '../../../tests/util';

const expectAfterDelete = (err, next) => {
  if (err) throw err;
  setTimeout(() =>
    models.PlanConfig.findOne({
      where: {
        key: 'dev',
        version: 1,
        revision: 1,
      },
      paranoid: false,
    })
      .then((res) => {
        if (!res) {
          throw new Error('Should found the entity');
        } else {
          chai.assert.isNotNull(res.deletedAt);
          chai.assert.isNotNull(res.deletedBy);

          request(server)
            .get('/v5/projects/metadata/planConfig/dev/versions/1/revisions/1')
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .expect(404, next);
        }
      }), 500);
};


describe('DELETE planConfig revision', () => {
  const planConfigs = [
    {
      key: 'dev',
      config: {
        test: 'test1',
      },
      version: 1,
      revision: 1,
      createdBy: 1,
      updatedBy: 1,
    },
    {
      key: 'dev',
      config: {
        test: 'test2',
      },
      version: 1,
      revision: 2,
      createdBy: 1,
      updatedBy: 1,
    },
  ];

  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => models.PlanConfig.create(planConfigs[0]))
      .then(() => models.PlanConfig.create(planConfigs[1]).then(() => done()));
  });
  after((done) => {
    testUtil.clearDb(done);
  });


  describe('DELETE /projects/metadata/planConfig/{key}/versions/{version}/revisions/{revision}', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .delete('/v5/projects/metadata/planConfig/dev/versions/1/revisions/1')
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .delete('/v5/projects/metadata/planConfig/dev/versions/1/revisions/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .delete('/v5/projects/metadata/planConfig/dev/versions/1/revisions/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(403, done);
    });

    it('should return 403 for manager', (done) => {
      request(server)
        .delete('/v5/projects/metadata/planConfig/dev/versions/1/revisions/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(403, done);
    });

    it('should return 404 for non-existed key', (done) => {
      request(server)
        .delete('/v5/projects/metadata/planConfig/no-existed-key/versions/1/revisions/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 for non-existed version', (done) => {
      request(server)
        .delete('/v5/projects/metadata/planConfig/dev/versions/100/revisions/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });


    it('should return 404 for non-existed revision', (done) => {
      request(server)
        .delete('/v5/projects/metadata/planConfig/dev/versions/1/revisions/100')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 204, for admin', (done) => {
      request(server)
        .delete('/v5/projects/metadata/planConfig/dev/versions/1/revisions/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(204)
        .end(err => expectAfterDelete(err, done));
    });

    it('should return 204, for connect admin', (done) => {
      request(server)
        .delete('/v5/projects/metadata/planConfig/dev/versions/1/revisions/1')
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(204)
        .end(err => expectAfterDelete(err, done));
    });
  });
});
