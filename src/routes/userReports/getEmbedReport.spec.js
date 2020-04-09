import chai from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import config from 'config';
import server from '../../app';
import testUtil from '../../tests/util';
import util from '../../util';
import lookerSerivce from '../../services/lookerService';

const should = chai.should();

describe('GET embed report', () => {
  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => {
        done();
      });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('GET /project/reports/embed', () => {
    let sandbox;
    beforeEach(() => {
      sandbox = sinon.sandbox.create();
    });
    afterEach(() => {
      sandbox.restore();
    });

    it('should return 404 when EMBED_REPORTS_MAPPING is not defined', (done) => {
      const cfg = sinon.stub(config, 'get');
      cfg.withArgs('lookerConfig.USE_MOCK').returns('false');
      request(server)
        .get('/v5/projects/reports/embed?reportName=random')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(404, (err) => {
          cfg.restore();
          done(err);
        });
    });

    it('should return 404 when report name not mock and not in EMBED_REPORTS_MAPPING', (done) => {
      const cfg = sinon.stub(config, 'get');
      cfg.withArgs('lookerConfig.USE_MOCK').returns('false');
      cfg.withArgs('lookerConfig.EMBED_REPORTS_MAPPING').returns('{"mock": "/embed/looks/2"}');
      const getUser = sinon.stub(util, 'getTopcoderUser', () => ({
        firstName: 'fn',
        lastName: 'ln',
        userId: testUtil.userIds.member,
      }));
      request(server)
        .get('/v5/projects/reports/embed?reportName=random')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(404, (err) => {
          getUser.restore();
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
        .get('/v5/projects/reports/embed?reportName=random')
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
      const gem = sinon.stub(lookerSerivce, 'generateEmbedUrlForUser', () => 'generatedUrl');
      cfg.withArgs('lookerConfig.USE_MOCK').returns('false');
      cfg.withArgs('lookerConfig.EMBED_REPORTS_MAPPING').returns('{"mock-concrete-customer": "/embed/looks/2"}');
      request(server)
        .get('/v5/projects/reports/embed?reportName=mock')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(500, (err) => {
          gem.restore();
          cfg.restore();
          done(err);
        });
    });

    it('should return mock url', (done) => {
      const cfg = sinon.stub(config, 'get');
      const gem = sinon.stub(lookerSerivce, 'generateEmbedUrlForUser', () => 'generatedUrl');
      const getUser = sinon.stub(util, 'getTopcoderUser', () => ({
        firstName: 'fn',
        lastName: 'ln',
        userId: testUtil.userIds.member,
      }));
      cfg.withArgs('lookerConfig.USE_MOCK').returns('true');
      cfg.withArgs('lookerConfig.EMBED_REPORTS_MAPPING')
        .returns('{"mock": "/customer/embed/looks/2"}');
      request(server)
        .get('/v5/projects/reports/embed?reportName=summary')
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
            const [user, member, embedUrl] = gem.lastCall.args;
            user.userId.should.equal(testUtil.userIds.member);
            member.userId.should.equal(testUtil.userIds.member);
            embedUrl.should.equal('/customer/embed/looks/2');
            done();
          }
        });
    });

    it('should return customer url', (done) => {
      const cfg = sinon.stub(config, 'get');
      const gem = sinon.stub(lookerSerivce, 'generateEmbedUrlForUser', () => 'generatedUrl');
      const getUser = sinon.stub(util, 'getTopcoderUser', () => ({
        firstName: 'fn',
        lastName: 'ln',
        userId: testUtil.userIds.member,
      }));
      cfg.withArgs('lookerConfig.USE_MOCK').returns('false');
      cfg.withArgs('lookerConfig.EMBED_REPORTS_MAPPING')
        .returns('{"summary-customer": "/customer/embed/looks/2"}');
      request(server)
        .get('/v5/projects/reports/embed?reportName=summary')
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
            const [user, member, embedUrl] = gem.lastCall.args;
            user.userId.should.equal(testUtil.userIds.member);
            member.userId.should.equal(testUtil.userIds.member);
            embedUrl.should.equal('/customer/embed/looks/2');
            done();
          }
        });
    });

    it('should return admin url', (done) => {
      const cfg = sinon.stub(config, 'get');
      const gem = sinon.stub(lookerSerivce, 'generateEmbedUrlForUser', () => 'generatedUrl');
      const getAdmin = sinon.stub(util, 'getTopcoderUser', () => ({
        firstName: 'fn',
        lastName: 'ln',
        userId: testUtil.userIds.admin,
      }));
      cfg.withArgs('lookerConfig.USE_MOCK').returns('false');
      cfg.withArgs('lookerConfig.EMBED_REPORTS_MAPPING').returns('{"summary-topcoder": "/admin/embed/looks/2"}');
      request(server)
        .get('/v5/projects/reports/embed?reportName=summary')
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
            const [user, member, embedUrl] = gem.lastCall.args;
            user.userId.should.equal(testUtil.userIds.admin);
            member.userId.should.equal(testUtil.userIds.admin);
            member.firstName.should.equal('fn');
            member.lastName.should.equal('ln');
            embedUrl.should.equal('/admin/embed/looks/2');
            done();
          }
        });
    });

    it('should return copilot url', (done) => {
      const cfg = sinon.stub(config, 'get');
      const gem = sinon.stub(lookerSerivce, 'generateEmbedUrlForUser', () => 'generatedUrl');
      const getUser = sinon.stub(util, 'getTopcoderUser', () => ({
        firstName: 'fn',
        lastName: 'ln',
        userId: testUtil.userIds.copilot,
      }));
      cfg.withArgs('lookerConfig.USE_MOCK').returns('false');
      cfg.withArgs('lookerConfig.EMBED_REPORTS_MAPPING').returns('{"summary-copilot": "/copilot/embed/looks/2"}');
      request(server)
        .get('/v5/projects/reports/embed?reportName=summary')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
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
            const [user, member, embedUrl] = gem.lastCall.args;
            user.userId.should.equal(testUtil.userIds.copilot);
            member.userId.should.equal(testUtil.userIds.copilot);
            embedUrl.should.equal('/copilot/embed/looks/2');
            done();
          }
        });
    });
  });
});
