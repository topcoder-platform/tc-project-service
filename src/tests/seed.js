import models from '../models';

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
    }, {
      type: 'visual_design',
      billingAccountId: 3,
      name: 'test2',
      description: 'completed project without copilot',
      status: 'completed',
      details: {},
      createdBy: 1,
      updatedBy: 1,
    }, {
      type: 'generic',
      billingAccountId: 4,
      name: 'test2',
      description: 'draft project without copilot',
      status: 'draft',
      details: {},
      createdBy: 1,
      updatedBy: 1,
    }, {
      type: 'generic',
      billingAccountId: 5,
      name: 'test2',
      description: 'active project without copilot',
      status: 'active',
      details: {},
      createdBy: 1,
      updatedBy: 1,
    }]))
  .then(() => models.Project.findAll())
  .then((projects) => {
    const project1 = projects[0];
    const project2 = projects[1];
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
  ]))
  .then(() => models.ProductTemplate.bulkCreate([
    {
      name: 'name 1',
      productKey: 'productKey 1',
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
      icon: 'http://example.com/icon2.ico',
      brief: 'brief 2',
      details: 'details 2',
      aliases: {},
      template: {},
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
    },
    {
      key: 'generic',
      displayName: 'Generic',
      createdBy: 1,
      updatedBy: 2,
    },
    {
      key: 'visual_prototype',
      displayName: 'Visual Prototype',
      createdBy: 1,
      updatedBy: 2,
    },
    {
      key: 'visual_design',
      displayName: 'Visual Design',
      createdBy: 1,
      updatedBy: 2,
    },
    {
      key: 'website',
      displayName: 'Website',
      createdBy: 1,
      updatedBy: 2,
    },
    {
      key: 'app',
      displayName: 'Application',
      createdBy: 1,
      updatedBy: 2,
    },
    {
      key: 'quality_assurance',
      displayName: 'Quality Assurance',
      createdBy: 1,
      updatedBy: 2,
    },
    {
      key: 'chatbot',
      displayName: 'Chatbot',
      createdBy: 1,
      updatedBy: 2,
    },
  ]))
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.log(err); // eslint-disable-line no-console
    process.exit(1);
  });
