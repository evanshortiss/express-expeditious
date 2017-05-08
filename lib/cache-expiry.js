'use strict';

module.exports = function getCacheExpiryGenerator (opts) {

  /**
   * Get the expiry for a response. It might be just the default, but we also
   * support custom expiry length for certain status codes.
   *
   * By default non 200/304 status is not cached (return 0)
   *
   * @param  {String} statusCode
   * @return {Number}
   */
  return function getCacheExpiry (statusCode) {
    // 304 should be cached since it represents a valid response
    if (statusCode === 200 || statusCode === 304) {
      return (
        opts.statusCodeExpires && opts.statusCodeExpires[statusCode] ||
        opts.defaultTtl || opts.expeditious.getDefaultTtl()
      );
    } else {
      return opts.statusCodeExpires && opts.statusCodeExpires[statusCode] || 0;
    }
  };

};
