import Analytics from 'analytics-node'
import {
  EVENT,
  PROJECT_STATUS
} from '../constants'
import 'config'
import _ from 'lodash'

const PROJECT_CREATED = 'Project Created'
const PROJECT_SUBMITTED = 'Project Submitted'
const PROJECT_REVIEWED = 'Project Reviewed'
const PROJECT_ACTIVATED = 'Project Acvtivated'
const PROJECT_COMPLETED = 'Project Completed'
const PROJECT_CANCELED = 'Project Canceled'
const PROJECT_DELETED = 'Project Deleted'
const PROJECT_PAUSED = 'Project Paused'
const PROJECT_SPEC_UPDATED = 'Project Spec Updated'
const PROJECT_MEMBER_ADDED = 'Project Member Added'
const PROJECT_MEMBER_REMOVED = 'Project Member Removed'

const mapEventTypes = {
  [PROJECT_STATUS.DRAFT]: PROJECT_CREATED,
  [PROJECT_STATUS.IN_REVIEW]: PROJECT_SUBMITTED,
  [PROJECT_STATUS.REVIEWED]: PROJECT_REVIEWED,
  [PROJECT_STATUS.ACTIVE]: PROJECT_ACTIVATED,
  [PROJECT_STATUS.COMPLETED]: PROJECT_COMPLETED,
  [PROJECT_STATUS.CANCELLED]: PROJECT_CANCELED,
  [PROJECT_STATUS.PAUSED]: PROJECT_PAUSED
}

module.exports = (analyticsKey, app, logger) => {

  // Initialize analytics
  const analytics = analyticsKey ? new Analytics(analyticsKey) : null

  /**
   * Invokes analytics track and attaches additional props
   * @param  {Object} req       Http request
   * @param  {String} eventType analytics event
   * @param  {Object} props    properties to track
   */
  const track = (req, eventType, props) => {
    if (analytics) {
      const userId = _.get(req, 'authUser.userId', 'system').toString()
      // add referrer ?
      const _props = _.assign({}, { referrer: req.get('Referer') }, props)
      const data = {
        userId,
        event: eventType,
        properties: _props
      }
      req.log.debug('Analytics tracking:', data)
      analytics.track(data)
    }

  }

  app.on(EVENT.ROUTING_KEY.PROJECT_DRAFT_CREATED, ({req, project}) => {
    track(req, PROJECT_CREATED, {
      id: project.id,
      name: project.name,
      type: project.type,
      products: _.get(project, 'products', [])
    })
  })

  app.on(EVENT.ROUTING_KEY.PROJECT_DELETED, ({req, id}) => {
    track(req, PROJECT_CREATED, { id })
  })

  app.on(EVENT.ROUTING_KEY.PROJECT_UPDATED, ({req, original, updated }) => {
    // determine what changed
    let eventType
    if (original.status !== updated.status) {
      // status was changed
      eventType = mapEventTypes[updated.status]
    } else if (!_.isEqual(original.details, updated.details)) {
      // specifications updated
      eventType = PROJECT_SPEC_UPDATED
    }
    if (eventType) {
      track(req, eventType, {
        id: updated.id,
        name: updated.name,
        type: updated.type,
        products: _.get(updated, 'products', [])
      })
    }

  })


  app.on(EVENT.ROUTING_KEY.PROJECT_MEMBER_ADDED, ({req, member}) => {
    track(req, PROJECT_MEMBER_ADDED, { role: member.role })
  })

  app.on(EVENT.ROUTING_KEY.PROJECT_MEMBER_REMOVED, ({req, member}) => {
    track(req, PROJECT_MEMBER_REMOVED, { role: member.role })
  })

}
