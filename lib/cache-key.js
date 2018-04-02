'use strict'

module.exports = function getCacheKeyGenerator (opts) {
  /**
   * Generate the key to use for caching this request
   * @param  {IncomingRequest} req
   * @param  {OutgoingResponse} res
   * @return {String}
   */
  return function genCacheKey (req, res) {
    if (opts.genCacheKey) {
      return opts.genCacheKey(req, res)
    } else {
      const etag = res.finished
        ? res.get('etag') : req.headers['if-none-match']

      const etagStr = etag ? '-' + etag : ''

      const sessionStr = req.session && opts.sessionAware
        ? '-' + req.session.id : ''

      // sample key - 'GET-/users-SESSIONID-W/"4c97-lSwvAgbf6V5Uri654ggmHQ"'
      return req.method + '-' + req.originalUrl + sessionStr + etagStr
    }
  }
}
