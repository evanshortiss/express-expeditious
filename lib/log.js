'use strict';

var log = require('debug')(
  'express-expeditious'
);

/**
 * Generates a log function that will always prepend "$METHOD $URL"
 * @param  {IncomingRequest} req
 * @return {Function}
 */
module.exports = function (req) {
  return function _log () {
    var str = req.method + ' ' + req.originalUrl
      , args = Array.prototype.slice.call(arguments);

    args[0] = str += ' - ' + args[0];

    log.apply(log, args);
  };
};
