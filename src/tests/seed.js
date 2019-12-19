import models from '../models';
import { TIMELINE_REFERENCES } from '../constants';

models.sequelize.sync({ force: true })
  .then(() =>
    models.Project.bulkCreate([{
      type: 'generic',
      directProjectId: 9999999,
      billingAccountId: 1,
      name: 'test1',
      description: 'test project1',
      status: 'active',
      details: {},
      createdBy: 1,
      updatedBy: 1,
      lastActivityAt: new Date(),
      lastActivityUserId: '1',
    }, {
      type: 'visual_design',
      directProjectId: 1,
      billingAccountId: 2,
      name: 'test2',
      description: 'test project2',
      status: 'draft',
      details: {},
      createdBy: 1,
      updatedBy: 1,
      lastActivityAt: new Date(),
      lastActivityUserId: '1',
    }, {
      type: 'visual_design',
      billingAccountId: 3,
      name: 'test2',
      description: 'completed project without copilot',
      status: 'completed',
      details: {},
      createdBy: 1,
      updatedBy: 1,
      lastActivityAt: new Date(),
      lastActivityUserId: '1',
    }, {
      type: 'generic',
      billingAccountId: 4,
      name: 'test2',
      description: 'draft project without copilot',
      status: 'draft',
      details: {},
      createdBy: 1,
      updatedBy: 1,
      lastActivityAt: new Date(),
      lastActivityUserId: '1',
    }, {
      type: 'generic',
      billingAccountId: 5,
      name: 'test2',
      description: 'active project without copilot',
      status: 'active',
      details: {},
      createdBy: 1,
      updatedBy: 1,
      lastActivityAt: new Date(),
      lastActivityUserId: '1',
    }, {
      type: 'generic',
      billingAccountId: 5,
      name: 'test2',
      description: 'Ongoing project',
      status: 'active',
      details: {
        name: 'a specific name',
        products: ['application_development', 'website_development'],
        appDefinition: { budget: 10000 },
        sampleKey1: {
          sampleSubKey1: 'a specific value',
        },
        sampleKey2: {
          sampleSubKey2: 'a specific value',
        },
      },
      createdBy: 1,
      updatedBy: 1,
      lastActivityAt: new Date(),
      lastActivityUserId: '1',
      version: 'v2',
      directProjectId: 123,
      estimatedPrice: 15000,
      actualPrice: 18000,
    }, {
      type: 'generic',
      billingAccountId: 5,
      name: 'test2',
      description: 'Completed project',
      status: 'completed',
      details: {
        name: 'a specific name',
        products: ['application_development', 'website_development'],
        appDefinition: { budget: 10000 },
        sampleKey1: {
          sampleSubKey1: 'a specific value',
        },
        sampleKey2: {
          sampleSubKey2: 'a specific value',
        },
      },
      createdBy: 1,
      updatedBy: 1,
      lastActivityAt: new Date(),
      lastActivityUserId: '1',
      version: 'v2',
      directProjectId: 123,
      estimatedPrice: 15000,
      actualPrice: 18000,
    }]))
  .then(() => models.Project.findAll())
  .then((projects) => {
    const project1 = projects[0];
    const project2 = projects[1];
    const project7 = projects[6];
    const operations = [];
    operations.push(models.ProjectMember.bulkCreate([{
      userId: 40051331,
      projectId: project1.id,
      role: 'customer',
      isPrimary: false,
      createdBy: 1,
      updatedBy: 1,
    }, {
      userId: 40051332,
      projectId: project1.id,
      role: 'copilot',
      isPrimary: false,
      createdBy: 1,
      updatedBy: 1,
    }, {
      userId: 40051333,
      projectId: project1.id,
      role: 'manager',
      isPrimary: true,
      createdBy: 1,
      updatedBy: 1,
    }, {
      userId: 40051332,
      projectId: project2.id,
      role: 'copilot',
      isPrimary: false,
      createdBy: 1,
      updatedBy: 1,
    }, {
      userId: 40051331,
      projectId: projects[2].id,
      role: 'customer',
      isPrimary: false,
      createdBy: 1,
      updatedBy: 1,
    }]));
    operations.push(models.ProjectAttachment.create({
      title: 'Spec',
      projectId: project1.id,
      description: 'specification',
      filePath: 'projects/1/spec.pdf',
      contentType: 'application/pdf',
      createdBy: 1,
      updatedBy: 1,
    }));
    const dbNow = Math.floor(Date.now() / 1000) * 1000;
    const millisInADay = 1000 * 60 * 60 * 24;
    const yesterday = new Date(dbNow - millisInADay);
    operations.push(models.ProjectHistory.bulkCreate([{
      projectId: project7.id,
      status: 'completed',
      createdAt: yesterday,
      createdBy: 1,
      updatedBy: 1,
    }, {
      projectId: project7.id,
      status: 'completed',
      // 10 days ago
      createdAt: new Date(dbNow - (millisInADay * 10)),
      createdBy: 1,
      updatedBy: 1,
    }]));
    return Promise.all(operations);
  })
  .then(() => models.ProjectTemplate.bulkCreate([
    {
      name: 'template 1',
      key: 'key 1',
      category: 'category 1',
      icon: 'http://example.com/icon1.ico',
      question: 'question 1',
      info: 'info 1',
      aliases: [],
      scope: {
        scope1: {
          subScope1A: 1,
          subScope1B: 2,
        },
        scope2: [1, 2, 3],
      },
      phases: {
        phase1: {
          name: 'phase 1',
          details: {
            anyDetails: 'any details 1',
          },
          others: ['others 11', 'others 12'],
        },
        phase2: {
          name: 'phase 2',
          details: {
            anyDetails: 'any details 2',
          },
          others: ['others 21', 'others 22'],
        },
      },
      createdBy: 1,
      updatedBy: 1,
    },
    {
      name: 'template 2',
      key: 'key 2',
      category: 'category 2',
      icon: 'http://example.com/icon1.ico',
      info: 'info 2',
      aliases: [],
      scope: {},
      phases: {},
      question: 'question 2',
      createdBy: 1,
      updatedBy: 2,
    },
    {
      name: 'template 3',
      key: 'key 3',
      category: 'category 3',
      icon: 'http://example.com/icon3.ico',
      question: 'question 3',
      info: 'info 3',
      aliases: [],
      scope: {},
      phases: {
        1: {
          name: 'Design Stage',
          status: 'open',
          details: {
            description: 'detailed description',
          },
          products: [
            {
              id: 21,
              name: 'product 1',
              productKey: 'visual_design_prod',
            },
          ],
        },
        2: {
          name: 'Development Stage',
          status: 'open',
          products: [
            {
              id: 23,
              name: 'product 2',
              details: {
                subDetails: 'subDetails 2',
              },
              productKey: 'website_development',
            },
          ],
        },
        3: {
          name: 'QA Stage',
          status: 'open',
        },
      },
      createdBy: 1,
      updatedBy: 2,
    },
    {
      name: 'template 1',
      key: 'generic',
      category: 'category 1',
      icon: 'http://example.com/icon1.ico',
      question: 'question 1',
      info: 'info 1',
      aliases: [],
      scope: {
        scope1: {
          subScope1A: 1,
          subScope1B: 2,
        },
        scope2: [1, 2, 3],
      },
      phases: {
        // for all tests, use a project template that maps to a product template by productKey
        phase1: {
          name: 'phase 1',
          products: [{
            productKey: 'application_development',
          }, {
            productKey: 'product_key_2',
          }],
          details: {
            anyDetails: 'any details 1',
          },
          others: ['others 11', 'others 12'],
        },
        phase2: {
          name: 'phase 2',
          products: [{
            productKey: 'website_development',
          }, {
            productKey: 'product_key_4',
          }],
          details: {
            anyDetails: 'any details 2',
          },
          others: ['others 21', 'others 22'],
        },
      },
      createdBy: 1,
      updatedBy: 1,
    },
  ]))
  .then(() => models.ProductTemplate.bulkCreate([
    {
      name: 'name 1',
      productKey: 'productKey 1',
      category: 'category',
      subCategory: 'category',
      icon: 'http://example.com/icon1.ico',
      question: 'question 1',
      info: 'info 1',
      brief: 'brief 1',
      details: 'details 1',
      aliases: {
        alias1: {
          subAlias1A: 1,
          subAlias1B: 2,
        },
        alias2: [1, 2, 3],
      },
      template: {
        template1: {
          name: 'template 1',
          details: {
            anyDetails: 'any details 1',
          },
          others: ['others 11', 'others 12'],
        },
        template2: {
          name: 'template 2',
          details: {
            anyDetails: 'any details 2',
          },
          others: ['others 21', 'others 22'],
        },
      },
      createdBy: 1,
      updatedBy: 2,
    },
    {
      name: 'template 2',
      productKey: 'productKey 2',
      category: 'category',
      subCategory: 'category',
      icon: 'http://example.com/icon1.ico',
      question: 'question 1',
      info: 'info 1',
      brief: 'brief 2',
      details: 'details 2',
      aliases: [],
      template: {},
      createdBy: 3,
      updatedBy: 4,
    },
    {
      name: 'Generic work',
      productKey: 'generic_work',
      subCategory: 'category',
      category: 'category',
      icon: 'http://example.com/icon1.ico',
      question: 'question 1',
      info: 'info 1',
      brief: 'brief 1',
      details: 'details 1',
      aliases: {
        alias1: {
          subAlias1A: 1,
          subAlias1B: 2,
        },
        alias2: [1, 2, 3],
      },
      template: {
        name: 'a template name',
        sampleKey1: {
          sampleSubKey1: 'a value',
        },
        sampleKey2: {
          sampleSubKey2: 'a value',
        },
      },
      createdBy: 1,
      updatedBy: 2,
    },
    {
      name: 'Website product',
      productKey: 'website_development',
      category: 'category',
      subCategory: 'category',
      icon: 'http://example.com/icon1.ico',
      question: 'question 1',
      info: 'info 1',
      brief: 'brief 1',
      details: 'details 1',
      aliases: {
        alias1: {
          subAlias1A: 1,
          subAlias1B: 2,
        },
        alias2: [1, 2, 3],
      },
      template: {
        name: 'a template name',
        sampleKey1: {
          sampleSubKey1: 'a value',
        },
        sampleKey2: {
          sampleSubKey2: 'a value',
        },
      },
      createdBy: 1,
      updatedBy: 2,
    },
    {
      name: 'Application product',
      productKey: 'application_development',
      category: 'category',
      subCategory: 'category',
      icon: 'http://example.com/icon1.ico',
      brief: 'brief 1',
      details: 'details 1',
      aliases: {
        alias1: {
          subAlias1A: 1,
          subAlias1B: 2,
        },
        alias2: [1, 2, 3],
      },
      template: {
        name: 'a template name',
        sampleKey1: {
          sampleSubKey1: 'a value',
        },
        sampleKey2: {
          sampleSubKey2: 'a value',
        },
      },
      createdBy: 1,
      updatedBy: 2,
    },
  ], { returning: true }))
  // Product milestone templates
  .then(productTemplates => models.MilestoneTemplate.bulkCreate([
    {
      name: 'milestoneTemplate 1',
      duration: 3,
      type: 'type1',
      order: 1,
      reference: 'productTemplate',
      referenceId: productTemplates[0].id,
      metadata: {
        metadata1: {
          name: 'metadata 1',
          details: {
            anyDetails: 'any details 1',
          },
          others: ['others 11', 'others 12'],
        },
        metadata2: {
          name: 'metadata 2',
          details: {
            anyDetails: 'any details 2',
          },
          others: ['others 21', 'others 22'],
        },
      },
      activeText: 'activeText 1',
      completedText: 'completedText 1',
      blockedText: 'blockedText 1',
      plannedText: 'planned Text 1',
      createdBy: 1,
      updatedBy: 2,
    },
    {
      name: 'milestoneTemplate 2',
      duration: 4,
      type: 'type2',
      order: 2,
      metadata: {},
      reference: 'productTemplate',
      referenceId: productTemplates[0].id,
      activeText: 'activeText 2',
      completedText: 'completedText 2',
      blockedText: 'blockedText 2',
      plannedText: 'planned Text 2',
      createdBy: 2,
      updatedBy: 3,
    },
  ]))
  // Project phases
  .then(() => models.ProjectPhase.bulkCreate([
    {
      name: 'phase 1',
      projectId: 1,
      createdBy: 1,
      updatedBy: 2,
    },
    {
      name: 'phase 2',
      projectId: 1,
      createdBy: 2,
      updatedBy: 3,
    },
  ], { returning: true }))
  // Timelines
  .then(projectPhases => models.Timeline.bulkCreate([
    {
      name: 'timeline 1',
      startDate: '2018-05-01T00:00:00.000Z',
      reference: TIMELINE_REFERENCES.PROJECT,
      referenceId: projectPhases[0].projectId,
      createdBy: 1,
      updatedBy: 2,
    },
    {
      name: 'timeline 2',
      startDate: '2018-05-02T00:00:00.000Z',
      reference: TIMELINE_REFERENCES.PHASE,
      referenceId: projectPhases[0].id,
      createdBy: 2,
      updatedBy: 3,
    },
    {
      name: 'timeline 3',
      startDate: '2018-05-03T00:00:00.000Z',
      reference: TIMELINE_REFERENCES.PROJECT,
      referenceId: projectPhases[0].projectId,
      createdBy: 3,
      updatedBy: 4,
    },
    {
      name: 'timeline 4',
      startDate: '2018-05-04T00:00:00.000Z',
      reference: TIMELINE_REFERENCES.PROJECT,
      referenceId: 2,
      createdBy: 4,
      updatedBy: 5,
    },
  ], { returning: true }))
  // Milestones
  .then(timelines => models.Milestone.bulkCreate([
    {
      timelineId: timelines[0].id,
      name: 'milestone 1',
      duration: 2,
      startDate: '2018-05-03T00:00:00.000Z',
      status: 'open',
      type: 'type1',
      details: {
        detail1: {
          subDetail1A: 1,
          subDetail1B: 2,
        },
        detail2: [1, 2, 3],
      },
      order: 1,
      plannedText: 'plannedText 1',
      activeText: 'activeText 1',
      completedText: 'completedText 1',
      blockedText: 'blockedText 1',
      createdBy: 1,
      updatedBy: 2,
    },
    {
      timelineId: timelines[0].id,
      name: 'milestone 2',
      duration: 3,
      startDate: '2018-05-04T00:00:00.000Z',
      status: 'open',
      type: 'type2',
      order: 2,
      plannedText: 'plannedText 2',
      activeText: 'activeText 2',
      completedText: 'completedText 2',
      blockedText: 'blockedText 2',
      createdBy: 2,
      updatedBy: 3,
    },
    {
      timelineId: timelines[2].id,
      name: 'milestone 3',
      duration: 4,
      startDate: '2018-05-04T00:00:00.000Z',
      status: 'open',
      type: 'type3',
      order: 3,
      plannedText: 'plannedText 3',
      activeText: 'activeText 3',
      completedText: 'completedText 3',
      blockedText: 'blockedText 3',
      createdBy: 3,
      updatedBy: 4,
    },
  ]))
  .then(() => models.ProjectType.bulkCreate([
    {
      key: 'app_dev',
      displayName: 'Application development',
      createdBy: 1,
      updatedBy: 2,
      icon: 'http://example.com/icon1.ico',
      question: 'question 1',
      info: 'info 1',
      aliases: ['key-11', 'key_12'],
      metadata: {},
    },
    {
      key: 'generic',
      displayName: 'Generic',
      createdBy: 1,
      updatedBy: 2,
      icon: 'http://example.com/icon2.ico',
      question: 'question 2',
      info: 'info 2',
      aliases: ['key-21', 'key_22'],
      metadata: {},
    },
    {
      key: 'visual_prototype',
      displayName: 'Visual Prototype',
      createdBy: 1,
      updatedBy: 2,
      icon: 'http://example.com/icon3.ico',
      question: 'question 3',
      info: 'info 1',
      aliases: ['key-31', 'key_32'],
      metadata: {},
    },
    {
      key: 'visual_design',
      displayName: 'Visual Design',
      createdBy: 1,
      updatedBy: 2,
      icon: 'http://example.com/icon4.ico',
      question: 'question 4',
      info: 'info 4',
      aliases: ['key-41', 'key_42'],
      metadata: {},
    },
    {
      key: 'website',
      displayName: 'Website',
      createdBy: 1,
      updatedBy: 2,
      icon: 'http://example.com/icon5.ico',
      question: 'question 5',
      info: 'info 5',
      aliases: ['key-51', 'key_52'],
      metadata: {},
    },
    {
      key: 'app',
      displayName: 'Application',
      createdBy: 1,
      updatedBy: 2,
      icon: 'http://example.com/icon6.ico',
      question: 'question 6',
      info: 'info 6',
      aliases: ['key-61', 'key_62'],
      metadata: {},
    },
    {
      key: 'quality_assurance',
      displayName: 'Quality Assurance',
      createdBy: 1,
      updatedBy: 2,
      icon: 'http://example.com/icon7.ico',
      question: 'question 7',
      info: 'info 7',
      aliases: ['key-71', 'key_72'],
      metadata: {},
    },
    {
      key: 'chatbot',
      displayName: 'Chatbot',
      createdBy: 1,
      updatedBy: 2,
      icon: 'http://example.com/icon8.ico',
      question: 'question 8',
      info: 'info 8',
      aliases: ['key-81', 'key_82'],
      metadata: {},
    },
  ]))
  .then(() => models.ProductCategory.bulkCreate([
    {
      key: 'key1',
      displayName: 'displayName 1',
      icon: 'http://example.com/icon1.ico',
      question: 'question 1',
      info: 'info 1',
      aliases: ['key-11', 'key_12'],
      disabled: false,
      hidden: false,
      createdBy: 1,
      updatedBy: 1,
    },
    {
      key: 'key2',
      displayName: 'displayName 2',
      icon: 'http://example.com/icon2.ico',
      question: 'question 2',
      info: 'info 2',
      aliases: ['key-21', 'key_22'],
      createdBy: 1,
      updatedBy: 1,
    },
  ]))
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.log(err); // eslint-disable-line no-console
    process.exit(1);
  });
