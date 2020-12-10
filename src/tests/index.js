/**
 * Tests Initialization
 */
import sinon from 'sinon';
import util from '../util';

sinon.stub(util, 'getM2MToken', () => Promise.resolve('MOCK_TOKEN'));
