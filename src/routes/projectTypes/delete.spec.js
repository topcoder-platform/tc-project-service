/**
 * Tests for delete.js
 */
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';


describe('DELETE project type', () => {
  const key = 'key1';

  beforeEach(() => testUtil.clearDb()
    .then(() => models.ProjectType.create({
      key: 'key1',
      displayName: 'displayName 1',
      createdBy: 1,
      updatedBy: 1,
    })).then(() => Promise.resolve()),
  );
  after(testUtil.clearDb);

  describe('DELETE /projectTypes/{key}', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .delete(`/v4/projectTypes/${key}`)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .delete(`/v4/projectTypes/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .delete(`/v4/projectTypes/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(403, done);
    });

    it('should return 403 for manager', (done) => {
      request(server)
        .delete(`/v4/projectTypes/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(403, done);
    });

    it('should return 404 for non-existed type', (done) => {
      request(server)
        .delete('/v4/projectTypes/not_existed')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 for deleted type', (done) => {
      models.ProjectType.destroy({ where: { key } })
        .then(() => {
          request(server)
            .delete(`/v4/projectTypes/${key}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .expect(404, done);
        });
    });

    it('should return 204, for admin, if type was successfully removed', (done) => {
      request(server)
        .delete(`/v4/projectTypes/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(204)
        .end(done);
    });

    it('should return 204, for connect admin, if type was successfully removed', (done) => {
      request(server)
        .delete(`/v4/projectTypes/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(204)
        .end(done);
    });
  });
});
