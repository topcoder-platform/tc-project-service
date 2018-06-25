/**
 * Tests for delete.js
 */
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';


describe('DELETE project template', () => {
  let templateId;

  beforeEach(() => testUtil.clearDb()
    .then(() => models.ProjectTemplate.create({
      name: 'template 1',
      key: 'key 1',
      category: 'category 1',
      icon: 'http://example.com/icon1.ico',
      question: 'question 1',
      info: 'info 1',
      aliases: ['key-1', 'key_1'],
      scope: {
        scope1: {
          subScope1A: 1,
          subScope1B: 2,
        },
        scope2: [1, 2, 3],
      },
      phases: {
        phase1: {
          name: 'phase 1',
          details: {
            anyDetails: 'any details 1',
          },
          others: ['others 11', 'others 12'],
        },
        phase2: {
          name: 'phase 2',
          details: {
            anyDetails: 'any details 2',
          },
          others: ['others 21', 'others 22'],
        },
      },
      createdBy: 1,
      updatedBy: 1,
    })).then((template) => {
      templateId = template.id;
      return Promise.resolve();
    }),
  );
  after(testUtil.clearDb);

  describe('DELETE /projectTemplates/{templateId}', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .delete(`/v4/projectTemplates/${templateId}`)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .delete(`/v4/projectTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .delete(`/v4/projectTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(403, done);
    });

    it('should return 404 for non-existed template', (done) => {
      request(server)
        .delete('/v4/projectTemplates/1234')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 for deleted template', (done) => {
      models.ProjectTemplate.destroy({ where: { id: templateId } })
        .then(() => {
          request(server)
            .delete(`/v4/projectTemplates/${templateId}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .expect(404, done);
        });
    });

    it('should return 204, for admin, if template was successfully removed', (done) => {
      request(server)
        .delete(`/v4/projectTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(204)
        .end(done);
    });

    it('should return 204, for connect admin, if template was successfully removed', (done) => {
      request(server)
        .delete(`/v4/projectTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(204)
        .end(done);
    });

    it('should return 204, for connect manager, if template was successfully removed', (done) => {
      request(server)
        .delete(`/v4/projectTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(204)
        .end(done);
    });
  });
});
