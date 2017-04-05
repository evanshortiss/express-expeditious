'use strict';

module.exports = function getCacheKeyGenerator (opts) {

  /**
   * Generate the key to use for caching this request
   * @param  {IncomingRequest} req
   * @return {String}
   */
  return function genCacheKey (req) {
    if (opts.genCacheKey) {
      return opts.genCacheKey(req);
    } else if (req.session) {
      // We need to account for sessions to prevent data leaks
      return req.method + '-' + req.session.id + '-' + req.originalUrl;
    } else {
      return req.method + '-' + req.originalUrl;
    }
  };
};
