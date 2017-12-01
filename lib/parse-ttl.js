'use strict'

const assert = require('assert')
const timestring = require('timestring')

module.exports = function parseTtl (ttl) {
  if (typeof ttl === 'string') {
    const val = timestring(ttl, 'ms')

    assert(
      val > 0,
      `could not parse ttl ${ttl} to a valid number of milliseconds`
    )

    return val
  } else {
    return ttl
  }
}
