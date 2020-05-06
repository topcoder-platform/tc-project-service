/**
 * Tests for delete.js
 */
import request from 'supertest';
import chai from 'chai';
import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const expectAfterDelete = (id, projectId, err, next) => {
  if (err) throw err;
  setTimeout(() =>
    models.WorkStream.findOne({
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
            .get(`/v5/projects/${projectId}/workstreams/${id}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .expect(404, next);
        }
      }), 500);
};

describe('DELETE work stream', () => {
  let projectId;
  let id;

  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => {
        models.ProjectTemplate.create({
          name: 'template 2',
          key: 'key 2',
          category: 'category 2',
          icon: 'http://example.com/icon1.ico',
          question: 'question 2',
          info: 'info 2',
          aliases: ['key-2', 'key_2'],
          scope: {},
          phases: {},
          createdBy: 1,
          updatedBy: 2,
        })
          .then((template) => {
            // Create projects
            models.Project.create({
              type: 'generic',
              billingAccountId: 1,
              name: 'test1',
              description: 'test project1',
              status: 'draft',
              templateId: template.id,
              details: {},
              createdBy: 1,
              updatedBy: 1,
              lastActivityAt: 1,
              lastActivityUserId: '1',
            })
              .then((project) => {
                projectId = project.id;
                models.WorkStream.create({
                  name: 'Work Stream',
                  type: 'generic',
                  status: 'active',
                  projectId,
                  createdBy: 1,
                  updatedBy: 1,
                }).then((entity) => {
                  id = entity.id;
                  done();
                });
              });
          });
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('DELETE /projects/{projectId}/workstreams/{id}', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .delete(`/v5/projects/${projectId}/workstreams/${id}`)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .delete(`/v5/projects/${projectId}/workstreams/${id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .delete(`/v5/projects/${projectId}/workstreams/${id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(403, done);
    });

    it('should return 403 for manager', (done) => {
      request(server)
        .delete(`/v5/projects/${projectId}/workstreams/${id}`)
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
      models.WorkStream.destroy({ where: { id } })
        .then(() => {
          request(server)
            .delete(`/v5/projects/${projectId}/workstreams/${id}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .expect(404, done);
        });
    });

    it('should return 204, for admin, if type was successfully removed', (done) => {
      request(server)
        .delete(`/v5/projects/${projectId}/workstreams/${id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(204)
        .end(err => expectAfterDelete(id, projectId, err, done));
    });

    it('should return 204, for connect admin, if type was successfully removed', (done) => {
      request(server)
        .delete(`/v5/projects/${projectId}/workstreams/${id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect(204)
        .end(err => expectAfterDelete(id, projectId, err, done));
    });
  });
});
