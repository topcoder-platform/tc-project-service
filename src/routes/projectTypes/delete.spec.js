/**
 * Tests for delete.js
 */
import request from 'supertest';
import chai from 'chai';
import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const expectAfterDelete = (key, err, next) => {
  if (err) throw err;
  setTimeout(() =>
    models.ProjectType.findOne({
      where: {
        key,
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
            .get(`/v5/projects/metadata/projectTypes/${key}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .expect(404, next);
        }
      }), 500);
};

describe('DELETE project type', () => {
  const key = 'key1';

  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => models.ProjectType.create({
        key: 'key1',
        displayName: 'displayName 1',
        icon: 'http://example.com/icon1.ico',
        question: 'question 1',
        info: 'info 1',
        aliases: ['key-1', 'key_1'],
        metadata: { 'slack-notification-mappings': { color: '#96d957', label: 'Full App' } },
        createdBy: 1,
        updatedBy: 1,
      }).then(() => done()));
  });
  after((done) => {
    testUtil.clearDb(done);
  });

  describe('DELETE /projects/metadata/projectTypes/{key}', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .delete(`/v5/projects/metadata/projectTypes/${key}`)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .delete(`/v5/projects/metadata/projectTypes/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .delete(`/v5/projects/metadata/projectTypes/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(403, done);
    });

    it('should return 403 for manager', (done) => {
      request(server)
        .delete(`/v5/projects/metadata/projectTypes/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(403, done);
    });

    it('should return 404 for non-existed type', (done) => {
      request(server)
        .delete('/v5/projects/metadata/projectTypes/not_existed')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 for deleted type', (done) => {
      models.ProjectType.destroy({ where: { key } })
        .then(() => {
          request(server)
            .delete(`/v5/projects/metadata/projectTypes/${key}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .expect(404, done);
        });
    });

    it('should return 204, for admin, if type was successfully removed', (done) => {
      request(server)
        .delete(`/v5/projects/metadata/projectTypes/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(204)
        .end(err => expectAfterDelete(key, err, done));
    });

    it('should return 204, for connect admin, if type was successfully removed', (done) => {
      request(server)
        .delete(`/v5/projects/metadata/projectTypes/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(204)
        .end(err => expectAfterDelete(key, err, done));
    });
  });
});
