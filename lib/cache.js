'use strict';

var onFinished = require('on-finished');

/**
 * Return a expeditious instance that can be used to write to a cache store/engine
 * @param  {Object}   opts
 * @param  {Function} callback
 * @return {Object}
 */
module.exports = function getExpeditiousCacheMiddleware (opts) {

  // Verify options are valid. Will throw an AssertionError if not
  require('./verify-options')(opts);

  var log = require('debug')(
    'express-expeditious'
  );

  log('creating middleware instance');

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

  // Replace the "Date" header for requests being responded to by cached data
  var replaceDateHeader = require('./replace-date-header');


  return function _expeditiousCacheMiddleware (req, res, next) {
    log('intercepted request to %s', req.originalUrl);

    // Stop here if the request should not be cached. Think of the environment!
    if (!shouldCache(req)) {
      return next();
    }

    var _write = res.socket.write.bind(res.socket)
      , needsStorage = false
      , isInitialWrite = true
      , cacheKey = genCacheKey(req)
      , buf = '';

    log('loading cache entry for %s via key "%s"', req.originalUrl, cacheKey);

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
    function onCacheReturned (err, value) {
      if (err) {
        log(
          'no cache, or error, reading cache for %s, it\'s a candidate' +
          ' for caching!',
          req.originalUrl
        );
        proceedWithRequest();
      } else if (value) {
        log('responding to %s with cached data', req.originalUrl);
        respondWithCachedValue(value);
      } else {
        log('no cached data found for request', req.originalUrl);
        proceedWithRequest();
      }
    }

    /**
     * Respond to a request with a value that the cache returned
     * @param  {Buffer} value
     */
    function respondWithCachedValue (value) {
      // We're writing a HTTP response body directly to the socket, therefore
      // we use socket.write instead of .send or others to prevent adding
      // unwanted headers and response data
      res.socket.write(replaceDateHeader(value));

      res.end();
    }

    /**
     * Called once we finish writing data to the client.
     * Writes the returned data to the cache if no errors occurred.
     * @param  {Error} err
     */
    function onResponseFinished (err) {
      if (err) {
        log(
          'error processing request %s, not storing response in cache',
          req.originalUrl
        );

        cacheLocks.removeLock(cacheKey);
      } else if (needsStorage) {
        log(
          'writing response for %s to storage with key "%s"',
          req.originalUrl,
          cacheKey
        );

        cache.set({
          key: cacheKey,
          val: buf,
          ttl: getCacheExpiry(res.statusCode)
        }, function (err) {
          if (err) {
            log('failed to write cache for %s', req.originalUrl);
          } else {
            log(
              'wrote response for %s to storage with key "%s"',
              req.originalUrl,
              cacheKey
            );
          }

          cacheLocks.removeLock(cacheKey);
        });
      } else {
        log(
          'request %s did not need to write to cache, the same request was ' +
          'already cached while this one was processing',
          req.originalUrl
        );
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
      // response and don't need to rebuild it for future requests, we might
      // need to be careful with certain headers though (TODO)
      res.socket.write = function redisCacheWrite (body) {

        // On the initial write for this response we need to check if a matching
        // request is already being written to the cache, and if it is then we
        // won't attempt to cache this since it would have a large performance
        // penalty in high concurrency environments
        /* istanbul ignore else */
        if (isInitialWrite) {
          log(
            'initial write called for request %s determining if caching ' +
            'is required',
            req.originalUrl
          );

          isInitialWrite = false;

          // If a lock does not already exist then we need to cache this response
          needsStorage = !cacheLocks.isLocked(cacheKey);

          /* istanbul ignore else */
          if (needsStorage) {
            log('caching entry needs to be created for %s', req.originalUrl);
            cacheLocks.addLock(cacheKey);
          }
        }

        /* istanbul ignore else */
        if (needsStorage) {
          // Build this cache entry so it can be written to the expeditious cache
          buf += body;
        }

        // We still need to write to the original socket.write function
        _write.apply(_write, Array.prototype.slice.call(arguments));
      };

      // We listen for the request to emit "end" or "finish" and then write to
      // the cache since we have everything we need to do so
      onFinished(res, onResponseFinished);

      // Send the request to the next function in the routing stack, our custom
      // res.socket.write above will be invoked as soon as the application
      // starts writing a response
      next();
    }
  };
};
