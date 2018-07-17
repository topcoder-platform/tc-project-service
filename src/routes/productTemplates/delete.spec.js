/**
 * Tests for delete.js
 */
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';


describe('DELETE product template', () => {
  let templateId;

  beforeEach(() => testUtil.clearDb()
    .then(() => models.ProductTemplate.create({
      name: 'name 1',
      productKey: 'productKey 1',
      icon: 'http://example.com/icon1.ico',
      brief: 'brief 1',
      details: 'details 1',
      aliases: ['product key 1', 'product_key_1'],
      template: {
        template1: {
          name: 'template 1',
          details: {
            anyDetails: 'any details 1',
          },
          others: ['others 11', 'others 12'],
        },
        template2: {
          name: 'template 2',
          details: {
            anyDetails: 'any details 2',
          },
          others: ['others 21', 'others 22'],
        },
      },
      createdBy: 1,
      updatedBy: 2,
    })).then((template) => {
      templateId = template.id;
      return Promise.resolve();
    }),
  );
  after(testUtil.clearDb);

  describe('DELETE /productTemplates/{templateId}', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .delete(`/v4/productTemplates/${templateId}`)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .delete(`/v4/productTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .delete(`/v4/productTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(403, done);
    });

    it('should return 403 for connect manager', (done) => {
      request(server)
        .delete(`/v4/productTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(403, done);
    });

    it('should return 404 for non-existed template', (done) => {
      request(server)
        .delete('/v4/productTemplates/1234')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 for deleted template', (done) => {
      models.ProductTemplate.destroy({ where: { id: templateId } })
        .then(() => {
          request(server)
            .delete(`/v4/productTemplates/${templateId}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .expect(404, done);
        });
    });

    it('should return 204, for admin, if template was successfully removed', (done) => {
      request(server)
        .delete(`/v4/productTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(204)
        .end(done);
    });

    it('should return 204, for connect admin, if template was successfully removed', (done) => {
      request(server)
        .delete(`/v4/productTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(204)
        .end(done);
    });
  });
});
