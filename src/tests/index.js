/**
 * Tests Initialization
 */
import sinon from 'sinon';
import util from '../util';

sinon.stub(util, 'getM2MToken', () => Promise.resolve('MOCK_TOKEN'));
sinon.stub(util, 'updateTopObjectPropertyFromES', () => new Promise(resolve => resolve()));
sinon.stub(util, 'updateMetadataFromES', () => new Promise(resolve => resolve()));
sinon.stub(util, 'updateEsData', () => new Promise(resolve => resolve()));
sinon.stub(util, 'getProjectFromEs', () => new Promise(resolve => resolve({ _source: {} })));

