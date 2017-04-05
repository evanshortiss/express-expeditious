'use strict';

var onFinished = require('on-finished')
  , VError = require('verror')
  , replaceDateHeader = require('./replace-date-header')
  , getHttpResponseData = require('./parse-http-response');

/**
 * Return an instance that can be used to write to a cache store/engine
 * @param  {Object}   opts
 * @param  {Function} callback
 * @return {Object}
 */
module.exports = function getExpeditiousCacheMiddleware (opts) {
  // Verify options are valid. Will throw an AssertionError if not
  require('./verify-options')(opts);

  // An expeditious instance that we will use for caching operations
  var cache = opts.expeditious;

  // Module that will be used to prevent us attempting to cache the same
  // request multiple times concurrently, thus reducing memory bloat and
  // unecessary cpu usgae
  var cacheLocks = require('./cache-locks')(opts);

  // Determines if caching should occur for a given request
  var shouldCache = require('./should-cache')(opts);

  // Generates the key used to cache a request
  var genCacheKey = require('./cache-key')(opts);

  // Determine the ttl for cache entries
  var getCacheExpiry = require('./cache-expiry')(opts);


  return function _expeditiousCacheMiddleware (req, res, next) {
    var log = require('./log')(req)
      , needsStorage = false
      , cacheKey = genCacheKey(req);

    log('checking cache for request using key "%s"', cacheKey);

    // Stop here if the request should not be cached. Think of the environment!
    if (!shouldCache(req)) {
      return next();
    }

    // This request could already be cached, so let's start by checking that
    cache.get({
      key: cacheKey
    }, onCacheReturned);


    /**
     * Callback for when we load a value from cache, decides if we proceed with
     * the request or send back the cached data (if it existed)
     * @param  {Error}  err
     * @param  {String} value
     */
    function onCacheReturned (err, httpData) {
      log('loaded data from cache:\n%s', JSON.stringify(httpData, null, 2));

      if (err) {
        log('cache error, proceed with request');
        proceedWithRequest();
      } else if (httpData) {
        log('cache hit');
        respondWithCache(httpData);
      } else {
        log('cache miss, proceed with request');
        proceedWithRequest();
      }
    }

    /**
     * Respond to a request with a value that the cache returned
     * @param {Object} httpData
     */
    function respondWithCache (httpData) {
      log('responding with cached value');

      res.set('etag', httpData.etag);

      if (req.fresh) {
        log('returning a 304, etag matches');
        // req.fresh is an express "defineProperty" added that will perform
        // a check that the incoming etag matches the one on the res headers
        res.status(304);
        res.end();
      } else {
        log('returning cached data, etags did not match');
        // We're writing a HTTP response body directly to the socket, therefore
        // we use socket.write instead of .send or others to prevent adding
        // unwanted headers and response data
        res.socket.write(replaceDateHeader(httpData.completeHttpBody));
        res.end();
      }
    }

    /**
     * Called once we finish writing data to the client.
     * Writes the returned data to the cache if no errors occurred.
     * @param  {Error} err
     */
    function onResponseFinished (err, httpData) {
      /* istanbul ignore else */
      if (err) {
        log('error processing request, not storing response in cache');

        cacheLocks.removeLock(cacheKey);
      } else if (needsStorage) {

        // If the cache time is 0 don't bother doing a write
        if (getCacheExpiry(res.statusCode) === 0) {
          log('cache time for %s is 0 - will not be cached', res.statusCode);
          cacheLocks.removeLock(cacheKey);
        } else {
          log(
            'writing response to storage with key "%s", response:\n%s',
            cacheKey,
            JSON.stringify(httpData, null, 2)
          );

          cache.set({
            key: cacheKey,
            val: httpData,
            ttl: getCacheExpiry(res.statusCode)
          }, function (err) {
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

            cacheLocks.removeLock(cacheKey);
          });
        }

      }
    }


    /**
     * Processes this request using the handler the express application has
     * defined, but will cache the response from that handler
     * @return {undefined}
     */
    function proceedWithRequest () {
      // Hacky, but so is overwriting res.end, res.send, etc. By overwriting
      // res.socket.write we simplify our job since we can cache the "raw" http
      // response and don't need to rebuild it for future requests
      res.socket.write = (function (res) {
        var buf = ''
          , isInitialWrite = true
          , _write = res.socket.write.bind(res.socket);

        // We listen for the request to emit "end" or "finish" and then write to
        // the cache since we have everything we need to do so
        onFinished(res, function (err) {
          /* istanbul ignore else */
          if (err) {
            log('request finished with error, not parsing response for cache');
            onResponseFinished(err);
          } else if (needsStorage) {
            log('request finished, parsing response for cache. raw response:');
            log(buf);

            var res = null;

            try {
              res = getHttpResponseData(new Buffer(buf));
            } catch (e) {
              err = new VError(e, 'failed to parse http response');
            }

            onResponseFinished(err, res);
          } else {
            log(
              'request didn\'t need to be cached, another request for this ' +
              'resource was cached first'
            );
          }
        });

        return function customWrite (body) {
          // On the initial write for this response we need to check if a
          // matching request is already being written to the cache, and if it
          // is then we won't attempt to cache this since it would have a large
          // performance penalty in high concurrency environments
          /* istanbul ignore else */
          if (isInitialWrite) {
            log(
              'initial write called for request %s determining if caching ' +
              'is required',
              req.originalUrl
            );

            isInitialWrite = false;

            // If a lock does not already exist we need to cache this response
            needsStorage = !cacheLocks.isLocked(cacheKey);

            /* istanbul ignore else */
            if (needsStorage) {
              log('caching entry needs to be created for this request');
              cacheLocks.addLock(cacheKey);
            }
          }

          /* istanbul ignore else */
          if (needsStorage) {
            // Build this cache entry so it can be written to the cache
            buf += body.toString();
          }

          // We still need to write to the original socket.write function
          _write.apply(_write, Array.prototype.slice.call(arguments));
        };
      })(res);

      // Send the request to the next function in the routing stack, our custom
      // res.socket.write above will be invoked as soon as the application
      // starts writing a response
      next();
    }
  };
};
