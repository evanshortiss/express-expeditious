'use strict';

var moment = require('moment');

/**
 * When responding from the cache we need to update the date header to
 * reflect the correct response time
 * @param  {String} response
 * @return {String}
 */
module.exports = function replaceDateHeader (httpResponse) {
  var replacer = httpResponse.match(/Date:(.*?)[A-Z]{3}/);

  if (replacer) {
    // TODO: Testing! Could have timezone issues? Is it safe to force UTC?
    return httpResponse.replace(
      replacer[0],
      'Date: ' + moment.utc().format('ddd, DD MMM YYYY HH:MM:ss') + ' UTC'
    );
  } else {
    return httpResponse;
  }
};
