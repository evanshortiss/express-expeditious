'use strict';

module.exports = function getCacheExpiryGenerator (opts) {

  /**
   * Get the expiry for a response. It might be just the default, but we also
   * support custom expiry length for certain status codes.
   *
   * By default a non 200 status is not cached (return 0)
   *
   * @param  {String} statusCode
   * @return {Number}
   */
  return function getCacheExpiry (statusCode) {
    if (statusCode === 200) {
      return (
        opts.statusCodeExpires && opts.statusCodeExpires[statusCode] ||
        opts.expeditious.getDefaultTtl()
      );
    } else {
      return opts.statusCodeExpires &&
        opts.statusCodeExpires[statusCode] ||
        0;
    }
  };

};
