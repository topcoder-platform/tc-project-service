/* eslint-disable no-unused-expressions */
import chai from 'chai';
import request from 'supertest';
import sinon from 'sinon';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';
import SalesforceService from '../../services/salesforceService';

const should = chai.should();

// demo data which might be returned by the `SalesforceService.query`
const billingAccountData = {
  tcBillingAccountId: 123123,
  markup: 50,
};

describe('Project Billing Accounts list', () => {
  let project1;
  let project2;
  let salesforceAuthenticate;
  let salesforceQuery;

  beforeEach((done) => {
    testUtil.clearDb()
      .then(() => testUtil.clearES())
      .then(() => models.Project.create({
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
      })).then(() => models.Project.create({
        type: 'generic',
        directProjectId: 1,
        billingAccountId: null, // do not define billingAccountId
        name: 'test1',
        description: 'test project1',
        status: 'draft',
        details: {},
        createdBy: 1,
        updatedBy: 1,
        lastActivityAt: 1,
        lastActivityUserId: '1',
      }).then((p) => {
        project2 = p;
        // create members
        return models.ProjectMember.create({
          userId: testUtil.userIds.copilot,
          projectId: project2.id,
          role: 'copilot',
          isPrimary: true,
          createdBy: 1,
          updatedBy: 1,
        }).then(() => models.ProjectMember.create({
          userId: testUtil.userIds.member,
          projectId: project2.id,
          role: 'customer',
          isPrimary: false,
          createdBy: 1,
          updatedBy: 1,
        }));
      }))
      .then(() => {
        salesforceAuthenticate = sinon.stub(SalesforceService, 'authenticate', () => Promise.resolve({
          accessToken: 'mock',
          instanceUrl: 'mock_url',
        }));
        // eslint-disable-next-line
        salesforceQuery = sinon.stub(SalesforceService, 'queryBillingAccount', () => Promise.resolve(billingAccountData));
        done();
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

  describe('Get /projects/{id}/billingAccounts', () => {
    it('should return 403 for anonymous user', (done) => {
      request(server)
        .get(`/v5/projects/${project1.id}/billingAccount`)
        .expect(403, done);
    });

    it('should return 404 if the project is not found', (done) => {
      request(server)
        .get('/v5/projects/11223344/billingAccount')
        .set({
          Authorization: `Bearer ${testUtil.m2m['read:project-billing-account-details']}`,
        })
        .send()
        .expect(404, done);
    });

    it('should return 404 if billing account is not defined in the project', (done) => {
      request(server)
        .get(`/v5/projects/${project2.id}/billingAccount`)
        .set({
          Authorization: `Bearer ${testUtil.m2m['read:project-billing-account-details']}`,
        })
        .send()
        .expect(404, done);
    });

    it('should return billing account details using M2M token with "read:project-billing-account-details" scope',
      (done) => {
        request(server)
          .get(`/v5/projects/${project1.id}/billingAccount`)
          .set({
            Authorization: `Bearer ${testUtil.m2m['read:project-billing-account-details']}`,
          })
          .send()
          .expect(200)
          .end((err, res) => {
            if (err) {
              done(err);
            } else {
              const resJson = res.body;
              resJson.should.deep.equal(billingAccountData);
              done();
            }
          });
      });

    it('should return billing account details using user token but without markup field',
      (done) => {
        request(server)
          .get(`/v5/projects/${project1.id}/billingAccount`)
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
              resJson.tcBillingAccountId.should.be.eql(billingAccountData.tcBillingAccountId);
              should.not.exist(resJson.markup);
              done();
            }
          });
      });
  });
});
