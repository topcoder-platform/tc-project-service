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
  [BUS_API_EVENT.TOPIC_CREATED]: updateProjectActivity,
  [BUS_API_EVENT.TOPIC_UPDATED]: updateProjectActivity,
  [BUS_API_EVENT.POST_CREATED]: updateProjectActivity,
  [BUS_API_EVENT.POST_UPDATED]: updateProjectActivity,
};
