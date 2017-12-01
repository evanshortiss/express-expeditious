'use strict'

const VError = require('verror')
const parseTtl = require('./parse-ttl')

module.exports = function applyMixins (getter, middleware, opts, expeditious) {
  /**
   * Creates a new middleware based on this one, but the "defaultTtl" value
   * will be overriden with the supplied value instead
   * @param  {String|Number} ttl
   * @return {Function}
   */
  middleware.withTtl = (ttl) => {
    return getter(
      Object.assign({}, opts, {
        defaultTtl: parseTtl(ttl)
      }),
      expeditious
    )
  }

  /**
   * Creates a new middleware based on this one, but an entry in the original
   * statusCodeExpires will be overriden with the supplied value instead
   * @param  {String|Number} ttl
   * @param  {String|Number} status
   * @return {Function}
   */
  middleware.withTtlForStatus = (ttl, status) => {
    // Retain old expires, but add/override new value passed
    const statusCodeExpires = Object.assign(
      {},
      opts.statusCodeExpires || {},
      {
        [status]: parseTtl(ttl)
      }
    )

    return getter(
      Object.assign({}, opts, {
        statusCodeExpires: statusCodeExpires
      }),
      expeditious
    )
  }

  /**
   * Creates a new middleware based on this one, but the "shouldCache" value
   * will be overriden with the supplied function
   * @param  {Function} fn
   * @return {Function}
   */
  middleware.withCondition = (fn) => {
    return getter(
      Object.assign({}, opts, {
        shouldCache: fn
      }),
      expeditious
    )
  }

  /**
   * Allows one to create a new middleware instance with the defined overrides
   * for the default options provided
   * @param  {Object} cfg
   * @return {Function}
   */
  middleware.withConfigOverrides = (cfg) => {
    return getter(
      Object.assign({}, opts, cfg),
      expeditious
    )
  }

  /**
   * Create a new middleware instance from the current instance but override
   * the current opts.namespace in the new instance
   * @param {String} namespace
   */
  middleware.withNamespace = (namespace) => {
    return getter(
      Object.assign({}, opts, {
        namespace: namespace
      }),
      expeditious
    )
  }

  /**
   * Create a new middleware instance from the current instance but override
   * the current opts.genCacheKey in the new instance
   * @param {Function} fn
   */
  middleware.withCacheKey = (fn) => {
    return getter(
      Object.assign({}, opts, {
        genCacheKey: fn
      }),
      expeditious
    )
  }

  /**
   * Removes all cache entries
   * @param {Function} callback   Fired when all entries are removed
   * @return {undefined}
   */
  middleware.flush = (ns, callback) => {
    expeditious.flush(ns, (err) => {
      if (err) {
        err = new VError(
          err,
          'error flushing cache for namespace %s : %s', opts.namespace, ns
        )
      }

      callback(err, null)
    })
  }

  /**
   * Create a new middleware instance from the current instance but override
   * the current opts.withSessionAwareness with the supplied value
   * @param  {Boolean}  awareness
   * @return {Function}
   */
  middleware.withSessionAwareness = (awareness) => {
    if (awareness === undefined) {
      awareness = true
    }

    return getter(
      Object.assign({}, opts, {
        sessionAware: awareness
      }),
      expeditious
    )
  }

  /**
   * Exposes the underlying expeditious instance so users can interact
   * with the cache programatically to flush, get, and set entries.
   * @type {Object}
   */
  middleware.expeditious = expeditious

  return middleware
}
