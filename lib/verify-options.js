'use strict'

var assert = require('assert')

module.exports = function verifyOptions (opts) {
  if (opts.expeditious) {
    assert(
      typeof opts.expeditious === 'object',
      'opts.expeditious must be an object containing valid expeditious options'
    )

    assert(
      opts.expeditious.isObjectMode() === true,
      'opts.expeditious.objectMode should be set to true on the instance ' +
      'provided to ' + require('../package.json').name
    )
  } else {
    assert(
      typeof opts.defaultTtl === 'number' ||
      typeof opts.defaultTtl === 'string',
      `opts.defaultTtl must be a number of milliseconds or a timestring, e.g
      supply 60000 or "1 minute" to cache responses for a minute`
    )

    assert(
      typeof opts.namespace === 'string' && opts.namespace.length > 0,
      'opts.namespace must be a non-empty string e.g "usersCache"'
    )
  }

  assert(
    !opts.shouldCache || typeof opts.shouldCache === 'function',
    'opts.shouldCache should be a function if provided'
  )

  assert(
    !opts.genCacheKey || typeof opts.genCacheKey === 'function',
    'opts.genCacheKey should be a function if provided'
  )

  assert(
    !opts.statusCodeExpires || typeof opts.statusCodeExpires === 'object',
    'opts.statusCodeExpires should be an object if provided'
  )

  assert(
    !opts.cacheStatusHeader || typeof opts.cacheStatusHeader === 'boolean' ||
      typeof opts.cacheStatusHeader === 'string',
    'opts.cacheStatusHeader should be a boolean or string if provided'
  )
}
