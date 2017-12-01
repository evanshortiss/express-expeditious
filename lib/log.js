'use strict'

const log = require('debug')(
  'express-expeditious'
)

/**
 * Generates a log function that will always prepend "$METHOD $URL", for example
 * a log might be "GET /users/102342 - etag did not match"
 * @param  {IncomingRequest} req
 * @return {Function}
 */
module.exports = function (req) {
  return function _log () {
    if (log.enabled) { // don't waste cycles needlessly with below logic
      var str = req.method + ' ' + req.originalUrl
      var args = Array.prototype.slice.call(arguments)

      args[0] = str += ' - ' + args[0]

      log.apply(log, args)
    }
  }
}
