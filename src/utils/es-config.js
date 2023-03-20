import config from 'config';

const ES_PROJECT_INDEX = config.get('elasticsearchConfig.indexName');
const ES_TIMELINE_INDEX = config.get('elasticsearchConfig.timelineIndexName');
const ES_METADATA_INDEX = config.get('elasticsearchConfig.metadataIndexName');
const ES_CUSTOMER_PAYMENT_INDEX = config.get(
  'elasticsearchConfig.customerPaymentIndexName',
);

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
                      type: 'text',
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
  properties: {
    actualPrice: {
      type: 'double',
    },
    attachments: {
      type: 'nested',
      properties: {
        category: {
          type: 'text',
        },
        contentType: {
          type: 'text',
        },
        createdAt: {
          type: 'date',
          format: 'strict_date_optional_time||epoch_millis',
        },
        createdBy: {
          type: 'integer',
        },
        description: {
          type: 'text',
        },
        path: {
          type: 'text',
        },
        type: {
          type: 'text',
        },
        tags: {
          type: 'text',
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
          type: 'text',
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
          type: 'text',
        },
        title: {
          type: 'text',
        },
      },
    },
    cancelReason: {
      type: 'text',
    },
    challengeEligibility: {
      type: 'nested',
      properties: {
        groups: {
          type: 'long',
        },
        role: {
          type: 'text',
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
      type: 'text',
    },
    details: {
      type: 'nested',
      properties: {
        TBD_features: {
          type: 'nested',
          properties: {
            description: {
              type: 'text',
            },
            id: {
              type: 'integer',
            },
            isCustom: {
              type: 'boolean',
            },
            title: {
              type: 'text',
            },
          },
        },
        TBD_usageDescription: {
          type: 'text',
        },
        appDefinition: {
          properties: {
            goal: {
              properties: {
                value: {
                  type: 'text',
                },
              },
            },
            primaryTarget: {
              type: 'text',
            },
            users: {
              properties: {
                value: {
                  type: 'text',
                },
              },
            },
          },
        },
        hideDiscussions: {
          type: 'boolean',
        },
        products: {
          type: 'text',
        },
        summary: {
          type: 'text',
        },
        utm: {
          type: 'nested',
          properties: {
            code: {
              type: 'text',
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
          type: 'text',
        },
        id: {
          type: 'text',
        },
        type: {
          type: 'text',
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
          type: 'text',
        },
        firstName: {
          type: 'text',
        },
        handle: {
          type: 'text',
        },
        id: {
          type: 'long',
        },
        isPrimary: {
          type: 'boolean',
        },
        lastName: {
          type: 'text',
        },
        projectId: {
          type: 'long',
        },
        role: {
          type: 'text',
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
          type: 'keyword',
        },
        id: {
          type: 'long',
        },
        role: {
          type: 'keyword',
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
      type: 'text',
    },
    status: {
      type: 'keyword',
    },
    terms: {
      type: 'keyword',
    },
    groups: {
      type: 'keyword',
    },
    type: {
      type: 'keyword',
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
      type: 'text',
    },
    utm: {
      properties: {
        campaign: {
          type: 'keyword',
        },
        medium: {
          type: 'keyword',
        },
        source: {
          type: 'keyword',
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
 * 'customerPayment' index mapping
 */
MAPPINGS[ES_CUSTOMER_PAYMENT_INDEX] = {
  properties: {
    id: {
      type: 'long',
    },
    reference: {
      type: 'text',
    },
    referenceId: {
      type: 'keyword',
    },
    amount: {
      type: 'long',
    },
    currency: {
      type: 'text',
    },
    paymentIntentId: {
      type: 'text',
    },
    clientSecret: {
      type: 'text',
    },
    status: {
      type: 'text',
    },
    createdAt: {
      type: 'date',
      format: 'strict_date_optional_time||epoch_millis',
    },
    createdBy: {
      type: 'integer',
    },
    updatedAt: {
      type: 'date',
      format: 'strict_date_optional_time||epoch_millis',
    },
    updatedBy: {
      type: 'integer',
    },
  },
};

/**
 * 'metadata' index mapping
 */
MAPPINGS[ES_METADATA_INDEX] = {
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
          type: 'keyword',
        },
        category: {
          type: 'keyword',
        },
        name: {
          type: 'text',
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
          type: 'keyword',
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
          type: 'text',
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
          type: 'text',
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
          type: 'text',
        },
        configName: {
          type: 'text',
        },
        configValue: {
          type: 'text',
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
          type: 'text',
        },
        template: formConfig,
        productKey: {
          type: 'text',
        },
        category: {
          type: 'text',
        },
        subCategory: {
          type: 'text',
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
          type: 'text',
        },
        key: {
          type: 'text',
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
          type: 'text',
        },
        key: {
          type: 'text',
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
          type: 'text',
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
          type: 'text',
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

module.exports = {
  MAPPINGS,
};
