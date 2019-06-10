
// Type definitions for express-expeditious 3.x
// Project: http://github.com/evanshortiss/express-expeditious
// Definitions by: Evan Shortiss <https://github.com/evanshortiss/>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 2.2

/// <reference types="express" />

import * as express from 'express';

/**
 * This declaration is required to appease the TypeScript compiler
 */
declare namespace ExpressExpeditious {
  /**
   * Expiry values can either be a number of milliseconds. For example to cache entries for 60 seconds you can pass the
   * number 60000, string, "1 minute" or the string "60 seconds"
   */
  type ExpeditiousExpire = number|string

  /**
   * Function that determines if we should attempt to read the cache to serve the incoming request. Will also determine
   * if the response to the request is written to the cache in the event that a "miss" occurred
   */
  type ShouldCacheFunction = (req: express.Request) => boolean

  /**
   * Function that can be used to generate a custom caching key for an incoming request. This key will be used to read
   * and write from the cache
   */
  type GenreateCacheKeyFunction = (req: express.Request, res: express.Response) => string

  /**
   * Options that must be passed to the factory function of express-expeditious
   */
  interface ExpeditiousOptions {
    defaultTtl: ExpeditiousExpire
    namespace: string
    engine?: any
    sessionAware?: boolean
    cacheStatusHeader?: boolean|string
    genCacheKey?: GenreateCacheKeyFunction
    shouldCache?: ShouldCacheFunction
    statusCodeExpires?: {
      [key: number]: ExpeditiousExpire
    }
  }

  /**
   * The representation of a returned express-expeditious instance
   */
  interface ExpressExpeditiousInstance extends express.RequestHandler {

    /**
     * Creates a clone of this cache instance, but with a new defaultTtl
     */
    withTtl: (ttl: ExpeditiousExpire) => ExpressExpeditiousInstance

    /**
     * Creates a clone of this cache instance, but with a new expiry value for the given status code. Will inherit all
     * other settings including existing status code expire values
     */
    withTtlForStatus: (ttl: ExpeditiousExpire, statusCode: number) => ExpressExpeditiousInstance

    /**
     * Create a clone of this cache instance, but with the newly passed shouldCache condition
     */
    withCondition: (condition: ShouldCacheFunction) => ExpressExpeditiousInstance

    /**
     * Create a clone of this cache instance, but override certain configuration options used the passed configuration
     */
    withConfigOverrides: (opts: ExpeditiousOptions) => ExpressExpeditiousInstance

    /**
     * Create a clone of this cache instance, but with the newly passed namespace
     */
    withNamespace: (ns: string) => ExpressExpeditiousInstance

    /**
     * Create a clone of this cache instance, but with the newly cache key generator function
     */
    withCacheKey: (genCacheKey: GenreateCacheKeyFunction) => ExpressExpeditiousInstance

    /**
     * Flush all cache entries for the given namespace. The callback will receive an error if one occurred
     */
    flush: (ns: string, callback: (err: Error) => void) => void

    /**
     * Create a clone of this cache instance that is either session aware (true) or not session aware (false)
     */
    withSessionAwareness: (awareness: boolean) => ExpressExpeditiousInstance

    /**
     * The underlying expeditious instance used by this cache
     */
    expeditious: any
  }
}

/**
 * Default export. This function will create a middleware instance.
 */
declare function ExpressExpeditious(opts: ExpressExpeditious.ExpeditiousOptions): ExpressExpeditious.ExpressExpeditiousInstance


export = ExpressExpeditious;
