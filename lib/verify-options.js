'use strict';

var assert = require('assert');

module.exports = function verifyOptions (opts) {
  assert(
    typeof opts.expeditious === 'object' && opts.expeditious !== null,
    'opts.expeditious must be an object containing valid expeditious options'
  );

  assert(
    !opts.shouldCache || typeof opts.shouldCache === 'function',
    'opts.shouldCache should be a function if provided'
  );

  assert(
    !opts.genCacheKey || typeof opts.genCacheKey === 'function',
    'opts.genCacheKey should be a function if provided'
  );

  assert(
    !opts.statusCodeExpires || typeof opts.statusCodeExpires === 'object',
    'opts.statusCodeExpires should be an object if provided'
  );

  assert(
    opts.expeditious.isObjectMode() === true,
    'opts.expeditious.objectMode should be set to true on the instance ' +
    'provided to ' + require('../package.json').name
  );
};
