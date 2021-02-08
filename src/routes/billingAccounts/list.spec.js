/* eslint-disable no-unused-expressions */
// import chai from 'chai';
import request from 'supertest';
import sinon from 'sinon';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';
import SalesforceService from '../../services/salesforceService';

// const should = chai.should();

describe('Project Billing Accounts list', () => {
  let project1;
  let salesforceAuthenticate;
  let salesforceQuery;

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
          return models.ProjectMember.create({
            userId: testUtil.userIds.copilot,
            projectId: project1.id,
            role: 'copilot',
            isPrimary: true,
            createdBy: 1,
            updatedBy: 1,
          }).then(() => models.ProjectMember.create({
            userId: testUtil.userIds.member,
            projectId: project1.id,
            role: 'customer',
            isPrimary: false,
            createdBy: 1,
            updatedBy: 1,
          }));
        }).then(() => {
          salesforceAuthenticate = sinon.stub(SalesforceService, 'authenticate', () => Promise.resolve({
            accessToken: 'mock',
            instanceUrl: 'mock_url',
          }));
          salesforceQuery = sinon.stub(SalesforceService, 'query', () => Promise.resolve([{
            accessToken: 'mock',
            instanceUrl: 'mock_url',
          }]));
          done();
        });
      });
  });

  afterEach((done) => {
    salesforceAuthenticate.restore();
    salesforceQuery.restore();
    done();
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('List /projects/{id}/billingAccounts', () => {
    it('should return 403 for anonymous user', (done) => {
      request(server)
        .get(`/v5/projects/${project1.id}/billingAccounts`)
        .expect(403, done);
    });

    it('should return 403 for a regular user who is not a member of the project', (done) => {
      request(server)
        .get(`/v5/projects/${project1.id}/billingAccounts`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .send()
        .expect(403, done);
    });

    it('should return all attachments to admin', (done) => {
      request(server)
        .get(`/v5/projects/${project1.id}/billingAccounts`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send()
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            resJson.should.have.length(2);
            // TODO verify BA fields
            done();
          }
        });
    });

    xit('should return all attachments using M2M token with "read:user-billing-accounts" scope', (done) => {
      request(server)
        .get(`/v5/projects/${project1.id}/billingAccounts`)
        .set({
          Authorization: `Bearer ${testUtil.m2m['read:user-billing-accounts']}`,
        })
        .send()
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            resJson.should.have.length(2);
            // TODO verify BA fields
            done();
          }
        });
    });
  });
});
