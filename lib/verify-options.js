'use strict';

var assert = require('assert');

module.exports = function verifyOptions (opts) {
  if (opts.expeditious) {
    assert(
      typeof opts.expeditious === 'object',
      'opts.expeditious must be an object containing valid expeditious options'
    );

    assert(
      opts.expeditious.isObjectMode() === true,
      'opts.expeditious.objectMode should be set to true on the instance ' +
      'provided to ' + require('../package.json').name
    );
  } else {
    assert(
      typeof opts.defaultTtl === 'number',
      'opts.defaultTtl must be a number, e.g supply 60000 for 1 minute caching'
    );

    assert(
      typeof opts.namespace === 'string' && opts.namespace.length > 0,
      'opts.namespace must be a non-empty string e.g "usersCache"'
    );
  }

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
};
