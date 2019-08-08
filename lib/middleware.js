'use strict'

const getLogger = require('./log')
const onFinished = require('on-finished')
const parseTtl = require('./parse-ttl')
const verifyOptions = require('./verify-options')
const applyMixins = require('./mixins')

// Module that will be used to prevent us attempting to cache the same
// request multiple times concurrently, thus reducing memory bloat and
// unecessary resource usgae
const cacheLocks = require('./cache-locks')

// This flag is used to prevent logging the same warning mulitple times
let warnedAboutMemoryCache = false

const getMiddlewareInstance = module.exports = function (opts) {
  verifyOptions(opts)

  // default expose cache header
  if (opts.cacheStatusHeader === undefined) {
    opts.cacheStatusHeader = 'x-expeditious-cache'
  }

  /* istanbul ignore else */
  if (opts.sessionAware === undefined) {
    // If user does not specify session awareness we should default to true
    // since this will prevent accidentally providing data intended for one
    // user to other users - dangerzone!
    opts.sessionAware = true
  }

  // opts.defaultTtl must be parsed to a number format
  opts.defaultTtl = parseTtl(opts.defaultTtl)

  // An expeditious instance that we will use for caching operations can be
  // supplied or we will generate one for the developer
  const expeditious = require('expeditious')({
    namespace: opts.namespace,
    defaultTtl: opts.defaultTtl,
    objectMode: true, // has to be true since we pass Objects to expeditious
    engine: opts.engine || (function () {
      /* istanbul ignore else */
      if (!warnedAboutMemoryCache) {
        warnedAboutMemoryCache = true
        console.warn(
          'express-expeditious: You did not supply an ' +
          '"engine". Defaulting to expeditious-engine-memory. Beware that ' +
          'this can result in high memory usage for the node process if not ' +
          'used carefully.\n'
        )
      }

      return require('expeditious-engine-memory')()
    })()
  })

  // Determines if caching should occur for a given request
  const shouldCache = require('./should-cache')(opts)

  // Generates the key used to cache a request
  const genCacheKey = require('./cache-key')(opts)

  // Determine the ttl for cache entries
  const getCacheExpiry = require('./cache-expiry')(opts)

  // The middleware instance itself
  const expeditiousMiddleware = function (req, res, next) {
    const log = getLogger(req)
    const cacheKey = genCacheKey(req, res)

    log(`generated cache key was: ${cacheKey}`)

    if (!shouldCache(req)) {
      log(
        'not checking cache for request using key "%s", "shouldCache" is false',
        cacheKey
      )
      next()
    } else {
      log('checking cache for request using key "%s"', cacheKey)
      expeditious.get({
        key: cacheKey
      }, onCacheReturned)
    }

    /**
     * Callback for when we load a value from cache, decides if we proceed with
     * the request or send back the cached data (if it existed)
     * @param  {Error}  err
     * @param  {String} httpData
     */
    function onCacheReturned (err, httpData) {
      if (err) {
        log('cache error. proceed with request', err.stack)
        processRequest()
      } else if (httpData) {
        log('cache hit. responding with cached data %j', httpData)

        const etag = getEtagHeaderValue(httpData.headers)

        if (etag) {
          res.set('etag', etag)
        }

        if (req.fresh) {
          // req.fresh is an express "defineProperty" added that will perform
          // a check that the incoming etag matches the one on the res headers
          log('returning a 304, etag matches')

          res.status(304).end()
        } else {
          log('etag did not match. returning cached data.')
          res.socket.write(httpData.headers)

          // When stored the Buffer is converted to an Object via JSON.stringify
          // that looks like so { type:String, data: Array }
          res.socket.write(Buffer.from(httpData.data.data))
          res.socket.end()
        }
      } else {
        log('cache miss. proceed with request')
        processRequest()
      }
    }

    /**
     * Get the value of an etag if one is present in the http response text
     * @param {String} headers
     */
    function getEtagHeaderValue (headers) {
      const etag = headers.split('\r\n').filter(h => h.match(/^etag: *./gi))[0]

      if (etag) {
        // e.g split 'etag: abcedfg1' to just "abcedfg1"
        return etag.split(/etag: /gi)[1]
      }
    }

    /**
     * Given the header portion of a http response text, extract the status code
     * @param {String} headers
     */
    function getHttpStatusCode (headers) {
      return parseInt(headers.split('\r\n')[0].split(' ')[1])
    }

    /**
     * Called once we finish writing data to the client.
     * Writes the returned data to the cache if no errors occurred.
     * @param  {Object} httpData
     */
    function performCacheWrite (httpData) {
      // If the status code is a 304 then we have clients that are possibly
      // utilising etags and we need to ensure we include the etag in the key
      // so we don't accidentally continue to bypass the cache, e.g
      // req.etag === '123' but we have no cache (for a 200 response) yet. We
      // need to serve this request with the defined handler, but also, need to
      // then store the response in cache so people with the same etag also get
      // a 304 as expected essentially this means we can have a 200 and 304
      // cache for a given endpoint to cover both cases
      const writeKey = getHttpStatusCode(httpData.headers) === 304
        ? genCacheKey(req, res) : cacheKey

      if (getCacheExpiry(res.statusCode) === 0) {
        // If the cache time is 0 don't bother caching
        log('cache time for %s is 0 - will not be cached', res.statusCode)
        cacheLocks.removeLock(cacheKey)
      } else {
        const exp = getCacheExpiry(res.statusCode)
        const setOpts = {
          key: writeKey,
          val: httpData,
          ttl: exp
        }

        // Replace the "miss" with a "hit" for future responses
        if (opts.cacheStatusHeader) {
          httpData.headers = httpData.headers
            .replace(
              opts.cacheStatusHeader + ': miss',
              opts.cacheStatusHeader + ': hit'
            )
        }

        log(
          'writing response to storage with key %s payload:\n%j',
          writeKey,
          setOpts
        )

        expeditious.set(setOpts, function (err) {
          cacheLocks.removeLock(cacheKey)

          if (err) {
            log('failed to write cache')
            log(err)
          } else {
            log(
              'wrote response to storage with key "%s"',
              writeKey
            )
          }
        })
      }
    }

    /**
     * Processes this request using the handler the express application has
     * defined, but will cache the response from that handler too
     * @return {undefined}
     */
    function processRequest () {
      // This will hold the entire http response buffer
      let buf = Buffer.alloc(0)
      // let aborted = false
      let _write

      // We listen for the request to emit "end" or "finish" and then write to
      // the cache since we have everything we need to do so.
      // Also need to check the finished property so we don't accidentally
      // store empty/partial caches
      function onResponseFinished (err) {
        if (err || !res.finished) {
          if (err) {
            log(
              'request had an error. not parsing response for cache - %j',
              err
            )
          } else  {
            log('request was aborted. not parsing response for cache')
          }
          cacheLocks.removeLock(cacheKey)
        } else {
          log('request finished, parsing response for cache')

          const bodyBeginIdx = buf.indexOf('\r\n\r\n')
          const httpData = {
            headers: buf.slice(0, bodyBeginIdx).toString(),
            data: buf.slice(bodyBeginIdx, buf.length)
          }

          performCacheWrite(httpData)
        }
      }

      // We intercept all writes to the socket so we can cache raw http data.
      // All writes are converted to a Buffer for simplicity
      function expeditiousCustomWrite (body, encoding, cb) {
        if (!Buffer.isBuffer(body)) {
          body = Buffer.from(body)
        }

        buf = Buffer.concat([buf, body], buf.length + body.length)

        _write(body, encoding, cb)
      }

      function onSocketReady () {
        log('res.socket is ready')
        // Important to bind context here or we'll get reference errors!
        _write = res.socket.write.bind(res.socket)

        onFinished(res, onResponseFinished)
        res.socket.write = expeditiousCustomWrite

        next()
      }

      // only cache a request if someone else is not already doing so
      if (!cacheLocks.isLocked(cacheKey)) {
        if (opts.cacheStatusHeader) res.set(opts.cacheStatusHeader, 'miss')

        log('request will be used to build a cache')

        // Need to add a lock so we don't start buffering this response in
        // memory for multiple requests...that'd be nasty
        cacheLocks.addLock(cacheKey)

        if (!res.socket) {
          log('res.socket not yet defined, applying listener')
          res.once('socket', onSocketReady)
        } else {
          onSocketReady()
        }
      } else {
        next()
      }
    }
  }

  return applyMixins(
    getMiddlewareInstance,
    expeditiousMiddleware,
    opts,
    expeditious
  )
}
