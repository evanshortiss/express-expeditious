'use strict';

module.exports = function getCacheExpiryGenerator (opts) {

  /**
   * Get the expiry for a response. It might be just the default, but we also
   * support custom expiry length for certain status codes
   * @param  {String} statusCode
   * @return {Number}
   */
  return function getCacheExpiry (statusCode) {
    return (
      opts.statusCodeExpires && opts.statusCodeExpires[statusCode] ||
      opts.expeditious.getDefaultTtl()
    );
  };

};
