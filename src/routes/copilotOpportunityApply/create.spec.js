/* eslint-disable no-unused-expressions */
import chai from 'chai';
import sinon from 'sinon';

import models from '../../models';
import util from '../../util';
import busApi from '../../services/busApi';
import {
  CONNECT_NOTIFICATION_EVENT,
  COPILOT_OPPORTUNITY_STATUS,
  TEMPLATE_IDS,
  USER_ROLE,
} from '../../constants';
import createHandlers from './create';

chai.should();

describe('Copilot Opportunity Apply create', () => {
  let sandbox;
  let req;
  let res;
  let next;
  let opportunity;
  let application;

  const handler = createHandlers[1];

  beforeEach(() => {
    sandbox = sinon.sandbox.create();

    opportunity = {
      id: 123,
      status: COPILOT_OPPORTUNITY_STATUS.ACTIVE,
      createdBy: 40051334,
      copilotRequest: {
        data: {
          projectType: 'dev',
          opportunityTitle: 'New mobile app build',
        },
      },
    };
    application = {
      id: 456,
      opportunityId: opportunity.id,
      userId: 40051332,
      notes: 'Available next week',
    };
    req = {
      id: 'request-id',
      authUser: { userId: application.userId },
      body: { notes: application.notes },
      log: {
        debug: sandbox.stub(),
        error: sandbox.stub(),
      },
      params: { id: `${opportunity.id}` },
      sanitize: value => value,
    };
    res = {
      status: sandbox.stub().returnsThis(),
      json: sandbox.stub(),
    };
    next = sandbox.stub();

    sandbox.stub(util, 'hasPermissionByReq').returns(true);
    sandbox.stub(models.CopilotOpportunity, 'findOne').returns(Promise.resolve(opportunity));
    sandbox.stub(models.CopilotApplication, 'findOne').returns(Promise.resolve(null));
    sandbox.stub(models.CopilotApplication, 'create').returns(Promise.resolve(application));
    sandbox.stub(busApi, 'createEvent').returns(Promise.resolve());
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('sends application notifications to PM role subjects and the opportunity creator', async () => {
    sandbox.stub(util, 'getRolesByRoleName').returns(Promise.resolve([120]));
    sandbox.stub(util, 'getRoleInfo').returns(Promise.resolve({
      subjects: [
        { email: 'pm1@example.com', handle: 'pm1' },
        { email: 'CREATOR@example.com', handle: 'creator-as-pm' },
        { handle: 'missing-email' },
      ],
    }));
    sandbox.stub(util, 'getMemberDetailsByUserIds', (userIds) => {
      if (userIds[0] === opportunity.createdBy) {
        return Promise.resolve([{ email: 'creator@example.com', handle: 'creator' }]);
      }
      return Promise.resolve([{ email: 'copilot@example.com', handle: 'applicant' }]);
    });

    await handler(req, res, next);

    next.notCalled.should.be.true;
    res.status.calledWith(201).should.be.true;
    res.json.calledWith(application).should.be.true;

    busApi.createEvent.callCount.should.equal(2);
    const recipients = busApi.createEvent.getCalls()
      .map(call => call.args[1].recipients[0])
      .sort();
    recipients.should.deep.equal(['CREATOR@example.com', 'pm1@example.com'].sort());

    busApi.createEvent.getCalls().forEach((call) => {
      call.args[0].should.equal(CONNECT_NOTIFICATION_EVENT.EXTERNAL_ACTION_EMAIL);
      call.args[1].sendgrid_template_id.should.equal(TEMPLATE_IDS.APPLY_COPILOT);
      call.args[1].data.opportunity_details_url.should.contain('/opportunity/123#applications');
      call.args[1].data.opportunity_title.should.equal('New mobile app build');
      call.args[1].data.copilot_handle.should.equal('applicant');
    });
    util.getRolesByRoleName.calledWith(USER_ROLE.PROJECT_MANAGER).should.be.true;
  });

  it('still notifies the creator when PM role lookup fails', async () => {
    sandbox.stub(util, 'getRolesByRoleName', () => Promise.reject(new Error('role service down')));
    sandbox.stub(util, 'getRoleInfo').returns(Promise.resolve({ subjects: [] }));
    sandbox.stub(util, 'getMemberDetailsByUserIds', (userIds) => {
      if (userIds[0] === opportunity.createdBy) {
        return Promise.resolve([{ email: 'creator@example.com', handle: 'creator' }]);
      }
      return Promise.resolve([{ email: 'copilot@example.com', handle: 'applicant' }]);
    });

    await handler(req, res, next);

    next.notCalled.should.be.true;
    res.status.calledWith(201).should.be.true;
    busApi.createEvent.calledOnce.should.be.true;
    busApi.createEvent.firstCall.args[1].recipients.should.deep.equal(['creator@example.com']);
    req.log.error.called.should.be.true;
  });
});
