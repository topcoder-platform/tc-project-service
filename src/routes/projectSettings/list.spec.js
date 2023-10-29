/**
 * Tests for list.js
 */
import _ from 'lodash';
import request from 'supertest';
import chai from 'chai';
import server from '../../app';
import models from '../../models';
import testUtil from '../../tests/util';

const should = chai.should();

describe('LIST Project Settings', () => {
  let projectId;

  const memberUser = {
    handle: testUtil.getDecodedToken(testUtil.jwts.member).handle,
    userId: testUtil.getDecodedToken(testUtil.jwts.member).userId,
    firstName: 'fname',
    lastName: 'lName',
    email: 'some@abc.com',
  };
  const copilotUser = {
    handle: testUtil.getDecodedToken(testUtil.jwts.copilot).handle,
    userId: testUtil.getDecodedToken(testUtil.jwts.copilot).userId,
    firstName: 'fname',
    lastName: 'lName',
    email: 'some@abc.com',
  };

  const settings = [{
    key: 'markup_topcoder_service',
    value: '3500',
    valueType: 'double',
    readPermission: {
      allowRule: {
        projectRoles: ['customer', 'copilot'],
        topcoderRoles: ['administrator'],
      },
      denyRule: {
        projectRoles: ['copilot'],
        topcoderRoles: ['Connect Admin'],
      },
    },
    writePermission: {
      allowRule: { topcoderRoles: ['administrator'] },
      denyRule: { projectRoles: ['copilot'] },
    },
    createdBy: 1,
    updatedBy: 1,
  }, {
    key: 'markup_fee',
    value: '15',
    valueType: 'percentage',
    readPermission: {
      topcoderRoles: ['administrator'],
    },
    writePermission: {
      allowRule: { topcoderRoles: ['administrator'] },
      denyRule: { projectRoles: ['copilot'] },
    },
    createdBy: 1,
    updatedBy: 1,
  }];

  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => {
        // Create projects
        models.Project.create({
          type: 'generic',
          billingAccountId: 1,
          name: 'test1',
          description: 'test project1',
          status: 'draft',
          details: {},
          createdBy: 1,
          updatedBy: 1,
          lastActivityAt: 1,
          lastActivityUserId: '1',
        })
          .then((project) => {
            projectId = project.id;
            // create members
            models.ProjectMember.bulkCreate([{
              id: 1,
              userId: copilotUser.userId,
              projectId,
              role: 'copilot',
              isPrimary: false,
              createdBy: 1,
              updatedBy: 1,
            }, {
              id: 2,
              userId: memberUser.userId,
              projectId,
              role: 'customer',
              isPrimary: true,
              createdBy: 1,
              updatedBy: 1,
            }])
              .then(() => {
                models.ProjectSetting.bulkCreate(_.map(settings, s => _.assign(s, { projectId }))).then(() => done());
              });
          });
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('GET /projects/{projectId}/settings', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/settings`)
        .expect(403, done);
    });

    it('should return 403 when user have no permission (non team member)', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/settings`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .expect(403, done);
    });

    it('should return 404 for deleted project', (done) => {
      models.Project.destroy({ where: { id: projectId } })
        .then(() => {
          request(server)
            .get(`/v5/projects/${projectId}/settings`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .expect(404, done);
        });
    });

    it('should return 404 for non-existed project', (done) => {
      request(server)
        .get('/v5/projects/99999/settings')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(404, done);
    });

    it('should return 0 setting when copilot has readPermission for both denyRule and allowRule', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/settings`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.should.have.lengthOf(0);
            done();
          }
        });
    });

    it('should return 0 setting when connect admin has readPermission for denyRule', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/settings`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.should.have.lengthOf(0);
            done();
          }
        });
    });

    it('should return 1 setting when user have readPermission (customer)', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/settings`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.should.have.lengthOf(1);
            const setting = settings[0];
            resJson[0].key.should.be.eql(setting.key);
            resJson[0].value.should.be.eql(setting.value);
            resJson[0].valueType.should.be.eql(setting.valueType);
            resJson[0].projectId.should.be.eql(projectId);
            resJson[0].readPermission.should.be.eql(setting.readPermission);
            resJson[0].writePermission.should.be.eql(setting.writePermission);
            done();
          }
        });
    });

    it('should return 2 settings when user have readPermission (administrator)', (done) => {
      request(server)
        .get(`/v5/projects/${projectId}/settings`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.should.have.lengthOf(2);
            const setting = settings[0];
            resJson[0].key.should.be.eql(setting.key);
            resJson[0].value.should.be.eql(setting.value);
            resJson[0].valueType.should.be.eql(setting.valueType);
            resJson[0].projectId.should.be.eql(projectId);
            resJson[0].readPermission.should.be.eql(setting.readPermission);
            resJson[0].writePermission.should.be.eql(setting.writePermission);
            done();
          }
        });
    });
  });
});
