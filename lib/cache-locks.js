'use strict'

const locks = {}

/**
 * Add a lock for a resource identified by the given key
 * @param {String} key
 */
exports.addLock = function (key) {
  locks[key] = true
}

/**
 * Remove a lock on a resource identified by the given key
 * @param  {String} key
 */
exports.removeLock = function (key) {
  delete locks[key]
}

/**
 * Returns a boolean inidicating if the reosurce identified by key is
 * currently locked
 * @param  {String}  key
 * @return {Boolean}
 */
exports.isLocked = function (key) {
  return !!locks[key]
}
