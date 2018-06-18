/**
 * Tests for create.js
 */
import chai from 'chai';
import request from 'supertest';

import server from '../../app';
import testUtil from '../../tests/util';

const should = chai.should();

describe('CREATE project template', () => {
  describe('POST /projectTemplates', () => {
    const body = {
      param: {
        name: 'template 1',
        key: 'key 1',
        category: 'category 1',
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
      },
    };

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .post('/v4/projectTemplates')
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .post('/v4/projectTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .post('/v4/projectTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 422 if validations dont pass', (done) => {
      const invalidBody = {
        param: {
          scope: 'a',
          phases: 1,
        },
      };

      request(server)
        .post('/v4/projectTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(invalidBody)
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 201 for admin', (done) => {
      request(server)
        .post('/v4/projectTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          const resJson = res.body.result.content;
          should.exist(resJson.id);
          resJson.name.should.be.eql(body.param.name);
          resJson.key.should.be.eql(body.param.key);
          resJson.category.should.be.eql(body.param.category);
          resJson.disabled.should.be.eql(true);
          resJson.hidden.should.be.eql(true);
          resJson.scope.should.be.eql(body.param.scope);
          resJson.phases.should.be.eql(body.param.phases);

          resJson.createdBy.should.be.eql(40051333); // admin
          should.exist(resJson.createdAt);
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 201 for connect manager', (done) => {
      request(server)
        .post('/v4/projectTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          const resJson = res.body.result.content;
          resJson.createdBy.should.be.eql(40051334); // manager
          resJson.updatedBy.should.be.eql(40051334); // manager
          done();
        });
    });

    it('should return 201 for connect admin', (done) => {
      request(server)
        .post('/v4/projectTemplates')
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .send(body)
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          const resJson = res.body.result.content;
          resJson.createdBy.should.be.eql(40051336); // connect admin
          resJson.updatedBy.should.be.eql(40051336); // connect admin
          done();
        });
    });
  });
});
