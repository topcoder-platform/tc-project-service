/**
 * Tests for get.js
 */
import _ from 'lodash';
import chai from 'chai';
import request from 'supertest';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';

const should = chai.should();

describe('UPDATE project type', () => {
  const type = {
    key: 'key1',
    displayName: 'displayName 1',
    icon: 'http://example.com/icon1.ico',
    question: 'question 1',
    info: 'info 1',
    aliases: ['key-1', 'key_1'],
    disabled: false,
    hidden: false,
    metadata: { 'slack-notification-mappings': { color: '#96d957', label: 'Full App' } },
    createdBy: 1,
    updatedBy: 1,
  };
  const key = type.key;

  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => models.ProjectType.create(type).then(() => done()));
  });
  after((done) => {
    testUtil.clearDb(done);
  });

  describe('PATCH /projects/metadata/projectTypes/{key}', () => {
    const body = {
      displayName: 'displayName 1 - update',
      icon: 'http://example.com/icon1.ico - update',
      question: 'question 1 - update',
      info: 'info 1 - update',
      aliases: ['key-1-updated', 'key_1_updated'],
      disabled: true,
      hidden: true,
      metadata: { 'slack-notification-mappings': { color: '#b47dd6', label: 'Full App 2' } },
    };

    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .patch(`/v5/projects/metadata/projectTypes/${key}`)
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for member', (done) => {
      request(server)
        .patch(`/v5/projects/metadata/projectTypes/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(body)
        .expect(403, done);
    });

    it('should return 403 for copilot', (done) => {
      request(server)
        .patch(`/v5/projects/metadata/projectTypes/${key}`)
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(403, done);
    });

    it('should return 403 for manager', (done) => {
      request(server)
        .patch(`/v5/projects/metadata/projectTypes/${key}`)
        .send(body)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(403, done);
    });

    it('should return 404 for non-existed type', (done) => {
      request(server)
        .patch('/v5/projects/metadata/projectTypes/1234')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect(404, done);
    });

    it('should return 404 for deleted type', (done) => {
      models.ProjectType.destroy({ where: { key } })
        .then(() => {
          request(server)
            .patch(`/v5/projects/metadata/projectTypes/${key}`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .send(body)
            .expect(404, done);
        });
    });

    it('should return 200 for admin displayName updated', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.icon;
      delete partialBody.info;
      delete partialBody.question;
      delete partialBody.aliases;
      delete partialBody.disabled;
      delete partialBody.hidden;
      delete partialBody.metadata;
      request(server)
        .patch(`/v5/projects/metadata/projectTypes/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.key.should.be.eql(key);
          resJson.displayName.should.be.eql(partialBody.displayName);
          resJson.icon.should.be.eql(type.icon);
          resJson.info.should.be.eql(type.info);
          resJson.question.should.be.eql(type.question);
          resJson.aliases.should.be.eql(type.aliases);
          resJson.disabled.should.be.eql(type.disabled);
          resJson.hidden.should.be.eql(type.hidden);
          resJson.metadata.should.be.eql(type.metadata);
          resJson.createdBy.should.be.eql(type.createdBy);
          resJson.createdBy.should.be.eql(type.createdBy); // should not update createdAt
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 200 for admin icon updated', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.info;
      delete partialBody.displayName;
      delete partialBody.question;
      delete partialBody.aliases;
      delete partialBody.disabled;
      delete partialBody.hidden;
      delete partialBody.metadata;
      request(server)
        .patch(`/v5/projects/metadata/projectTypes/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.key.should.be.eql(key);
          resJson.displayName.should.be.eql(type.displayName);
          resJson.icon.should.be.eql(partialBody.icon);
          resJson.info.should.be.eql(type.info);
          resJson.question.should.be.eql(type.question);
          resJson.aliases.should.be.eql(type.aliases);
          resJson.disabled.should.be.eql(type.disabled);
          resJson.hidden.should.be.eql(type.hidden);
          resJson.metadata.should.be.eql(type.metadata);
          resJson.createdBy.should.be.eql(type.createdBy);
          resJson.createdBy.should.be.eql(type.createdBy); // should not update createdAt
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 200 for admin info updated', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.icon;
      delete partialBody.displayName;
      delete partialBody.question;
      delete partialBody.aliases;
      delete partialBody.disabled;
      delete partialBody.hidden;
      delete partialBody.metadata;
      request(server)
        .patch(`/v5/projects/metadata/projectTypes/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.key.should.be.eql(key);
          resJson.displayName.should.be.eql(type.displayName);
          resJson.icon.should.be.eql(type.icon);
          resJson.info.should.be.eql(partialBody.info);
          resJson.question.should.be.eql(type.question);
          resJson.aliases.should.be.eql(type.aliases);
          resJson.disabled.should.be.eql(type.disabled);
          resJson.hidden.should.be.eql(type.hidden);
          resJson.metadata.should.be.eql(type.metadata);
          resJson.createdBy.should.be.eql(type.createdBy);
          resJson.createdBy.should.be.eql(type.createdBy); // should not update createdAt
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 200 for admin question updated', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.icon;
      delete partialBody.info;
      delete partialBody.displayName;
      delete partialBody.aliases;
      delete partialBody.disabled;
      delete partialBody.hidden;
      delete partialBody.metadata;
      request(server)
        .patch(`/v5/projects/metadata/projectTypes/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.key.should.be.eql(key);
          resJson.displayName.should.be.eql(type.displayName);
          resJson.icon.should.be.eql(type.icon);
          resJson.info.should.be.eql(type.info);
          resJson.question.should.be.eql(partialBody.question);
          resJson.aliases.should.be.eql(type.aliases);
          resJson.disabled.should.be.eql(type.disabled);
          resJson.hidden.should.be.eql(type.hidden);
          resJson.metadata.should.be.eql(type.metadata);
          resJson.createdBy.should.be.eql(type.createdBy);
          resJson.createdBy.should.be.eql(type.createdBy); // should not update createdAt
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 200 for admin aliases updated', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.icon;
      delete partialBody.info;
      delete partialBody.question;
      delete partialBody.displayName;
      delete partialBody.disabled;
      delete partialBody.hidden;
      delete partialBody.metadata;
      request(server)
        .patch(`/v5/projects/metadata/projectTypes/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.key.should.be.eql(key);
          resJson.displayName.should.be.eql(type.displayName);
          resJson.icon.should.be.eql(type.icon);
          resJson.info.should.be.eql(type.info);
          resJson.question.should.be.eql(type.question);
          resJson.aliases.should.be.eql(partialBody.aliases);
          resJson.disabled.should.be.eql(type.disabled);
          resJson.hidden.should.be.eql(type.hidden);
          resJson.metadata.should.be.eql(type.metadata);
          resJson.createdBy.should.be.eql(type.createdBy);
          resJson.createdBy.should.be.eql(type.createdBy); // should not update createdAt
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 200 for admin disabled updated', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.icon;
      delete partialBody.info;
      delete partialBody.question;
      delete partialBody.displayName;
      delete partialBody.aliases;
      delete partialBody.hidden;
      delete partialBody.metadata;
      request(server)
        .patch(`/v5/projects/metadata/projectTypes/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.key.should.be.eql(key);
          resJson.displayName.should.be.eql(type.displayName);
          resJson.icon.should.be.eql(type.icon);
          resJson.info.should.be.eql(type.info);
          resJson.question.should.be.eql(type.question);
          resJson.aliases.should.be.eql(type.aliases);
          resJson.disabled.should.be.eql(partialBody.disabled);
          resJson.hidden.should.be.eql(type.hidden);
          resJson.metadata.should.be.eql(type.metadata);
          resJson.createdBy.should.be.eql(type.createdBy);
          resJson.createdBy.should.be.eql(type.createdBy); // should not update createdAt
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 200 for admin hidden updated', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.icon;
      delete partialBody.info;
      delete partialBody.question;
      delete partialBody.displayName;
      delete partialBody.disabled;
      delete partialBody.aliases;
      delete partialBody.metadata;
      request(server)
        .patch(`/v5/projects/metadata/projectTypes/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.key.should.be.eql(key);
          resJson.displayName.should.be.eql(type.displayName);
          resJson.icon.should.be.eql(type.icon);
          resJson.info.should.be.eql(type.info);
          resJson.question.should.be.eql(type.question);
          resJson.aliases.should.be.eql(type.aliases);
          resJson.disabled.should.be.eql(type.disabled);
          resJson.hidden.should.be.eql(partialBody.hidden);
          resJson.metadata.should.be.eql(type.metadata);
          resJson.createdBy.should.be.eql(type.createdBy); // should not update createdAt
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 200 for admin metadata updated', (done) => {
      const partialBody = _.cloneDeep(body);
      delete partialBody.icon;
      delete partialBody.info;
      delete partialBody.question;
      delete partialBody.displayName;
      delete partialBody.disabled;
      delete partialBody.aliases;
      delete partialBody.hidden;
      request(server)
        .patch(`/v5/projects/metadata/projectTypes/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(partialBody)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.key.should.be.eql(key);
          resJson.displayName.should.be.eql(type.displayName);
          resJson.icon.should.be.eql(type.icon);
          resJson.info.should.be.eql(type.info);
          resJson.question.should.be.eql(type.question);
          resJson.aliases.should.be.eql(type.aliases);
          resJson.disabled.should.be.eql(type.disabled);
          resJson.hidden.should.be.eql(type.hidden);
          resJson.metadata.should.be.eql(partialBody.metadata);
          resJson.createdBy.should.be.eql(type.createdBy); // should not update createdAt
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 200 for admin all fields updated', (done) => {
      request(server)
        .patch(`/v5/projects/metadata/projectTypes/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(body)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.key.should.be.eql(key);
          resJson.displayName.should.be.eql(body.displayName);
          resJson.icon.should.be.eql(body.icon);
          resJson.info.should.be.eql(body.info);
          resJson.question.should.be.eql(body.question);
          resJson.aliases.should.be.eql(body.aliases);
          resJson.disabled.should.be.eql(body.disabled);
          resJson.hidden.should.be.eql(body.hidden);
          resJson.metadata.should.be.eql(body.metadata);
          resJson.createdBy.should.be.eql(type.createdBy); // should not update createdAt
          resJson.updatedBy.should.be.eql(40051333); // admin
          should.exist(resJson.updatedAt);
          should.not.exist(resJson.deletedBy);
          should.not.exist(resJson.deletedAt);

          done();
        });
    });

    it('should return 200 for connect admin', (done) => {
      request(server)
        .patch(`/v5/projects/metadata/projectTypes/${key}`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.connectAdmin}`,
        })
        .send(body)
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          resJson.key.should.be.eql(key);
          resJson.displayName.should.be.eql(body.displayName);
          resJson.icon.should.be.eql(body.icon);
          resJson.info.should.be.eql(body.info);
          resJson.question.should.be.eql(body.question);
          resJson.aliases.should.be.eql(body.aliases);
          resJson.disabled.should.be.eql(body.disabled);
          resJson.hidden.should.be.eql(body.hidden);
          resJson.metadata.should.be.eql(body.metadata);
          resJson.createdBy.should.be.eql(type.createdBy); // should not update createdAt
          resJson.updatedBy.should.be.eql(40051336); // connect admin
          done();
        });
    });
  });
});
