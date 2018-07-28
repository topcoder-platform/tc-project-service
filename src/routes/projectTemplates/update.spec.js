/**
 * Tests for get.js
 */
import chai from 'chai';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const should = chai.should();

describe('UPDATE project template', () => {
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

  beforeEach(() => testUtil.clearDb()
    .then(() => models.ProjectType.bulkCreate([
      {
        key: 'generic',
        displayName: 'Generic',
        icon: 'http://example.com/icon1.ico',
        question: 'question 1',
        info: 'info 1',
        aliases: ['key-1', 'key_1'],
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
        createdBy: 1,
        updatedBy: 1,
      },
    ]))
    .then(() => models.ProjectTemplate.create(template))
    .then((createdTemplate) => {
      templateId = createdTemplate.id;
      return Promise.resolve();
    }),
  );
  after(testUtil.clearDb);

  describe('PATCH /projectTemplates/{templateId}', () => {
    const body = {
      param: {
        name: 'template 1 - update',
        key: 'key 1 - update',
        category: 'concrete',
        scope: {
          scope1: {
            subScope1A: 11,
            subScope1C: 'new',
          },
          scope2: [4],
          scope3: 'new',
        },
        phases: {
          phase1: {
            name: 'phase 1 - update',
            details: {
              anyDetails: 'any details 1 - update',
              newDetails: 'new',
            },
            others: ['others new'],
          },
          phase3: {
            name: 'phase 3',
            details: {
              anyDetails: 'any details 3',
            },
            others: ['others 31', 'others 32'],
          },
        },
      },
    };

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .patch(`/v4/projectTemplates/${templateId}`)
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .patch(`/v4/projectTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .patch(`/v4/projectTemplates/${templateId}`)
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(403, done);
    });

    it('should return 403 for connect manager', (done) => {
      request(server)
        .patch(`/v4/projectTemplates/${templateId}`)
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(403, done);
    });

    it('should return 422 for invalid request', (done) => {
      const invalidBody = {
        param: {
          scope: 'a',
          phases: 1,
        },
      };

      request(server)
        .patch(`/v4/projectTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect(422, done);
    });

    it('should return 404 for non-existed template', (done) => {
      request(server)
        .patch('/v4/projectTemplates/1234')
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
            .patch(`/v4/projectTemplates/${templateId}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .send(body)
            .expect(404, done);
        });
    });

    it('should return 200 for admin', (done) => {
      request(server)
        .patch(`/v4/projectTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body.result.content;
          resJson.id.should.be.eql(templateId);
          resJson.name.should.be.eql(body.param.name);
          resJson.key.should.be.eql(body.param.key);
          resJson.category.should.be.eql(body.param.category);
          resJson.scope.should.be.eql({
            scope1: {
              subScope1A: 11,
              subScope1B: 2,
              subScope1C: 'new',
            },
            scope2: [4],
            scope3: 'new',
          });
          resJson.phases.should.be.eql({
            phase1: {
              name: 'phase 1 - update',
              details: {
                anyDetails: 'any details 1 - update',
                newDetails: 'new',
              },
              others: ['others new'],
            },
            phase2: {
              name: 'phase 2',
              details: {
                anyDetails: 'any details 2',
              },
              others: ['others 21', 'others 22'],
            },
            phase3: {
              name: 'phase 3',
              details: {
                anyDetails: 'any details 3',
              },
              others: ['others 31', 'others 32'],
            },
          });
          resJson.disabled.should.be.eql(true);
          resJson.hidden.should.be.eql(true);
          resJson.createdBy.should.be.eql(template.createdBy);
          should.exist(resJson.createdAt);
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 200 for connect admin', (done) => {
      request(server)
        .patch(`/v4/projectTemplates/${templateId}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .send(body)
        .expect(200)
        .end(done);
    });
  });
});
