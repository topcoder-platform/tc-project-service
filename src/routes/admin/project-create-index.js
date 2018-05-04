
/* globals Promise */

import _ from 'lodash';
import config from 'config';
import { middleware as tcMiddleware } from 'tc-core-library-js';
import util from '../../util';

/**
/**
 * API to handle retrieving a single project by id
 *
 * Permissions:
 * Only users that have access to the project can retrieve it.
 *
 */

// var permissions = require('tc-core-library-js').middleware.permissions
const permissions = tcMiddleware.permissions;
const ES_PROJECT_INDEX = config.get('elasticsearchConfig.indexName');
const ES_PROJECT_TYPE = config.get('elasticsearchConfig.docType');

/**
 * Get the request body for the specified index name
 * @private
 *
 * @param  {String}       indexName         the index name
 * @param  {String}       docType         document type
 * @return {Object}                         the request body for the specified index name
 */
function getRequestBody(indexName, docType) {
  const projectMapping = {
    _all: { enabled: false },
    properties: {
      actualPrice: {
        type: 'double',
      },
      attachments: {
        type: 'nested',
        properties: {
          category: {
            type: 'string',
            index: 'not_analyzed',
          },
          contentType: {
            type: 'string',
            index: 'not_analyzed',
          },
          createdAt: {
            type: 'date',
            format: 'strict_date_optional_time||epoch_millis',
          },
          createdBy: {
            type: 'integer',
          },
          description: {
            type: 'string',
          },
          filePath: {
            type: 'string',
          },
          id: {
            type: 'long',
          },
          projectId: {
            type: 'long',
          },
          size: {
            type: 'double',
          },
          title: {
            type: 'string',
          },
          updatedAt: {
            type: 'date',
            format: 'strict_date_optional_time||epoch_millis',
          },
          updatedBy: {
            type: 'integer',
          },
        },
      },
      billingAccountId: {
        type: 'long',
      },
      bookmarks: {
        type: 'nested',
        properties: {
          address: {
            type: 'string',
          },
          title: {
            type: 'string',
          },
        },
      },
      cancelReason: {
        type: 'string',
      },
      challengeEligibility: {
        type: 'nested',
        properties: {
          groups: {
            type: 'long',
          },
          role: {
            type: 'string',
            index: 'not_analyzed',
          },
          users: {
            type: 'long',
          },
        },
      },
      createdAt: {
        type: 'date',
        format: 'strict_date_optional_time||epoch_millis',
      },
      createdBy: {
        type: 'integer',
      },
      description: {
        type: 'string',
      },
      details: {
        type: 'nested',
        properties: {
          TBD_features: {
            type: 'nested',
            properties: {
              description: {
                type: 'string',
              },
              id: {
                type: 'integer',
              },
              isCustom: {
                type: 'boolean',
              },
              title: {
                type: 'string',
              },
            },
          },
          TBD_usageDescription: {
            type: 'string',
          },
          appDefinition: {
            properties: {
              goal: {
                properties: {
                  value: {
                    type: 'string',
                  },
                },
              },
              primaryTarget: {
                type: 'string',
              },
              users: {
                properties: {
                  value: {
                    type: 'string',
                  },
                },
              },
            },
          },
          hideDiscussions: {
            type: 'boolean',
          },
          products: {
            type: 'string',
          },
          summary: {
            type: 'string',
          },
          utm: {
            type: 'nested',
            properties: {
              code: {
                type: 'string',
              },
            },
          },
        },
      },
      directProjectId: {
        type: 'long',
      },
      estimatedPrice: {
        type: 'double',
      },
      external: {
        properties: {
          data: {
            type: 'string',
          },
          id: {
            type: 'string',
            index: 'not_analyzed',
          },
          type: {
            type: 'string',
            index: 'not_analyzed',
          },
        },
      },
      id: {
        type: 'long',
      },
      members: {
        type: 'nested',
        properties: {
          createdAt: {
            type: 'date',
            format: 'strict_date_optional_time||epoch_millis',
          },
          createdBy: {
            type: 'integer',
          },
          email: {
            type: 'string',
            index: 'not_analyzed',
          },
          firstName: {
            type: 'string',
          },
          handle: {
            type: 'string',
            index: 'not_analyzed',
          },
          id: {
            type: 'long',
          },
          isPrimary: {
            type: 'boolean',
          },
          lastName: {
            type: 'string',
          },
          projectId: {
            type: 'long',
          },
          role: {
            type: 'string',
            index: 'not_analyzed',
          },
          updatedAt: {
            type: 'date',
            format: 'strict_date_optional_time||epoch_millis',
          },
          updatedBy: {
            type: 'integer',
          },
          userId: {
            type: 'long',
          },
        },
      },
      name: {
        type: 'string',
      },
      status: {
        type: 'string',
        index: 'not_analyzed',
      },
      terms: {
        type: 'integer',
      },
      type: {
        type: 'string',
        index: 'not_analyzed',
      },
      updatedAt: {
        type: 'date',
        format: 'strict_date_optional_time||epoch_millis',
      },
      updatedBy: {
        type: 'integer',
      },
      utm: {
        properties: {
          campaign: {
            type: 'string',
          },
          medium: {
            type: 'string',
          },
          source: {
            type: 'string',
          },
        },
      },
    },
  };
  const result = {
    index: indexName,
    updateAllTypes: true,
    body: {
      mappings: { },
    },
  };
  result.body.mappings[docType] = projectMapping;
  return result;
}


module.exports = [
  permissions('project.admin'),
  /**
   * GET projects/{projectId}
   * Get a project by id
   */
  (req, res, next) => { // eslint-disable-line no-unused-vars
    const logger = req.log;
    logger.debug('Entered Admin#createIndex');
    const indexName = _.get(req, 'body.param.indexName', ES_PROJECT_INDEX);
    const docType = _.get(req, 'body.param.docType', ES_PROJECT_TYPE);
    logger.debug('indexName', indexName);
    logger.debug('docType', docType);

    const esClient = util.getElasticSearchClient();
    esClient.indices.create(getRequestBody(indexName, docType));
    res.status(200).json(util.wrapResponse(req.id, { message: 'Create index request successfully submitted' }));
  },
];
