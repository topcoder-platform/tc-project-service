import { USER_ROLE } from '../../constants';
import models from '../../models';
import util from '../../util';

module.exports = [
  (req, res, next) => {
    const { id } = req.params;
    if (!id || isNaN(id)) {
      return util.handleError('Invalid opportunity ID', null, req, next, 400);
    }

    const isAdminOrManager = util.hasRoles(req, [USER_ROLE.CONNECT_ADMIN, USER_ROLE.TOPCODER_ADMIN, USER_ROLE.PROJECT_MANAGER]);
    return models.CopilotOpportunity.findOne({
      where: { id },
      include: isAdminOrManager ? [
        {
          model: models.CopilotRequest,
          as: 'copilotRequest',
        },
        {
          model: models.Project,
          as: 'project',
          attributes: ['name'],
          include: [
            {
              model: models.ProjectMember,
              as: 'members',
              attributes: ['id', 'userId', 'role'],
            },
          ]
        },
      ]: [
        {
          model: models.CopilotRequest,
          as: 'copilotRequest',
        },
      ],
    })
      .then((copilotOpportunity) => {
        const plainOpportunity = copilotOpportunity.get({ plain: true });
        const memberIds = (plainOpportunity.project && plainOpportunity.project.members && plainOpportunity.project.members.map((member) => member.userId)) || [];
        let canApplyAsCopilot = false;
        if (req.authUser) {
          canApplyAsCopilot = !memberIds.includes(req.authUser.userId)
        }
        if (plainOpportunity.project) {
          // This shouldn't be exposed to the clientside
          delete plainOpportunity.project.members;
        }
        const formattedOpportunity = Object.assign({
          members: memberIds,
          canApplyAsCopilot,
        }, plainOpportunity,
          plainOpportunity.copilotRequest ? plainOpportunity.copilotRequest.data : {},
          { copilotRequest: undefined },
        );
        if (!isAdminOrManager) {
          delete formattedOpportunity.projectId;
        }
        res.json(formattedOpportunity);
      })
      .catch((err) => {
        util.handleError('Error fetching copilot opportunity', err, req, next);
      });
  },
];
