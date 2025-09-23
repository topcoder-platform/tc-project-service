import { COPILOT_OPPORTUNITY_TYPE } from "../constants";

export const getCopilotTypeLabel = (type) => {
  switch (type) {
    case COPILOT_OPPORTUNITY_TYPE.AI:
      return 'AI';
    case COPILOT_OPPORTUNITY_TYPE.DATA_SCIENCE:
      return "Data Science";
    case COPILOT_OPPORTUNITY_TYPE.DESIGN:
      return "Design";
    case COPILOT_OPPORTUNITY_TYPE.DEV:
      return "Development";
    default:
      return "Quality Assurance";
  }
};
