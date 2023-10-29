/* eslint-disable no-unused-expressions */
import request from 'supertest';
import chai from 'chai';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const expectAfterDelete = (id, err, next) => {
  if (err) throw err;
  setTimeout(() =>
    models.Project.findOne({
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
            .get(`/v5/projects/${id}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .expect(404)
            .end(next);
        }
      }), 500);
};
describe('Project delete test', () => {
  let project1;
  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => testUtil.clearES())
      .then(() => {
        models.Project.create({
          type: 'generic',
          directProjectId: 1,
          billingAccountId: 1,
          name: 'test1',
          description: 'test project1',
          status: 'draft',
          details: {},
          createdBy: 1,
          updatedBy: 1,
          lastActivityAt: 1,
          lastActivityUserId: '1',
        }).then((p) => {
          project1 = p;
          // create members
          const promises = [
            // owner
            models.ProjectMember.create({
              userId: 40051331,
              projectId: project1.id,
              role: 'customer',
              isPrimary: true,
              createdBy: 1,
              updatedBy: 1,
            }),
            // manager
            models.ProjectMember.create({
              userId: 40051334,
              projectId: project1.id,
              role: 'manager',
              isPrimary: true,
              createdBy: 1,
              updatedBy: 1,
            }),
            // copilot
            models.ProjectMember.create({
              userId: 40051332,
              projectId: project1.id,
              role: 'copilot',
              isPrimary: true,
              createdBy: 1,
              updatedBy: 1,
            }),
            // team member
            models.ProjectMember.create({
              userId: 40051335,
              projectId: project1.id,
              role: 'customer',
              isPrimary: false,
              createdBy: 1,
              updatedBy: 1,
            }),
          ];
          Promise.all(promises)
            .then(() => {
              done();
            });
        });
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('DELETE /projects/{id}/', () => {
    it('should return 403 if copilot tries to delete the project', (done) => {
      request(server)
        .delete(`/v5/projects/${project1.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(403)
        .end(done);
    });

    it('should return 204 if project was successfully removed', (done) => {
      request(server)
        .delete(`/v5/projects/${project1.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(204)
        .end((err) => {
          expectAfterDelete(project1.id, err, done);
        });
    });

    it('should return 204, for connect admin, if project was successfully removed', (done) => {
      request(server)
        .delete(`/v5/projects/${project1.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(204)
        .end((err) => {
          expectAfterDelete(project1.id, err, done);
        });
    });

    it('should return 204, for connect admin, if project was successfully removed', (done) => {
      request(server)
        .delete(`/v5/projects/${project1.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(204)
        .end((err) => {
          expectAfterDelete(project1.id, err, done);
        });
    });

    it('should remove project successfully using M2M token with "write:projects" scope', (done) => {
      request(server)
        .delete(`/v5/projects/${project1.id}`)
        .set({
          Authorization: `Bearer ${testUtil.m2m['write:projects']}`,
        })
        .expect(204)
        .end((err) => {
          expectAfterDelete(project1.id, err, done);
        });
    });
  });
});
