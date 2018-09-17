import updateProjectActivity from './updateProjectActivity';
import { BUS_API_EVENT } from '../../constants';

// Mapping of Kafka topic and handler
export default {
  // Events defined by project-service
  [BUS_API_EVENT.PROJECT_UPDATED]: updateProjectActivity,
  [BUS_API_EVENT.PROJECT_FILES_UPDATED]: updateProjectActivity,
  [BUS_API_EVENT.PROJECT_TEAM_UPDATED]: updateProjectActivity,
  [BUS_API_EVENT.PROJECT_PLAN_UPDATED]: updateProjectActivity,
  // Events from message-service
  'notifications.connect.project.topic.created': updateProjectActivity,
  'notifications.connect.project.topic.updated': updateProjectActivity,
  'notifications.connect.project.post.created': updateProjectActivity,
  'notifications.connect.project.post.edited': updateProjectActivity,
};
