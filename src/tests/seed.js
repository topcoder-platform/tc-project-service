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
    .then(() => {
      process.exit(0);
    })
    .catch(() => process.exit(1));
