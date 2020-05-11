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
    models.ProductCategory.findOne({
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
            .get(`/v5/projects/metadata/productCategories/${key}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .expect(404, next);
        }
      }), 500);
};

describe('DELETE product category', () => {
  const key = 'key1';

  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => models.ProductCategory.create({
        key: 'key1',
        displayName: 'displayName 1',
        icon: 'http://example.com/icon1.ico',
        question: 'question 1',
        info: 'info 1',
        aliases: ['key-1', 'key_1'],
        createdBy: 1,
        updatedBy: 1,
      }).then(() => done()));
  });
  after((done) => {
    testUtil.clearDb(done);
  });

  describe('DELETE /projects/metadata/productCategories/{key}', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .delete(`/v5/projects/metadata/productCategories/${key}`)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .delete(`/v5/projects/metadata/productCategories/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .delete(`/v5/projects/metadata/productCategories/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(403, done);
    });

    it('should return 403 for manager', (done) => {
      request(server)
        .delete(`/v5/projects/metadata/productCategories/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(403, done);
    });

    it('should return 404 for non-existed product category', (done) => {
      request(server)
        .delete('/v5/projects/metadata/productCategories/not_existed')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 for deleted product category', (done) => {
      models.ProductCategory.destroy({ where: { key } })
        .then(() => {
          request(server)
            .delete(`/v5/projects/metadata/productCategories/${key}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .expect(404, done);
        });
    });

    it('should return 204, for admin, if the product category was successfully removed', (done) => {
      request(server)
        .delete(`/v5/projects/metadata/productCategories/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(204)
        .end(err => expectAfterDelete(key, err, done));
    });

    it('should return 204, for connect admin, if the product category was successfully removed', (done) => {
      request(server)
        .delete(`/v5/projects/metadata/productCategories/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(204)
        .end(err => expectAfterDelete(key, err, done));
    });
  });
});
