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
  let project3;
  let productTemplate0;
  let projectTemplate0;
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
      }).then((projectTemplate) => { projectTemplate0 = projectTemplate; }))
      .then(() => models.Project.create({
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
        templateId: projectTemplate0.id,
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
      .then(() => models.ProductTemplate.create({
        name: 'product template 1',
        productKey: 'product-key',
        category: 'prodCut',
        subCategory: 'prodSubCut',
        icon: 'http://example.com/product-icon.ico',
        brief: 'product brief',
        details: 'product details',
        aliases: ['product-key', 'product_key'],
        createdBy: 1,
        updatedBy: 2,
      }).then((productTemplate) => { productTemplate0 = productTemplate; }))
      .then(() => models.Project.create({
        type: 'generic',
        directProjectId: 3,
        billingAccountId: 3,
        name: 'product test',
        description: 'product test description',
        status: 'reviewed',
        details: {
          products: [productTemplate0.productKey],
        },
        createdBy: 1,
        updatedBy: 1,
        lastActivityAt: 1,
        lastActivityUserId: '1',
      }).then((project) => { project3 = project; }))
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
      cfg.withArgs('lookerConfig.USE_MOCK').returns('false');
      request(server)
        .get(`/v5/projects/${project1.id}/reports/embed?reportName=random`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(404, (err) => {
          cfg.restore();
          done(err);
        });
    });

    it('should return 403 when report name not mock and not in EMBED_REPORTS_MAPPING', (done) => {
      const cfg = sinon.stub(config, 'get');
      cfg.withArgs('lookerConfig.USE_MOCK').returns('false');
      // allows only admin user
      cfg.withArgs('lookerConfig.ALLOWED_USERS').returns(`[${testUtil.userIds.admin}]`);
      cfg.withArgs('lookerConfig.EMBED_REPORTS_MAPPING').returns('{"mock": "/embed/looks/2"}');
      request(server)
        .get(`/v5/projects/${project1.id}/reports/embed?reportName=random`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(403, (err) => {
          cfg.restore();
          done(err);
        });
    });

    it('should return 500 when get admin user error', (done) => {
      const cfg = sinon.stub(config, 'get');
      const gem = sinon.stub(lookerSerivce, 'generateEmbedUrlForProject', () => 'generatedUrl');
      cfg.withArgs('lookerConfig.USE_MOCK').returns('false');
      cfg.withArgs('lookerConfig.EMBED_REPORTS_MAPPING').returns('{"mock-concrete-customer": "/embed/looks/2"}');
      request(server)
        .get(`/v5/projects/${project1.id}/reports/embed?reportName=mock`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(500, (err) => {
          gem.restore();
          cfg.restore();
          done(err);
        });
    });

    it('should return 404 when the project template or product template is not found', (done) => {
      const cfg = sinon.stub(config, 'get');
      const gem = sinon.stub(lookerSerivce, 'generateEmbedUrlForProject', () => 'generatedUrl');
      cfg.withArgs('lookerConfig.USE_MOCK').returns('false');
      cfg.withArgs('lookerConfig.EMBED_REPORTS_MAPPING').returns('{"mock-concrete-customer": "/embed/looks/2"}');
      request(server)
        .get(`/v5/projects/${project0.id}/reports/embed?reportName=mock`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(404, (err) => {
          gem.restore();
          cfg.restore();
          done(err);
        });
    });

    it('should return mock url', (done) => {
      const cfg = sinon.stub(config, 'get');
      const gem = sinon.stub(lookerSerivce, 'generateEmbedUrlForProject', () => 'generatedUrl');
      const getUser = sinon.stub(util, 'getTopcoderUser', () => ({
        firstName: 'fn',
        lastName: 'ln',
        userId: testUtil.userIds.member,
      }));
      cfg.withArgs('lookerConfig.USE_MOCK').returns('true');
      cfg.withArgs('lookerConfig.EMBED_REPORTS_MAPPING')
        .returns('{"mock": "/customer/embed/looks/2"}');
      request(server)
        .get(`/v5/projects/${project1.id}/reports/embed?reportName=mock`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end((err, res) => {
          getUser.restore();
          gem.restore();
          cfg.restore();
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            resJson.should.equal('generatedUrl');
            const [user, project, member, embedUrl] = gem.lastCall.args;
            user.userId.should.equal(testUtil.userIds.member);
            project.should.deep.equal({ id: project1.id });
            member.userId.should.equal(testUtil.userIds.member);
            embedUrl.should.equal('/customer/embed/looks/2');
            done();
          }
        });
    });

    it('should return customer url', (done) => {
      const cfg = sinon.stub(config, 'get');
      const gem = sinon.stub(lookerSerivce, 'generateEmbedUrlForProject', () => 'generatedUrl');
      cfg.withArgs('lookerConfig.USE_MOCK').returns('false');
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
            user.userId.should.equal(testUtil.userIds.member);
            project.should.deep.equal({ id: project1.id });
            member.userId.should.equal(testUtil.userIds.member);
            member.role.should.equal('customer');
            embedUrl.should.equal('/customer/embed/looks/2');
            done();
          }
        });
    });

    it('should return admin url', (done) => {
      const cfg = sinon.stub(config, 'get');
      const gem = sinon.stub(lookerSerivce, 'generateEmbedUrlForProject', () => 'generatedUrl');
      const getAdmin = sinon.stub(util, 'getTopcoderUser', () => ({
        firstName: 'fn',
        lastName: 'ln',
        userId: 40051333,
      }));
      cfg.withArgs('lookerConfig.USE_MOCK').returns('false');
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
            user.userId.should.equal(testUtil.userIds.admin);
            project.should.deep.equal({ id: project1.id });
            member.userId.should.equal(testUtil.userIds.admin);
            member.firstName.should.equal('fn');
            member.lastName.should.equal('ln');
            member.role.should.equal('');
            embedUrl.should.equal('/admin/embed/looks/2');
            done();
          }
        });
    });

    it('should return copilot url', (done) => {
      const cfg = sinon.stub(config, 'get');
      const gem = sinon.stub(lookerSerivce, 'generateEmbedUrlForProject', () => 'generatedUrl');
      cfg.withArgs('lookerConfig.USE_MOCK').returns('false');
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
            user.userId.should.equal(testUtil.userIds.copilot);
            project.should.deep.equal({ id: project1.id });
            member.userId.should.equal(testUtil.userIds.copilot);
            member.role.should.equal('copilot');
            embedUrl.should.equal('/copilot/embed/looks/2');
            done();
          }
        });
    });

    it('should return admin url for project with product template', (done) => {
      const cfg = sinon.stub(config, 'get');
      const gem = sinon.stub(lookerSerivce, 'generateEmbedUrlForProject', () => 'generatedUrl');
      const getAdmin = sinon.stub(util, 'getTopcoderUser', () => ({
        firstName: 'fn',
        lastName: 'ln',
        userId: 40051333,
      }));
      cfg.withArgs('lookerConfig.USE_MOCK').returns('false');
      cfg.withArgs('lookerConfig.EMBED_REPORTS_MAPPING')
        .returns('{"mock-prodCut-topcoder": "/admin/embed/looks/3"}');
      request(server)
        .get(`/v5/projects/${project3.id}/reports/embed?reportName=mock`)
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
            user.userId.should.equal(testUtil.userIds.admin);
            project.should.deep.equal({ id: project3.id });
            member.userId.should.equal(testUtil.userIds.admin);
            member.firstName.should.equal('fn');
            member.lastName.should.equal('ln');
            member.role.should.equal('');
            embedUrl.should.equal('/admin/embed/looks/3');
            done();
          }
        });
    });
  });
});
