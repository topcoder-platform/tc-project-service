/**
 * Tests for util.js
 */
import chai from 'chai';
import util from './util';

chai.should();

describe('Util method', () => {
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
