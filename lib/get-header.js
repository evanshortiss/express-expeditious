'use strict';

/**
 * Get a header from the header list, e.g
 * ['X-Powered-By', 'Express', 'ETag', 'W/"c8-j36pDBD4000wLNnKKK96Dg"']
 * @param  {Array}  headers
 * @param  {String} name
 * @return {String|null}
 */
module.exports = function getHeader (headers, name) {
  for (var i = 0; i < headers.length; i += 2) {
    if (headers[i].toLowerCase() === name.toLowerCase()) {
      return headers[i + 1];
    }
  }

  return null;
};
