/* eslint-disable no-unused-expressions, no-await-in-loop, no-restricted-syntax */

import { expect } from 'chai';
import request from 'supertest';
import server from '../../app';
import { PROJECT_STATUS } from '../../constants';
import models from '../../models';
import testUtil from '../../tests/util';

describe('Project upgrade', () => {
  describe('POST /projects/:id/upgrade', () => {
    // v2 by default
    let project;
    let projectTemplate;
    let defaultProductTemplate;
    let matchingProductTemplate;
    let validBody;

    beforeEach(async () => {
      // mocks
      await testUtil.clearDb();
      const productId = 'application_development';
      project = await models.Project.create({
        type: 'generic',
        billingAccountId: 1,
        name: 'test1',
        description: 'test project1',
        icon: 'http://example.com/icon1.ico',
        question: 'question 1',
        info: 'info 1',
        aliases: [],
        status: 'draft',
        details: {
          name: 'a specific name',
          products: [productId],
          appDefinition: { budget: 10000 },
          testingNeeds: { hours: 10000 },
          appScreens: { screens: [{ name: 'a', desc: 'ad' }, { name: 'b', desc: 'bd' }] },
        },
        createdBy: 1,
        updatedBy: 1,
        lastActivityAt: 1,
        lastActivityUserId: '1',
        version: 'v2',
        directProjectId: 123,
        estimatedPrice: 15000,
        actualPrice: 18000,
      });
      projectTemplate = await models.ProjectTemplate.create({
        name: 'template 1',
        key: project.details.products[0],
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
              productKey: productId,
            }],
            details: {
              anyDetails: 'any details 1',
            },
            others: ['others 11', 'others 12'],
          },
          phase2: {
            name: 'phase 2',
            products: [{
              productKey: productId,
            }],
            details: {
              anyDetails: 'any details 2',
            },
            others: ['others 21', 'others 22'],
          },
        },
        createdBy: 1,
        updatedBy: 1,
      });
      [defaultProductTemplate, matchingProductTemplate] = await Promise.all([
        {},
        { productKey: productId },
      ].map(specific => models.ProductTemplate.create(Object.assign({
        name: 'name 1',
        productKey: 'a product key',
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
          sections: [
            {
              subSections: [
                { fieldName: 'details.name' },
                { type: 'questions', questions: [{ fieldName: 'details.appDefinition.budget' }] },
                { fieldName: 'details.testingNeeds.hours' },
              ],
            },
            {
              subSections: [
                {
                  fieldName: 'details.appScreens.screens',
                  type: 'screens',
                  questions: [{ fieldName: 'name' }, { fieldName: 'desc' }],
                },
              ],
            },
          ],
        },
        createdBy: 1,
        updatedBy: 2,
      }, specific))));
      validBody = {
        targetVersion: 'v3',
        defaultProductTemplateId: defaultProductTemplate.id,
      };
    });

    afterEach(async () => {
      await testUtil.clearDb();
    });

    it('should return 403 if user is not authenticated', async () => {
      await request(server)
        .post(`/v5/projects/${project.id}/upgrade`)
        .send(validBody)
        .expect(403);
    });

    it('should return 403 for non admin', async () => {
      await request(server)
        .post(`/v5/projects/${project.id}/upgrade`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send(validBody)
        .expect(403);
    });

    it('should return 500 when a project doesn\'t have a valid product id', async () => {
      // since the product id is extracted from 'details.products', clearing that should trigger this error
      await project.update({ details: {} });
      await request(server)
        .post(`/v5/projects/${project.id}/upgrade`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(validBody)
        .expect(500);
    });

    it('should return 500 when a product template couldn\'t be found by productKey', async () => {
      // by changing this we cause no matching product template to be found
      await matchingProductTemplate.update({ productKey: 'non matching product key' });
      await request(server)
        .post(`/v5/projects/${project.id}/upgrade`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(validBody)
        .expect(500);
    });

    it('should return 500 when a product template couldn\'t be found by defaultProductTemplateId', async () => {
      // by changing this the default product template id will be used
      await projectTemplate.update({ phases: { nonMatchingPhase1: { products: ['non existing product'] } } });
      // and we simulate a non existing one
      validBody.defaultProductTemplateId += 1000;
      await request(server)
        .post(`/v5/projects/${project.id}/upgrade`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(validBody)
        .expect(500);
    });

    it('should return 400 if the project was already migrated', async () => {
      // simulate an already migrated project
      await project.update({ version: 'v3' });
      await request(server)
        .post(`/v5/projects/${project.id}/upgrade`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(validBody)
        .expect(400);
    });

    it('should return 400 if there\'s no migration handler for the sent target version', async () => {
      validBody.targetVersion = 'v4';
      await request(server)
        .post(`/v5/projects/${project.id}/upgrade`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(validBody)
        .expect(400);
    });

    it('should return 404 if the project does not exist', async () => {
      // simulate an already migrated project
      await project.update({ version: 'v3' });
      await request(server)
        .post(`/v5/projects/${project.id + 1}/upgrade`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.admin}`,
        })
        .send(validBody)
        .expect(404);
    });

    [true, false].forEach((useDefault) => {
      describe(useDefault ? 'when using the default product template id' :
        'when using the matching product template by productKey', () => {
        let productTemplate;

        beforeEach(async () => {
          productTemplate = matchingProductTemplate;
          if (useDefault) {
            // by changing this the default product template id will be used
            await projectTemplate.update({
              phases: {
                nonMatchingPhase1: { name: 'phase 1', products: ['non_existing'] },
                nonMatchingPhase2: { name: 'phase 2', products: ['non_existing'] },
              },
            });
            productTemplate = defaultProductTemplate;
          }
        });

        const commonTest = async (testCompleted, completedOnDate, additionalPhaseName) => {
          const migratedProject = await models.Project.findOne({ id: project.id });
          expect(migratedProject.version).to.equal('v3');
          expect(migratedProject.templateId).to.equal(projectTemplate.id);
          const newProjectPhases = await models.ProjectPhase.findAll({
            where: { projectId: project.id },
          });
          for (const newProjectPhase of newProjectPhases) {
            expect(newProjectPhase).to.exist;
            expect(newProjectPhase.name).to.be.oneOf(['phase 1', 'phase 2'].concat(additionalPhaseName || []));
            expect(newProjectPhase.status).to.equal(project.status);
            expect(newProjectPhase.startDate).to.deep.equal(project.createdAt);
            expect(newProjectPhase.budget).to.equal(project.details.appDefinition.budget);
            expect(newProjectPhase.details).to.equal(null);
            if (testCompleted) {
              expect(newProjectPhase.status).to.equal(PROJECT_STATUS.COMPLETED);
              expect(newProjectPhase.progress).to.equal(100);
              expect(newProjectPhase.endDate).to.deep.equal(completedOnDate);
            } else {
              expect(newProjectPhase.progress).to.equal(0);
              expect(newProjectPhase.endDate).to.equal(null);
            }
            const newPhaseProducts = await models.PhaseProduct.findAll({ where:
              { phaseId: newProjectPhase.id },
            });
            for (const newPhaseProduct of newPhaseProducts) {
              expect(newPhaseProduct).to.exist;
              expect(newPhaseProduct.projectId).to.equal(project.id);
              expect(newPhaseProduct.templateId).to.equal(productTemplate.id);
              expect(newPhaseProduct.directProjectId).to.equal(project.directProjectId);
              expect(newPhaseProduct.billingAccountId).to.equal(project.billingAccountId);
              expect(newPhaseProduct.name).to.equal(productTemplate.name);
              expect(newPhaseProduct.type).to.equal(productTemplate.productKey);
              expect(newPhaseProduct.estimatedPrice).to.equal(parseInt(project.estimatedPrice, 10));
              expect(newPhaseProduct.actualPrice).to.equal(parseInt(project.actualPrice, 10));
              expect(newPhaseProduct.details).to.deep.equal({
                name: 'a specific name',
                appDefinition: { budget: 10000 },
                testingNeeds: { hours: 10000 },
                appScreens: { screens: [{ name: 'a', desc: 'ad' }, { name: 'b', desc: 'bd' }] },
              });
            }
          }
        };

        it('should migrate a non completed project to the expected state', async () => {
          await request(server)
            .post(`/v5/projects/${project.id}/upgrade`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .send(validBody)
            .expect(200);
          await commonTest();
        });

        it('should migrate a completed project to the expected state', async () => {
          await project.update({ status: PROJECT_STATUS.COMPLETED });
          const millisInADay = 1000 * 60 * 60 * 24;
          const dbNow = Math.floor(Date.now() / 1000) * 1000;

          // simulate multiple completed statuses so we can test the set endDate is the latest
          await models.ProjectHistory.create({
            projectId: project.id,
            status: PROJECT_STATUS.COMPLETED,
            updatedBy: 1,
            // 10 days ago
            createdAt: new Date(dbNow - (millisInADay * 10)),
          });
          const yesterday = new Date(dbNow - millisInADay);
          await models.ProjectHistory.create({
            projectId: project.id,
            status: PROJECT_STATUS.COMPLETED,
            updatedBy: 1,
            // yesterday
            createdAt: yesterday,
          });
          await request(server)
            .post(`/v5/projects/${project.id}/upgrade`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .send(validBody)
            .expect(200);
          await commonTest(true, yesterday);
        });

        it('should migrate a project and assign the phase name passed in the parameters', async () => {
          validBody.phaseName = 'A custom phase name';
          await request(server)
            .post(`/v5/projects/${project.id}/upgrade`)
            .set({
              Authorization: `Bearer ${testUtil.jwts.admin}`,
            })
            .send(validBody)
            .expect(200);
          await commonTest(false, null, 'A custom phase name');
        });
      });
    });
  });
});
