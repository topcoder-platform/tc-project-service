/**
 * Tests for delete.js
 */
import request from 'supertest';
import chai from 'chai';
import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const expectAfterDelete = (id, err, next) => {
  if (err) throw err;
  setTimeout(() =>
    models.OrgConfig.findOne({
      where: {
        id,
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
            .get(`/v5/projects/metadata/orgConfig/${id}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .expect(404, next);
        }
      }), 500);
};

describe('DELETE organization config', () => {
  const id = 1;

  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => models.OrgConfig.create({
        id: 1,
        orgId: 'ORG1',
        configName: 'project_category_url',
        configValue: '/projects/1',
        createdBy: 1,
        updatedBy: 1,
      }).then(() => done()));
  });
  after((done) => {
    testUtil.clearDb(done);
  });

  describe('DELETE /orgConfig/{id}', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .delete(`/v5/projects/metadata/orgConfig/${id}`)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .delete(`/v5/projects/metadata/orgConfig/${id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .delete(`/v5/projects/metadata/orgConfig/${id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(403, done);
    });

    it('should return 403 for manager', (done) => {
      request(server)
        .delete(`/v5/projects/metadata/orgConfig/${id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(403, done);
    });

    it('should return 404 for non-existed config', (done) => {
      request(server)
        .delete('/v5/projects/metadata/orgConfig/not_existed')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 for deleted config', (done) => {
      models.OrgConfig.destroy({ where: { id } })
        .then(() => {
          request(server)
            .delete(`/v5/projects/metadata/orgConfig/${id}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .expect(404, done);
        });
    });

    it('should return 204, for admin, if config was successfully removed', (done) => {
      request(server)
        .delete(`/v5/projects/metadata/orgConfig/${id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(204)
        .end(err => expectAfterDelete(id, err, done));
    });

    it('should return 204, for connect admin, if config was successfully removed', (done) => {
      request(server)
        .delete(`/v5/projects/metadata/orgConfig/${id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(204)
        .end(err => expectAfterDelete(id, err, done));
    });
  });
});
