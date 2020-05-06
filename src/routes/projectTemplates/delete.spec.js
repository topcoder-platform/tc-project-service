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
    models.ProjectTemplate.findOne({
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
            .get(`/v5/projects/metadata/projectTemplates/${id}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .expect(404, next);
        }
      }), 500);
};

describe('DELETE project template', () => {
  let templateId;

  beforeEach((done) => {
    testUtil.clearDb()
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
      }).then((template) => {
        templateId = template.id;
        done();
      }));
  });
  after((done) => {
    testUtil.clearDb(done);
  });

  describe('DELETE /projects/metadata/projectTemplates/{templateId}', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .delete(`/v5/projects/metadata/projectTemplates/${templateId}`)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .delete(`/v5/projects/metadata/projectTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .delete(`/v5/projects/metadata/projectTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(403, done);
    });

    it('should return 403 for connect manager', (done) => {
      request(server)
        .delete(`/v5/projects/metadata/projectTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(403, done);
    });

    it('should return 404 for non-existed template', (done) => {
      request(server)
        .delete('/v5/projects/metadata/projectTemplates/1234')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 404 for deleted template', (done) => {
      models.ProjectTemplate.destroy({ where: { id: templateId } })
        .then(() => {
          request(server)
            .delete(`/v5/projects/metadata/projectTemplates/${templateId}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .expect(404, done);
        });
    });

    it('should return 204, for admin, if template was successfully removed', (done) => {
      request(server)
        .delete(`/v5/projects/metadata/projectTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .end(err => expectAfterDelete(templateId, err, done));
    });

    it('should return 204, for connect admin, if template was successfully removed', (done) => {
      request(server)
        .delete(`/v5/projects/metadata/projectTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(204)
        .end(err => expectAfterDelete(templateId, err, done));
    });
  });
});
