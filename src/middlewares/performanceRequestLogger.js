import coreLib from 'tc-core-library-js';

module.exports = function logRequest(logger) {
  if (!logger) {
    throw new Error('Logger must be provided')
  }

  // Use the logger from core lib for non-dev environment
  if (process.env.NODE_ENV.toLowerCase() !== 'development') {
    return coreLib.middleware.logger(null, logger);
  }

  // Use the logger with memory usage info
  return (req, res, next) => {
    var startOpts = {
      method: req.method,
      url: req.url,
    };
    // Create a per-request child
    req.log = res.log = logger.child({ requestId: req.id });
    req.log.info('start request', startOpts);
    const time = process.hrtime();
    res.on('finish', function responseSent() {
      const diff = process.hrtime(time);
      res.log.info('end request', {
        method: startOpts.method,
        url: startOpts.url,
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        duration: diff[0] * 1e3 + diff[1] * 1e-6,
        heapUsed: process.memoryUsage().heapUsed
      });
    });

    next();
  };
};
