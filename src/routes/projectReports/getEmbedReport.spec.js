import chai from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import config from 'config';
import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';
import util from '../../util';
import lookerSerivce from '../../services/lookerService';

const should = chai.should();

describe('GET embed report', () => {
  let project0;
  let project1;
  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => models.Project.create({
        type: 'generic',
        directProjectId: 0,
        billingAccountId: 0,
        name: 'test0',
        description: 'test project0',
        status: 'reviewed',
        details: {},
        createdBy: 1,
        updatedBy: 1,
        lastActivityAt: 1,
        lastActivityUserId: '1',
      }))
      .then((p0) => {
        project0 = p0;
        return models.ProjectMember.create({
          userId: 40051331,
          projectId: project0.id,
          role: 'customer',
          isPrimary: true,
          createdBy: 1,
          updatedBy: 1,
        });
      })
      .then(() => models.ProjectTemplate.create({
        name: 'template 2',
        key: 'key 2',
        category: 'concrete',
        icon: 'http://example.com/icon1.ico',
        question: 'question 2',
        info: 'info 2',
        aliases: ['key-2', 'key_2'],
        scope: {},
        phases: {},
        createdBy: 1,
        updatedBy: 2,
      }))
      .then(temp => models.Project.create({
        type: 'generic',
        directProjectId: 1,
        billingAccountId: 1,
        name: 'test1',
        description: 'test project1',
        status: 'reviewed',
        details: {},
        createdBy: 1,
        updatedBy: 1,
        lastActivityAt: 1,
        templateId: temp.id,
        lastActivityUserId: '1',
      }))
      .then((p) => {
        project1 = p;
        // create members
        return models.ProjectMember.create({
          userId: 40051332,
          projectId: project1.id,
          role: 'copilot',
          isPrimary: true,
          createdBy: 1,
          updatedBy: 1,
        });
      })
      .then(() => models.ProjectMember.create({
        userId: 40051334,
        projectId: project1.id,
        role: 'manager',
        isPrimary: true,
        createdBy: 1,
        updatedBy: 1,
      }))
      .then(() => models.ProjectMember.create({
        userId: 40051331,
        projectId: project1.id,
        role: 'customer',
        isPrimary: true,
        createdBy: 1,
        updatedBy: 1,
      }))
      .then(() => {
        done();
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('GET /projects/{id}/reports/embed', () => {
    let sandbox;
    beforeEach(() => {
      sandbox = sinon.sandbox.create();
    });
    afterEach(() => {
      sandbox.restore();
    });

    it('should return 403 if user does not have permissions', (done) => {
      request(server)
        .get(`/v5/projects/${project1.id}/reports/embed`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .expect('Content-Type', /json/)
        .expect(403, done);
    });

    it('should return 403 if project not exist', (done) => {
      request(server)
        .get('/v5/projects/100100/reports/embed')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect('Content-Type', /json/)
        .expect(403, done);
    });

    it('should return 404 when report name not mock and not in EMBED_REPORTS_MAPPING', (done) => {
      const cfg = sinon.stub(config, 'get');
      cfg.withArgs('lookerConfig.USE_MOCK').returns(false);
      request(server)
        .get(`/v5/projects/${project1.id}/reports/embed?reportName=random`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect('Content-Type', /json/)
        .expect(404, () => {
          cfg.restore();
          done();
        });
    });

    it('should return 500 when get admin user error', (done) => {
      const cfg = sinon.stub(config, 'get');
      const gem = sinon.stub(lookerSerivce, 'generateEmbedUrl', () => 'generatedUrl');
      cfg.withArgs('lookerConfig.USE_MOCK').returns(false);
      request(server)
        .get(`/v5/projects/${project1.id}/reports/embed?reportName=mock`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(500, () => {
          gem.restore();
          cfg.restore();
          done();
        });
    });

    it('should return 404 when the project template is not found', (done) => {
      const cfg = sinon.stub(config, 'get');
      const gem = sinon.stub(lookerSerivce, 'generateEmbedUrl', () => 'generatedUrl');
      cfg.withArgs('lookerConfig.USE_MOCK').returns(false);
      cfg.withArgs('lookerConfig.EMBED_REPORTS_MAPPING').returns('{"mock-concrete-customer": "/embed/looks/2"}');
      request(server)
        .get(`/v5/projects/${project0.id}/reports/embed?reportName=mock`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect('Content-Type', /json/)
        .expect(404, () => {
          gem.restore();
          cfg.restore();
          done();
        });
    });

    it('should return generate customer url', (done) => {
      const cfg = sinon.stub(config, 'get');
      const gem = sinon.stub(lookerSerivce, 'generateEmbedUrl', () => 'generatedUrl');
      cfg.withArgs('lookerConfig.USE_MOCK').returns(false);
      cfg.withArgs('lookerConfig.EMBED_REPORTS_MAPPING')
        .returns('{"mock-concrete-customer": "/customer/embed/looks/2"}');
      request(server)
        .get(`/v5/projects/${project1.id}/reports/embed?reportName=mock`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          gem.restore();
          cfg.restore();
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.should.equal('generatedUrl');
            const [user, project, member, embedUrl] = gem.lastCall.args;
            user.userId.should.equal(40051331);
            project.should.deep.equal({ id: project1.id });
            member.userId.should.equal(40051331);
            member.role.should.equal('customer');
            embedUrl.should.equal('/customer/embed/looks/2');
            done();
          }
        });
    });

    it('should return generate admin url', (done) => {
      const cfg = sinon.stub(config, 'get');
      const gem = sinon.stub(lookerSerivce, 'generateEmbedUrl', () => 'generatedUrl');
      const getAdmin = sinon.stub(util, 'getTopcoderUser', () => ({
        firstName: 'fn',
        lastName: 'ln',
        userId: 40051333,
      }));
      cfg.withArgs('lookerConfig.USE_MOCK').returns(false);
      cfg.withArgs('lookerConfig.EMBED_REPORTS_MAPPING').returns('{"mock-concrete-topcoder": "/admin/embed/looks/2"}');
      request(server)
        .get(`/v5/projects/${project1.id}/reports/embed?reportName=mock`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          getAdmin.restore();
          gem.restore();
          cfg.restore();
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.should.equal('generatedUrl');
            const [user, project, member, embedUrl] = gem.lastCall.args;
            user.userId.should.equal(40051333);
            project.should.deep.equal({ id: project1.id });
            member.userId.should.equal(40051333);
            member.firstName.should.equal('fn');
            member.lastName.should.equal('ln');
            member.role.should.equal('');
            embedUrl.should.equal('/admin/embed/looks/2');
            done();
          }
        });
    });

    it('should return generate copilot url', (done) => {
      const cfg = sinon.stub(config, 'get');
      const gem = sinon.stub(lookerSerivce, 'generateEmbedUrl', () => 'generatedUrl');
      cfg.withArgs('lookerConfig.USE_MOCK').returns(false);
      cfg.withArgs('lookerConfig.EMBED_REPORTS_MAPPING').returns('{"mock-concrete-copilot": "/copilot/embed/looks/2"}');
      request(server)
        .get(`/v5/projects/${project1.id}/reports/embed?reportName=mock`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          gem.restore();
          cfg.restore();
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.should.equal('generatedUrl');
            const [user, project, member, embedUrl] = gem.lastCall.args;
            user.userId.should.equal(40051332);
            project.should.deep.equal({ id: project1.id });
            member.userId.should.equal(40051332);
            member.role.should.equal('copilot');
            embedUrl.should.equal('/copilot/embed/looks/2');
            done();
          }
        });
    });
  });
});
