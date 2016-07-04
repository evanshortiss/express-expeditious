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
    } else {
      return req.method + ' - ' + req.originalUrl;
    }
  };
};
