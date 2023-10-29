/**
 * Tests for list.js
 */
import chai from 'chai';
import request from 'supertest';
import config from 'config';
import _ from 'lodash';

import models from '../../models';
import server from '../../app';
import testUtil from '../../tests/util';
import util from '../../util';

const should = chai.should();
const expect = chai.expect;

const ES_METADATA_INDEX = config.get('elasticsearchConfig.metadataIndexName');
const ES_METADATA_TYPE = config.get('elasticsearchConfig.metadataDocType');
const eClient = util.getElasticSearchClient();

const projectTemplates = [
  {
    name: 'template 1',
    key: 'key 1',
    category: 'category 1',
    icon: 'http://example.com/icon1.ico',
    question: 'question 1',
    info: 'info 1',
    aliases: ['key-1', 'key_1'],
    scope: {},
    phases: {},
    form: { key: 'key1', version: 1 },
    planConfig: { key: 'key1', version: 1 },
    priceConfig: { key: 'key1', version: 1 },
    createdBy: 1,
    updatedBy: 1,
    disabled: false,
  },
];
const productTemplates = [
  {
    name: 'name 1',
    productKey: 'productKey 1',
    category: 'category',
    subCategory: 'category',
    icon: 'http://example.com/icon1.ico',
    brief: 'brief 1',
    details: 'details 1',
    aliases: {},
    form: { key: 'productKey 1', version: 1 },
    template: null,
    createdBy: 1,
    updatedBy: 2,
  },
];
const milestoneTemplates = [
  {
    id: 1,
    name: 'milestoneTemplate 1',
    duration: 3,
    type: 'type1',
    order: 1,
    plannedText: 'text to be shown in planned stage',
    blockedText: 'text to be shown in blocked stage',
    activeText: 'text to be shown in active stage',
    completedText: 'text to be shown in completed stage',
    reference: 'product',
    referenceId: 1,
    metadata: {},
    createdBy: 1,
    updatedBy: 2,
  },
];
const projectTypes = [
  {
    key: 'key1',
    displayName: 'displayName 1',
    icon: 'http://example.com/icon1.ico',
    question: 'question 1',
    info: 'info 1',
    aliases: ['key-1', 'key_1'],
    metadata: { 'slack-notification-mappings': { color: '#96d957', label: 'Full App' } },
    createdBy: 1,
    updatedBy: 1,
  },
];
const productCategories = [
  {
    key: 'key1',
    displayName: 'displayName 1',
    icon: 'http://example.com/icon1.ico',
    question: 'question 1',
    info: 'info 1',
    aliases: ['key-1', 'key_1'],
    createdBy: 1,
    updatedBy: 1,
  },
];
const forms = [
  {
    key: 'key1',
    config: {
      hello: 'world',
    },
    version: 1,
    revision: 1,
    createdBy: 1,
    updatedBy: 1,
  },
  {
    key: 'key1',
    config: {
      hello: 'world',
    },
    version: 2,
    revision: 1,
    createdBy: 1,
    updatedBy: 1,
  },
  {
    key: 'productKey 1',
    config: {
      sections: [{
        id: 'appDefinition',
        title: 'Sample Project',
        required: true,
        description: 'Please answer a few basic questions',
        subSections: [{
          id: 'projectName',
          required: true,
          validationError: 'Please provide a name for your project',
          fieldName: 'name',
          description: '',
          title: 'Project Name',
          type: 'project-name',
        }],
      }],
    },
    version: 2,
    revision: 1,
    createdBy: 1,
    updatedBy: 1,
  },
];
const priceConfigs = [
  {
    key: 'key1',
    config: {
      hello: 'world',
    },
    version: 1,
    revision: 1,
    createdBy: 1,
    updatedBy: 1,
  },
  {
    key: 'key1',
    config: {
      hello: 'world',
    },
    version: 2,
    revision: 1,
    createdBy: 1,
    updatedBy: 1,
  },
];
const planConfigs = [
  {
    key: 'key1',
    config: {
      hello: 'world',
    },
    version: 1,
    revision: 1,
    createdBy: 1,
    updatedBy: 1,
  },
  {
    key: 'key1',
    config: {
      hello: 'world',
    },
    version: 2,
    revision: 1,
    createdBy: 1,
    updatedBy: 1,
  },
];

const buildingBlocks = [
  {
    key: 'key1',
    config: {
      hello: 'world',
    },
    privateConfig: {
      message: 'you should not see this',
    },
    createdBy: 1,
    updatedBy: 1,
  },
  {
    key: 'key2',
    config: {
      hello: 'topcoder',
    },
    privateConfig: {
      message: 'you should not see this',
    },
    createdBy: 1,
    updatedBy: 1,
  },
];

const getObjToIndex = (items) => {
  const toIndex = _(items).map((item) => {
    const json = _.omit(item.toJSON(), 'deletedAt', 'deletedBy');

    // setup ES markers. check these for equality with "from ES" to confirm that these records well pulled from ES
    if (json.description !== undefined) {
      json.description = 'from ES';
    } else if (json.info != null) {
      json.info = 'from ES';
    } else if (json.details != null) {
      json.details = 'from ES';
    } else if (json.config != null) {
      if (json.config.sections != null) {
        json.config.sections[0].description = 'from ES';
      } else if (json.hello != null) {
        json.hello = 'from ES';
      }
    }
    // end of ES markers

    return json;
  }).value();

  return toIndex;
};

describe('GET all metadata from DB', () => {
  before((done) => {
    testUtil.clearES()
      .then(() => testUtil.clearDb())
      .then(() => models.ProjectTemplate.bulkCreate(projectTemplates))
      .then(() => models.ProductTemplate.bulkCreate(productTemplates))
      .then(() => models.MilestoneTemplate.bulkCreate(milestoneTemplates))
      .then(() => models.ProjectType.bulkCreate(projectTypes))
      .then(() => models.ProductCategory.bulkCreate(productCategories))
      .then(() => models.Form.bulkCreate(forms))
      .then(() => models.PriceConfig.bulkCreate(priceConfigs))
      .then(() => models.PlanConfig.bulkCreate(planConfigs))
      .then(() => models.BuildingBlock.bulkCreate(buildingBlocks))
      .then(() => done());
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('GET /projects/metadata', () => {
    it('should return 403 if user is not authenticated', (done) => {
      request(server)
        .get('/v5/projects/metadata')
        .expect(403, done);
    });

    it('should return 200 for admin', (done) => {
      request(server)
        .get('/v5/projects/metadata')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for admin', (done) => {
      request(server)
        .get('/v5/projects/metadata')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          should.exist(resJson);
          resJson.projectTemplates.should.have.length(1);
          resJson.productTemplates.should.have.length(1);
          resJson.milestoneTemplates.should.have.length(1);
          resJson.projectTypes.should.have.length(1);
          resJson.productCategories.should.have.length(1);
          resJson.forms.should.have.length(2);
          resJson.planConfigs.should.have.length(1);
          resJson.priceConfigs.should.have.length(1);

          resJson.forms[0].version.should.be.eql(2);
          resJson.planConfigs[0].version.should.be.eql(2);
          resJson.priceConfigs[0].version.should.be.eql(2);

          done();
        });
    });

    it('should return all used model when request with includeAllReferred query', (done) => {
      request(server)
        .get('/v5/projects/metadata?includeAllReferred=true')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          should.exist(resJson);
          resJson.projectTemplates.should.have.length(1);
          resJson.productTemplates.should.have.length(1);
          resJson.milestoneTemplates.should.have.length(1);
          resJson.projectTypes.should.have.length(1);
          resJson.productCategories.should.have.length(1);
          resJson.forms.should.have.length(3);
          resJson.planConfigs.should.have.length(2);
          resJson.priceConfigs.should.have.length(2);
          done();
        });
    });

    it('should return 200 for connect manager', (done) => {
      request(server)
        .get('/v5/projects/metadata')
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .expect(200)
        .end(done);
    });

    it('should return 200 for member', (done) => {
      request(server)
        .get('/v5/projects/metadata')
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .expect(200, done);
    });

    it('should return 200 for copilot', (done) => {
      request(server)
        .get('/v5/projects/metadata')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(200, done);
    });

    it('should return correct building blocks for admin', (done) => {
      request(server)
        .get('/v5/projects/metadata')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            should.exist(resJson.buildingBlocks);
            resJson.buildingBlocks.length.should.be.eql(2);
            resJson.buildingBlocks[0].key.should.be.eql('key1');
            should.not.exist(resJson.buildingBlocks[0].privateConfig);
            resJson.buildingBlocks[1].key.should.be.eql('key2');
            should.not.exist(resJson.buildingBlocks[1].privateConfig);
            done();
          }
        });
    });
  });
});

describe('GET all metadata from ES', () => {
  before((done) => {
    const esData = {};

    testUtil.clearES()
      .then(() => testUtil.clearDb())
      .then(() => models.ProjectTemplate.bulkCreate(projectTemplates, { returning: true }))
      .then((created) => { esData.projectTemplates = getObjToIndex(created); })
      .then(() => models.ProductTemplate.bulkCreate(productTemplates, { returning: true }))
      .then((created) => { esData.productTemplates = getObjToIndex(created); })
      .then(() => models.MilestoneTemplate.bulkCreate(milestoneTemplates, { returning: true }))
      .then((created) => { esData.milestoneTemplates = getObjToIndex(created); })
      .then(() => models.ProjectType.bulkCreate(projectTypes, { returning: true }))
      .then((created) => { esData.projectTypes = getObjToIndex(created); })
      .then(() => models.ProductCategory.bulkCreate(productCategories, { returning: true }))
      .then((created) => { esData.productCategories = getObjToIndex(created); })
      .then(() => models.Form.bulkCreate(forms, { returning: true }))
      .then((created) => {
      // only index form with key `productKey 1`
        const v2Form = _(created).filter(c => c.key === 'productKey 1');
        esData.forms = getObjToIndex(v2Form);
      })
      .then(() => models.PriceConfig.bulkCreate(priceConfigs, { returning: true }))
      .then((created) => {
      // only index latest versions
        const v2PriceConfigs = _(created).filter(c => c.version === 2);
        esData.priceConfigs = getObjToIndex(v2PriceConfigs);
      })
      .then(() => models.PlanConfig.bulkCreate(planConfigs, { returning: true }))
      .then((created) => {
      // only index latest versions
        const v2PlanConfigs = _(created).filter(c => c.version === 2);
        esData.planConfigs = getObjToIndex(v2PlanConfigs);
      })
      .then(() => models.BuildingBlock.bulkCreate(buildingBlocks, { returning: true }))
      .then((created) => { esData.buildingBlocks = getObjToIndex(created); })
      .then(() => eClient.index({
        index: ES_METADATA_INDEX,
        type: ES_METADATA_TYPE,
        body: esData,
      }))
      .then(() => done());
  });

  after((done) => {
    testUtil.clearES().then(() => testUtil.clearDb(done));
  });

  describe('GET /projects/metadata', () => {
    it('should return 200 for admin from ES', (done) => {
      request(server)
        .get('/v5/projects/metadata')
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .expect(200)
        .end((err, res) => {
          const resJson = res.body;
          should.exist(resJson);
          resJson.projectTemplates.should.have.length(1);
          resJson.projectTemplates[0].info.should.eql('from ES');

          resJson.productTemplates.should.have.length(1);
          resJson.productTemplates[0].details.should.eql('from ES');

          resJson.milestoneTemplates.should.have.length(1);
          resJson.milestoneTemplates[0].description.should.eql('from ES');

          resJson.projectTypes.should.have.length(1);
          resJson.projectTypes[0].info.should.eql('from ES');

          resJson.productCategories.should.have.length(1);
          resJson.productCategories[0].info.should.eql('from ES');

          resJson.forms.should.have.length(1);
          resJson.forms[0].key.should.eql('productKey 1');
          resJson.forms[0].config.sections.should.have.length(1);
          resJson.forms[0].config.sections[0].description.should.eql('from ES');

          resJson.planConfigs.should.have.length(1);
          resJson.priceConfigs.should.have.length(1);

          resJson.forms[0].version.should.be.eql(2);
          resJson.planConfigs[0].version.should.be.eql(2);
          resJson.priceConfigs[0].version.should.be.eql(2);

          done();
        });
    });

    it('should return correct building blocks for admin from ES', (done) => {
      request(server)
        .get('/v5/projects/metadata')
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .expect(200)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body;
            should.exist(resJson);
            should.exist(resJson.buildingBlocks);
            resJson.buildingBlocks.length.should.be.eql(2);
            should.not.exist(resJson.buildingBlocks[0].privateConfig);
            should.not.exist(resJson.buildingBlocks[1].privateConfig);

            // ES doesn't guarantee order if sort order isn't specified. Current implementation doesn't specify sort order
            expect(_.some(resJson.buildingBlocks, { key: 'key1' })).to.be.true; // eslint-disable-line no-unused-expressions
            expect(_.some(resJson.buildingBlocks, { key: 'key2' })).to.be.true; // eslint-disable-line no-unused-expressions

            done();
          }
        });
    });
  });
});
