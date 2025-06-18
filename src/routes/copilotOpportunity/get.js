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
          attributes: ['name', 'members'],
        },
      ],
    })
      .then((copilotOpportunity) => {
        const plainOpportunity = copilotOpportunity.get({ plain: true });
        const formattedOpportunity = Object.assign({}, plainOpportunity,
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
