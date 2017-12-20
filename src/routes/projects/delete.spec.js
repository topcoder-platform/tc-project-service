/* eslint-disable no-unused-expressions */
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';


describe('Project delete test', () => {
  let project1;
  beforeEach((done) => {
    testUtil.clearDb()
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
        .delete(`/v4/projects/${project1.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(403, done);
    });

    it('should return 204 if project was successfully removed', (done) => {
      request(server)
        .delete(`/v4/projects/${project1.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(204)
        .end((err) => {
          if (err) {
            done(err);
          } else {
            server.services.pubsub.publish.calledWith('project.deleted').should.be.true;
            done();
          }
        });
    });

    it('should return 204, for connect admin, if project was successfully removed', (done) => {
      request(server)
        .delete(`/v4/projects/${project1.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(204)
        .end((err) => {
          if (err) {
            done(err);
          } else {
            server.services.pubsub.publish.calledWith('project.deleted').should.be.true;
            done();
          }
        });
    });

    it('should return 204, for connect admin, if project was successfully removed', (done) => {
      request(server)
        .delete(`/v4/projects/${project1.id}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(204)
        .end((err) => {
          if (err) {
            done(err);
          } else {
            server.services.pubsub.publish.calledWith('project.deleted').should.be.true;
            done();
          }
        });
    });
  });
});
