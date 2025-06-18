import models from '../../models';
import util from '../../util';

module.exports = [
  (req, res, next) => {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return util.handleError('Invalid opportunity ID', null, req, next, 400);
    }

    return models.CopilotOpportunity.findOne({
      where: { id },
      include: [
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
      ],
    })
      .then((copilotOpportunity) => {
        const plainOpportunity = copilotOpportunity.get({ plain: true });
        let canApplyAsCopilot = false;
        if (plainOpportunity && plainOpportunity.project && plainOpportunity.project.members && req.authUser) {
          const existingMember = plainOpportunity.project.members.find(item => item.userId === req.authUser.userId);
          canApplyAsCopilot = !!!existingMember;
        }
        // This shouldn't be exposed to the clientside
        delete plainOpportunity.project.members;
        const formattedOpportunity = Object.assign({
          canApplyAsCopilot,
        }, plainOpportunity,
          plainOpportunity.copilotRequest ? plainOpportunity.copilotRequest.data : {},
          { copilotRequest: undefined },
        );
        res.json(formattedOpportunity);
      })
      .catch((err) => {
        util.handleError('Error fetching copilot opportunity', err, req, next);
      });
  },
];
