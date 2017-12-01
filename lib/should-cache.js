'use strict'

/**
 * Determines if the current request is a candidate for caching.
 * By default only GET requests will be cached.
 * @param  {IncomingRequest} req
 * @return {Boolean}
 */
module.exports = function getShouldCache (opts) {
  var customCache = opts.shouldCache

  return function shouldCache (req) {
    if (customCache) {
      // Developer wants to override default caching rules
      return customCache(req)
    } else {
      // Default behaviour is to cache on GET requests only
      return req.method.toUpperCase() === 'GET'
    }
  }
}
