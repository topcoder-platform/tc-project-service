/**
 * Tests for util.js
 */
import chai from 'chai';
import util from './util';

chai.should();

describe('Util method', () => {
  describe('maskEmail', () => {
    it('should return the original value if the email is non-string', () => {
      chai.should().not.exist(util.maskEmail(null));
    });
    it('should return the original value if the email is non-email string', () => {
      util.maskEmail('aa.com').should.equal('aa.com');
    });
    it('should return "a***a@a***a.com" if the email is "a@a.com"', () => {
      util.maskEmail('a@a.com').should.equal('a***a@a***a.com');
    });
    it('should return "a***b@a***a.com" if the email is "ab@aa.com"', () => {
      util.maskEmail('ab@aa.com').should.equal('a***b@a***a.com');
    });
    it('should return "***@***.com" if the email is "abc@aaa.com"', () => {
      util.maskEmail('abc@aaa.com').should.equal('a***c@a***a.com');
    });
    it('should return "ab*d@aa*a.com" if the email is "abcd@aaaa.com"', () => {
      util.maskEmail('abcd@aaaa.com').should.equal('a***d@a***a.com');
    });
    it('should return "ab**e@aa**a.com" if the email is "abcde@aaaaa.com"', () => {
      util.maskEmail('abcde@aaaaa.com').should.equal('a***e@a***a.com');
    });
    it('should return "ab***f@aa***a.com" if the email is "abcdef@aaaaaa.com"', () => {
      util.maskEmail('abcdef@aaaaaa.com').should.equal('a***f@a***a.com');
    });
    it('should return "ab****g@aa****a.com" if the email is "abcdefg@aaaaaaa.com"', () => {
      util.maskEmail('abcdefg@aaaaaaa.com').should.equal('a***g@a***a.com');
    });
    it('should return "ab*****h@aa****a.com" if the email is "abcdefgh@aaaaaaaa.com"', () => {
      util.maskEmail('abcdefgh@aaaaaaaa.com').should.equal('a***h@a***a.com');
    });
    it('should return "ab******i@aa*****a.com" if the email is "abcdefghi@aaaaaaaaa.com"', () => {
      util.maskEmail('abcdefghi@aaaaaaaaa.com').should.equal('a***i@a***a.com');
    });
  });

  describe('postProcessInvites', () => {
    it('should mask emails when passing data like for a project list endpoint for non-admin user', () => {
      const list = [
        {
          id: 1,
          invites: [{
            id: 2,
            email: 'abcd@aaaa.com',
          },
          ],
        },
      ];
      const list2 = [
        {
          id: 1,
          invites: [{
            id: 2,
            email: 'a***d@a***a.com',
          },
          ],
        },
      ];
      const res = {
        authUser: { userId: 2 },
      };
      util.postProcessInvites('$..invites[?(@.email)]', list, res).should.deep.equal(list2);
    });

    it('should mask emails when passing data like for a project details endpoint for non-admin user', () => {
      const detail = {
        id: 1,
        invites: [{
          id: 2,
          email: 'abcd@aaaa.com',
        },
        ],
      };
      const detail2 = {
        id: 1,
        invites: [{
          id: 2,
          email: 'a***d@a***a.com',
        },
        ],
      };
      const res = {
        authUser: { userId: 2 },
      };
      util.postProcessInvites('$..invites[?(@.email)]', detail, res).should.deep.equal(detail2);
    });

    it('should mask emails when passing data like for a single invite endpoint for non-admin user', () => {
      const detail = {
        success: [
          {
            id: 1,
            email: 'abcd@aaaa.com',
          },
        ],
      };
      const detail2 = {
        success: [
          {
            id: 1,
            email: 'a***d@a***a.com',
          },
        ],
      };
      const res = {
        authUser: { userId: 2 },
      };
      util.postProcessInvites('$.success[?(@.email)]', detail, res).should.deep.equal(detail2);
    });

    it('should NOT mask emails when passing data like for a single invite endpoint for admin user', () => {
      const detail = {
        success: [
          {
            id: 1,
            email: 'abcd@aaaa.com',
          },
        ],
      };
      const detail2 = {
        success: [
          {
            id: 1,
            email: 'abcd@aaaa.com',
          },
        ],
      };
      const res = {
        authUser: { userId: 2, roles: ['administrator'] },
      };
      util.postProcessInvites('$.success[?(@.email)]', detail, res).should.deep.equal(detail2);
    });

    it('should NOT mask emails when passing data like for a single invite endpoint for user\'s own invite', () => {
      const detail = {
        success: [
          {
            id: 1,
            email: 'abcd@aaaa.com',
            createdBy: 2,
          },
        ],
      };
      const detail2 = {
        success: [
          {
            id: 1,
            email: 'abcd@aaaa.com',
            createdBy: 2,
          },
        ],
      };
      const res = {
        authUser: { userId: 2, email: 'abcd@aaaa.com' },
      };
      util.postProcessInvites('$.success[?(@.email)]', detail, res).should.deep.equal(detail2);
    });

    it('should NOT mask emails when passing data like for a project details endpoint for user\'s own invite', () => {
      const detail = {
        id: 1,
        invites: [{
          id: 2,
          email: 'abcd@aaaa.com',
          createdBy: 2,
        },
        ],
      };
      const detail2 = {
        id: 1,
        invites: [{
          id: 2,
          email: 'abcd@aaaa.com',
          createdBy: 2,
        },
        ],
      };
      const res = {
        authUser: { userId: 2, email: 'abcd@aaaa.com' },
      };
      util.postProcessInvites('$.invites[?(@.email)]', detail, res).should.deep.equal(detail2);
    });

    it('should not return `userId` for invite by email', () => {
      const detail = {
        id: 1,
        invites: [{
          id: 2,
          email: 'abcd@aaaa.com',
          userId: 33,
          createdBy: 2,
        },
        ],
      };
      const detail2 = {
        id: 1,
        invites: [{
          id: 2,
          email: 'abcd@aaaa.com',
          userId: null,
          createdBy: 2,
        },
        ],
      };
      const res = {
        authUser: { userId: 2 },
      };
      util.postProcessInvites('$..invites[?(@.email)]', detail, res).should.deep.equal(detail2);
    });
  });


  describe('isProjectSettingForEstimation', () => {
    it('should return "true" if key is correct: "markup_fee"', () => {
      util.isProjectSettingForEstimation('markup_fee').should.equal(true);
    });

    it('should return "false" if key has unknown estimation type: "markup_unknown"', () => {
      util.isProjectSettingForEstimation('markup_unknown').should.equal(false);
    });

    it('should return "false" if key doesn\'t have "markup_" prefix: "fee"', () => {
      util.isProjectSettingForEstimation('fee').should.equal(false);
    });

    it('should return "false" if key doesn\'t have duplicated prefix "markup_": "markup_markup_fee"', () => {
      util.isProjectSettingForEstimation('markup_markup_fee').should.equal(false);
    });

    it('should return "false" if has prefix "markup_" at the end: "feemarkup_"', () => {
      util.isProjectSettingForEstimation('feemarkup_').should.equal(false);
    });

    it('should return "false" if has additional text after: "markup_fee_text"', () => {
      util.isProjectSettingForEstimation('markup_fee_text').should.equal(false);
    });

    it('should return "false" if has additional text before: "text_markup_fee"', () => {
      util.isProjectSettingForEstimation('text_markup_fee').should.equal(false);
    });
  });
});
