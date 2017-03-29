module.exports = function def(req, res, next) {
  if (req.method === 'POST' && req.url === '/authorizations/') {
    const resp = {
      id: '1',
      result: {
        success: true,
        status: 200,
        metadata: null,
        content: {
          id: '477949215',
          modifiedBy: null,
          modifiedAt: null,
          createdBy: null,
          createdAt: null,
          token: 'token',
          refreshToken: null,
          target: '1',
          externalToken: null,
          zendeskJwt: null,
        },
      },
      version: 'v3',
    };
    res.send(resp);
  } else {
    next();
  }
};
