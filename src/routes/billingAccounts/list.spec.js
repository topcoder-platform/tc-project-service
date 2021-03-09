/* eslint-disable no-unused-expressions */
import chai from 'chai';
import request from 'supertest';
import sinon from 'sinon';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';
import SalesforceService from '../../services/salesforceService';

chai.should();

// demo data which might be returned by the `SalesforceService.query`
const billingAccountsData = [
  {
    sfBillingAccountId: '123',
    tcBillingAccountId: 123123,
    name: 'Billing Account 1',
    startDate: '2021-02-10T18:51:27Z',
    endDate: '2021-03-10T18:51:27Z',
  }, {
    sfBillingAccountId: '456',
    tcBillingAccountId: 456456,
    name: 'Billing Account 2',
    startDate: '2011-02-10T18:51:27Z',
    endDate: '2011-03-10T18:51:27Z',
  },
];

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
          salesforceQuery = sinon.stub(SalesforceService, 'query', () => Promise.resolve(billingAccountsData));
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

    it('should return 403 for a customer user who is a member of the project', (done) => {
      request(server)
        .get(`/v5/projects/${project1.id}/billingAccounts`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send()
        .expect(403, done);
    });

    it('should return 403 for a topcoder user who is not a member of the project', (done) => {
      request(server)
        .get(`/v5/projects/${project1.id}/billingAccounts`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilotManager}`,
        })
        .send()
        .expect(403, done);
    });

    it('should return all billing accounts for a topcoder user who is a member of the project', (done) => {
      request(server)
        .get(`/v5/projects/${project1.id}/billingAccounts`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send()
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            resJson.should.have.length(2);
            resJson.should.include(billingAccountsData[0]);
            resJson.should.include(billingAccountsData[1]);
            done();
          }
        });
    });

    it('should return all billing accounts to admin', (done) => {
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
            resJson.should.have.length(2);
            resJson.should.include(billingAccountsData[0]);
            resJson.should.include(billingAccountsData[1]);
            done();
          }
        });
    });

    it('should return all billing accounts using M2M token with "read:user-billing-accounts" scope', (done) => {
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
            resJson.should.have.length(2);
            resJson.should.include(billingAccountsData[0]);
            resJson.should.include(billingAccountsData[1]);
            done();
          }
        });
    });
  });
});
