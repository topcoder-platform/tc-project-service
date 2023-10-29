/**
 * Tests for get.js
 */
import chai from 'chai';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const should = chai.should();

describe('Upgrade project template', () => {
  const template = {
    name: 'template 1',
    key: 'key 1',
    category: 'generic',
    icon: 'http://example.com/icon1.ico',
    question: 'question 1',
    info: 'info 1',
    aliases: ['key-1', 'key_1'],
    disabled: true,
    hidden: true,
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
  };

  let templateId;

  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => models.ProjectType.bulkCreate([
        {
          key: 'generic',
          displayName: 'Generic',
          icon: 'http://example.com/icon1.ico',
          question: 'question 1',
          info: 'info 1',
          aliases: ['key-1', 'key_1'],
          metadata: {},
          createdBy: 1,
          updatedBy: 1,
        },
        {
          key: 'concrete',
          displayName: 'Concrete',
          icon: 'http://example.com/icon1.ico',
          question: 'question 2',
          info: 'info 2',
          aliases: ['key-2', 'key_2'],
          metadata: {},
          createdBy: 1,
          updatedBy: 1,
        },
      ]))
      .then(() => {
        models.Form.bulkCreate([
          {
            key: 'dev',
            version: 1,
            revision: 1,
            config: ['key-1', 'key_1'],
            createdBy: 1,
            updatedBy: 1,
          },
        ]);
      })
      .then(() => {
        models.PriceConfig.bulkCreate([
          {
            key: 'dev',
            version: 1,
            revision: 1,
            config: ['key-1', 'key_1'],
            createdBy: 1,
            updatedBy: 1,
          },
        ]);
      })
      .then(() => {
        models.PlanConfig.bulkCreate([
          {
            key: 'dev',
            version: 1,
            revision: 1,
            config: ['key-1', 'key_1'],
            createdBy: 1,
            updatedBy: 1,
          },
        ]);
      })
      .then(() => models.ProjectTemplate.create(template))
      .then((createdTemplate) => {
        templateId = createdTemplate.id;
        done();
      });
  });
  after((done) => {
    testUtil.clearDb(done);
  });

  describe('POST /projects/metadata/projectTemplates/{templateId}/upgrade', () => {
    const body = {
      form: {
        key: 'dev',
        version: 1,
      },
      priceConfig: {
        key: 'dev',
        version: 1,
      },
      planConfig: {
        key: 'dev',
        version: 1,
      },
    };

    const emptyBody = {
    };


    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .post(`/v5/projects/metadata/projectTemplates/${templateId}/upgrade`)
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .post(`/v5/projects/metadata/projectTemplates/${templateId}/upgrade`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .post(`/v5/projects/metadata/projectTemplates/${templateId}/upgrade`)
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(403, done);
    });

    it('should return 403 for connect manager', (done) => {
      request(server)
        .post(`/v5/projects/metadata/projectTemplates/${templateId}/upgrade`)
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(403, done);
    });


    it('should return 404 for non-existed template', (done) => {
      request(server)
        .post('/v5/projects/metadata/projectTemplates/123/upgrade')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect(404, done);
    });

    it('should return 404 for deleted template', (done) => {
      models.ProjectTemplate.destroy({ where: { id: templateId } })
        .then(() => {
          request(server)
            .post(`/v5/projects/metadata/projectTemplates/${templateId}/upgrade`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .send(body)
            .expect(404, done);
        });
    });

    it('should return 200 for admin', (done) => {
      request(server)
        .post(`/v5/projects/metadata/projectTemplates/${templateId}/upgrade`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.id.should.be.eql(templateId);

          should.not.exist(resJson.scope);
          should.not.exist(resJson.phases);

          resJson.form.should.be.eql({
            key: 'dev',
            version: 1,
          });

          resJson.priceConfig.should.be.eql({
            key: 'dev',
            version: 1,
          });

          resJson.planConfig.should.be.eql({
            key: 'dev',
            version: 1,
          });

          should.exist(resJson.createdAt);
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should create new version of model if body not given model key and version', (done) => {
      request(server)
        .post(`/v5/projects/metadata/projectTemplates/${templateId}/upgrade`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(emptyBody)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;

          should.not.exist(resJson.scope);
          should.not.exist(resJson.phases);

          resJson.form.should.be.eql({
            key: 'key 1',
            version: 1,
          });

          resJson.priceConfig.should.be.eql({
            key: 'key 1',
            version: 1,
          });

          resJson.planConfig.should.be.eql({
            key: 'key 1',
            version: 1,
          });

          resJson.createdBy.should.be.eql(template.createdBy);
          should.exist(resJson.createdAt);
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });
  });
});
