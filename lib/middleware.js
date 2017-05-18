'use strict';

const getLogger = require('./log');
const onFinished = require('on-finished');
const VError = require('verror');
const parseTtl = require('./parse-ttl');
const getHttpResponseData = require('./parse-http-response');
const verifyOptions = require('./verify-options');
const applyMixins = require('./mixins');

// Module that will be used to prevent us attempting to cache the same
// request multiple times concurrently, thus reducing memory bloat and
// unecessary resource usgae
const cacheLocks = require('./cache-locks');

// This flag is used to prevent logging the same warning mulitple times
let warnedAboutMemoryCache = false;

const getMiddlewareInstance = module.exports = function (opts) {
  verifyOptions(opts);

  /* istanbul ignore else */
  if (opts.sessionAware === undefined) {
    // If user does not specify session awareness we should default to true
    // since this will prevent accidentally providing data intended for one
    // user to other users - dangerzone!
    opts.sessionAware = true;
  }

  // An expeditious instance that we will use for caching operations can be
  // supplied or we will generate one for the developer
  const expeditious = require('expeditious')({
    namespace: opts.namespace,
    defaultTtl: parseTtl(opts.defaultTtl),
    objectMode: true, // has to be true since we pass Objects to expeditious
    engine: opts.engine || (function () {
      if (!warnedAboutMemoryCache) {
        warnedAboutMemoryCache = true;
        console.warn(
          'express-expeditious: You did not supply an ' +
          '"engine". Defaulting to expeditious-engine-memory. Beware that ' +
          'this can result in high memory usage for the node process if not ' +
          'used carefully.\n'
        );
      }

      return require('expeditious-engine-memory')();
    })()
  });

  // Determines if caching should occur for a given request
  const shouldCache = require('./should-cache')(opts);

  // Generates the key used to cache a request
  const genCacheKey = require('./cache-key')(opts);

  // Determine the ttl for cache entries
  const getCacheExpiry = require('./cache-expiry')(opts);

  // The middleware instance itself
  const expeditiousMiddleware = function (req, res, next) {
    const log = getLogger(req);
    const cacheKey = genCacheKey(req);

    if (!shouldCache(req)) {
      log(
        'not checking cache for request using key "%s", "shouldCache" is false',
        cacheKey
      );
      next();
    } else {
      log('checking cache for request using key "%s"', cacheKey);
      expeditious.get({
        key: cacheKey
      }, onCacheReturned);
    }

    /**
     * Callback for when we load a value from cache, decides if we proceed with
     * the request or send back the cached data (if it existed)
     * @param  {Error}  err
     * @param  {String} httpData
     */
    function onCacheReturned (err, httpData) {
      if (err) {
        log('cache error. proceed with request', err.stack);
        processRequest();
      } else if (httpData) {
        log('cache hit. responding with cached data %j', httpData);

        res.set('etag', httpData.headers.ETag || httpData.headers.etag);

        if (req.fresh) {
          // req.fresh is an express "defineProperty" added that will perform
          // a check that the incoming etag matches the one on the res headers
          log('returning a 304, etag matches');

          res.status(304).end();
        } else {
          log('etag did not match. returning cached data.');

          // Set headers, then write status and body
          res.set(httpData.headers);
          res.status(httpData.statusCode).end(httpData.body);
        }
      } else {
        log('cache miss. proceed with request');
        processRequest();
      }
    }


    /**
     * Called once we finish writing data to the client.
     * Writes the returned data to the cache if no errors occurred.
     * @param  {Object} httpData
     */
    function onResponseFinished (httpData) {
      if (getCacheExpiry(res.statusCode) === 0) {
        // If the cache time is 0 don't bother caching
        log('cache time for %s is 0 - will not be cached', res.statusCode);
        cacheLocks.removeLock(cacheKey);

      } else {
        const exp = getCacheExpiry(res.statusCode);
        const setOpts = {
          key: cacheKey,
          val: httpData,
          ttl: exp
        };

        log(
          'writing response to storage with payload:\n%j',
          setOpts
        );

        expeditious.set(setOpts, function (err) {
          cacheLocks.removeLock(cacheKey);

          if (err) {
            log('failed to write cache');
            log(err);
          } else {
            log(
              'wrote response to storage with key "%s"',
              req.originalUrl,
              cacheKey
            );
          }
        });
      }
    }


    /**
     * Processes this request using the handler the express application has
     * defined, but will cache the response from that handler too
     * @return {undefined}
     */
    function processRequest () {
      // only cache a request if someone else is not already doing so
      if (!cacheLocks.isLocked(cacheKey)) {
        log('request will be used to build a cache');

        // Need to add a lock so we don't start buffering this response in
        // memory for multiple requests...that'd be nasty
        cacheLocks.addLock(cacheKey);

        // This will hold the entire http response buffer
        let buf = '';

        // Important to bind context here or we'll get reference errors!
        const _write = res.socket.write.bind(res.socket);

        // We intercept all writes to the socket so we can cache raw http data
        function expeditiousCustomWrite (body, encoding) {
          log('custom write received', body);
          buf += body;
          _write(body, encoding);
        };

        // We listen for the request to emit "end" or "finish" and then write to
        // the cache since we have everything we need to do so
        function onRequestFinished (err) {
          if (err) {
            log(
              'request error. not parsing response for cache - %j',
              err
            );
            cacheLocks.removeLock(cacheKey);
          } else {
            log('request finished, parsing response for cache. raw response:');
            log(buf);

            var httpData = null;

            try {
              httpData = getHttpResponseData(new Buffer(buf));
            } catch (e) {
              err = new VError(e, 'failed to parse http response');
            }

            onResponseFinished(httpData);
          }
        }

        onFinished(res, onRequestFinished);
        res.socket.write = expeditiousCustomWrite;
      }

      next();
    }
  };

  return applyMixins(
    getMiddlewareInstance,
    expeditiousMiddleware,
    opts,
    expeditious
  );
};
