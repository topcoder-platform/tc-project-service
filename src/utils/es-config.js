import config from 'config';

const ES_PROJECT_INDEX = config.get('elasticsearchConfig.indexName');
const ES_PROJECT_TYPE = config.get('elasticsearchConfig.docType');
const ES_TIMELINE_INDEX = config.get('elasticsearchConfig.timelineIndexName');
const ES_TIMELINE_TYPE = config.get('elasticsearchConfig.timelineDocType');
const ES_METADATA_INDEX = config.get('elasticsearchConfig.metadataIndexName');
const ES_METADATA_TYPE = config.get('elasticsearchConfig.metadataDocType');

// form config can be present inside 3 models, so we reuse it
const formConfig = {
  type: 'object',
  properties: {
    sections: {
      type: 'nested',
      properties: {
        subSections: {
          type: 'nested',
          properties: {
            questions: {
              type: 'nested',
              properties: {
                options: {
                  type: 'nested',
                  properties: {
                    value: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

const MAPPINGS = {};

/**
 * 'project' index mapping
 */
MAPPINGS[ES_PROJECT_INDEX] = {
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
        path: {
          type: 'string',
        },
        type: {
          type: 'string',
        },
        tags: {
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
    invites: {
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
        id: {
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
        projectId: {
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
      type: 'string',
    },
    groups: {
      type: 'string',
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
    lastActivityAt: {
      type: 'date',
      format: 'strict_date_optional_time||epoch_millis',
    },
    lastActivityUserId: {
      type: 'string',
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
    phases: {
      type: 'nested',
      dynamic: true,
    },
  },
};

/**
 * 'timeline' index mapping
 */
MAPPINGS[ES_TIMELINE_INDEX] = {
  _all: { enabled: false },
  properties: {
    milestones: {
      type: 'nested',
      properties: {
        id: {
          type: 'long',
        },
        timelineId: {
          type: 'long',
        },
      },
    },
  },
};

/**
 * 'metadata' index mapping
 */
MAPPINGS[ES_METADATA_INDEX] = {
  _all: { enabled: false },
  properties: {
    projectTemplates: {
      type: 'nested',
      properties: {
        createdAt: {
          type: 'date',
          format: 'strict_date_optional_time||epoch_millis',
        },
        createdBy: {
          type: 'integer',
        },
        key: {
          type: 'string',
          index: 'not_analyzed',
        },
        category: {
          type: 'string',
          index: 'not_analyzed',
        },
        name: {
          type: 'string',
        },
        id: {
          type: 'long',
        },
        scope: formConfig,
        form: {
          type: 'object',
        },
        priceConfig: {
          type: 'object',
        },
        planConfig: {
          type: 'object',
        },
        phases: {
          type: 'object',
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
    forms: {
      type: 'nested',
      properties: {
        createdAt: {
          type: 'date',
          format: 'strict_date_optional_time||epoch_millis',
        },
        createdBy: {
          type: 'integer',
        },
        key: {
          type: 'string',
          index: 'not_analyzed',
        },
        config: formConfig,
        version: {
          type: 'integer',
        },
        revision: {
          type: 'integer',
        },
        id: {
          type: 'long',
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

    planConfigs: {
      type: 'nested',
      properties: {
        createdAt: {
          type: 'date',
          format: 'strict_date_optional_time||epoch_millis',
        },
        createdBy: {
          type: 'integer',
        },
        key: {
          type: 'string',
          index: 'not_analyzed',
        },
        version: {
          type: 'integer',
        },
        revision: {
          type: 'integer',
        },
        id: {
          type: 'long',
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

    priceConfigs: {
      type: 'nested',
      properties: {
        createdAt: {
          type: 'date',
          format: 'strict_date_optional_time||epoch_millis',
        },
        createdBy: {
          type: 'integer',
        },
        key: {
          type: 'string',
          index: 'not_analyzed',
        },
        version: {
          type: 'integer',
        },
        revision: {
          type: 'integer',
        },
        id: {
          type: 'long',
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

    orgConfigs: {
      type: 'nested',
      properties: {
        createdAt: {
          type: 'date',
          format: 'strict_date_optional_time||epoch_millis',
        },
        createdBy: {
          type: 'integer',
        },
        orgId: {
          type: 'string',
          index: 'not_analyzed',
        },
        configName: {
          type: 'string',
          index: 'not_analyzed',
        },
        configValue: {
          type: 'string',
        },
        id: {
          type: 'long',
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

    productTemplates: {
      type: 'nested',
      properties: {
        createdAt: {
          type: 'date',
          format: 'strict_date_optional_time||epoch_millis',
        },
        createdBy: {
          type: 'integer',
        },
        name: {
          type: 'string',
        },
        template: formConfig,
        productKey: {
          type: 'string',
          index: 'not_analyzed',
        },
        category: {
          type: 'string',
        },
        subCategory: {
          type: 'string',
          index: 'not_analyzed',
        },
        id: {
          type: 'long',
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

    projectTypes: {
      type: 'nested',
      properties: {
        createdAt: {
          type: 'date',
          format: 'strict_date_optional_time||epoch_millis',
        },
        createdBy: {
          type: 'integer',
        },
        displayName: {
          type: 'string',
        },
        key: {
          type: 'string',
          index: 'not_analyzed',
        },
        id: {
          type: 'long',
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

    productCategories: {
      type: 'nested',
      properties: {
        createdAt: {
          type: 'date',
          format: 'strict_date_optional_time||epoch_millis',
        },
        createdBy: {
          type: 'integer',
        },
        displayName: {
          type: 'string',
        },
        key: {
          type: 'string',
          index: 'not_analyzed',
        },
        id: {
          type: 'long',
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

    buildingBlocks: {
      type: 'nested',
      properties: {
        createdAt: {
          type: 'date',
          format: 'strict_date_optional_time||epoch_millis',
        },
        createdBy: {
          type: 'integer',
        },
        key: {
          type: 'string',
          index: 'not_analyzed',
        },
        id: {
          type: 'long',
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

    milestoneTemplates: {
      type: 'nested',
      properties: {
        referenceId: {
          type: 'long',
        },
        reference: {
          type: 'string',
          index: 'not_analyzed',
        },
        id: {
          type: 'long',
        },
        order: {
          type: 'long',
        },
      },
    },
  },
};

// mapping between indexes and their docTypes
const INDEX_TO_DOC_TYPE = {};
INDEX_TO_DOC_TYPE[ES_PROJECT_INDEX] = ES_PROJECT_TYPE;
INDEX_TO_DOC_TYPE[ES_TIMELINE_INDEX] = ES_TIMELINE_TYPE;
INDEX_TO_DOC_TYPE[ES_METADATA_INDEX] = ES_METADATA_TYPE;

module.exports = {
  MAPPINGS,
  INDEX_TO_DOC_TYPE,
};
