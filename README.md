express-expeditious
===================
![TravisCI](https://travis-ci.org/evanshortiss/express-expeditious.svg) [![npm version](https://badge.fury.io/js/express-expeditious.svg)](https://badge.fury.io/js/express-expeditious) [![Coverage Status](https://coveralls.io/repos/github/evanshortiss/express-expeditious/badge.svg?branch=master)](https://coveralls.io/github/evanshortiss/express-expeditious?branch=master)

An express middleware that simplifies caching responses for HTTP requests.

## Features

* Caches all response functions and data types json, html, binary
(res.json, res.sendFile, res.pipe, etc.)
* Caching engines can be swapped easily. Need to use memcached instead of one
of the default adapters? Go ahead!
* Retains ETag support from express 4.12.X
* Support for custom cache keys
* Determine caching behaviours using custom functions
* Cache times can be configured based on status code
* Simple cache invalidation using the expeditious instance passed in

## Quickstart
This example will cache responses in node.js process memory:

```js
// express middleware that will use an expeditious instance for caching
const getExpeditiousCache = require('express-expeditious');

// need to pass some options for configuration purposes
const cache = getExpeditiousCache({
  // Namespace used to prevent cache conflicts. This is only a concern
  // if using something like a shared memcached or redis instance for caching
  namespace: 'expresscache',

  // Store cache entries for 1 minute
  defaultTtl: 60000
});

// Our express application
const app = require('express')();

function pingHandler (req, res) {
  setTimeout(() => {
    res.end('pong');
  }, 2500);
}

// the initial call to this will take 2.5 seconds, but any subsequent calls
// will receive a response instantaneously for the next 60 seconds thanks
// to our expeditious cache
app.get('/sometimes-slow-ping', cache, pingHandler);

// no caching applied here so it will always take 2.5 seconds to respond
app.get('/always-slow-ping', pingHandler);

app.listen(8080);
```

## Debugging
If you need to enable logging for this module, simply run your application in a
session with a DEBUG environment variable set to "express-expeditious" like so:

```
export DEBUG=express-expeditious
$ node your-app.js
```

This will have *express-expeditious* to enable the [debug](https://www.npmjs.com/package/debug) logger it uses.


## Another Express Caching Module?
I covered this in a [blogpost here](http://evanshortiss.com/development/javascript/nodejs/2016/07/07/better-caching-for-express.html), but there's a TLDR below if you don't feel like reading much.

TLDR: _express-expeditious_ is an express middleware that simplifies caching so
you can spend time actually getting work done and not worrying about caching.
Existing modules that try to provide a middleware for caching don't work for
many use cases. Sometimes _res.sendFile_ and _res.pipe_ don't work with those
existing solutions. Many also provide a "black box" cache that you cannot
easily perform CRUD operations on if you need to invalidate or inspect entries.


## Benchmarks

Here's the performance increase seen in simple benchmarks where a single
client makes requests in series as quickly as possible. You can run the same
tests using `npm run benchmark` locally inside this repo. All of these tests
use `expeditious-engine-memory` for storage. You need to also run MongoDB
locally on the default port of 27017.

![](https://github.com/evanshortiss/express-expeditious/tree/master/benchmark/perf-v4.4.3.png)

In a second test using Apache Bench for concurrent requests the difference is
even more pronounced. Here's what happens if we throw 1000 requests at with a
concurrency of 100 at the benchmark server:

![](https://github.com/evanshortiss/express-expeditious/tree/master/benchmark/apache-bench-1000-req-100-concurrency.png)

Naturally, the most significant gains are seen in endpoints that trigger CPU
intensive work (rendering HTML from JSON), and endpoints that make calls to
external APIs or databases with since these are bound by the latency of the
other API being called.


## Full Example

See the example folder [here](https://github.com/evanshortiss/express-expeditious/tree/master/example).


## API

This module is a factory function, like express, that returns a middleware
function. A number of options are supported.

#### module(opts)
Create an _express-expeditious_ instance using _opts_. Supported options are:

* [Optional] expeditious - The expeditious instance that will be used for caching response data for requests.
* [Optional] shouldCache - Function that will be called to determine if the response for a request should be cached.
* [Optional] genCacheKey - Function that will be called to generate a custom key for reading and writing a response from the cache. By default _req.originalUrl_ is used as the key.
* [Optional] statusCodeExpires - Useful if you want different status code responses to be cached for different durations
* [Required/Optional] defaultTtl - This is required if the `expeditious` option is not passed. It is the time entries will remain in the cache.
* [Required/Optional] namespace - This is required if the `expeditious` option is not passed. It's used as a namespace to prevent cache conflicts.
* [Required/Optional] engine - This is required if the `expeditious` option is not passed. It is the storage engine for caching.

These options are covered in greater detail below in the Behaviours section.


## Behaviours

### When to Cache (_shouldCache_)

#### Default
By default only HTTP GET requests with 200 responses are cached using the URL
as the primary unique identifier (key). The querystring is included in this
identifier meaning _GET /users?name=john_ and _GET /users?name=jane_ are both
cached separately and only if a 200 response is received.

#### Custom
If the default behaviour is undesirable that's fine, simply provide a
_shouldCache_ function in the options to *express-expeditious* and you can have
any logic you desire to determine if a request should be cached.

```js
const expressExpeditiousInstance = expressExpeditious({
  defaultTtl: 30000,
  namespace: 'mycache',

  // Here we want to cache only PUT requests (uncommon use case, but you can do it!)
  shouldCache: function (req) {
    return 'put' === req.method.toLowerCase();
  }
});
```

You can also use the _statusCodeExpires_ (see Status Code Variations below)
to determine if you would like to cache a non 200 response.


### Cache Key Generation (_genCacheKey_)

#### Default
The default cache key is generated using:

* req.method
* req.session.id (if exists)
* req.originalUrl

Here's a sample cache key from an application using sessions:

```
GET-fa0391d0a99ca3693bb8d658feabd28b-/cached
```

And here's one not using sessions:

```
GET-/cached
```


#### Custom
You can define custom a custom key for incoming requests by providing a
_genCacheKey_ option when creating _express-expeditious_ instances.

Here's an example for an API that has versioning based on a header:

```js
const expressExpeditiousInstance = expressExpeditious({
  defaultTtl: 30000,
  namespace: 'mycache',

  // cache key is based on a session id, api version, method, and url
  genCacheKey: function (req) {
    const sessionId = req.session.id;
    const version = req.headers['x-api-version'];
    const resource = req.originalUrl;
    const method = req.method;

    return `${method}-${resource}-${version}-${sessionId}`
  }
});
```

### Status Code Variations (_statusCodeExpires_)

#### Default
The default behaviour for _express-expeditious_ is to cache responses that have
a status code of 200. Other status codes mean the response is not cached.

#### Custom
To cache non 200 responses and have different cache TTL values for different
status codes, simply add the _statusCodeExpires_ option, and specify the
expiry/ttl value you would like to use for a particular status code in
milliseconds. An example is provided below.

```js
const expressExpeditiousInstance = expressExpeditious({
  defaultTtl: 30000,
  namespace: 'mycache',

  // We want a 500 error to be cached for 30 seconds, and a 404 to be cached
  // for 120 seconds. We also override the "defaultTtl" passed to expeditious
  // for 200 requests and cache them for 2 minutes!
  statusCodeExpires: {
    200: 120 * 1000,
    404: 60 * 1000,
    500: 30 * 1000
  }
});
```


## CHANGELOG

[Click here](https://github.com/evanshortiss/express-expeditious/blob/master/CHANGELOG.md) to see the CHANGELOG.md file.


## Redis Example

This is very similar _Quickstart_ example with the only exception being we pass
a custom expeditious instance that has an `engine` set to an instance of
`expeditious-engine-redis`.

```js
// express middleware that will use an expeditious instance for caching
const getExpeditiousCache = require('express-expeditious');
const expeditious = require('expeditious');

// need to pass some options for configuration purposes
const cache = getExpeditiousCache({
  expeditious: expeditious({
    defaultTtl: 60000,
    namespace: 'expressrediscache',
    engine: require('expeditious-engine-redis')({
      // options for the redis driver
      host: 'redis.acme.com',
      port: 6379
    }),
    objectMode: true
  })
});

// Our express application
const app = require('express')();

function pingHandler (req, res) {
  setTimeout(() => {
    res.end('pong');
  }, 2500);
}

// the initial call to this will take 2.5 seconds, but any subsequent calls
// will receive a response instantaneously for the next 60 seconds thanks
// to our expeditious cache
app.get('/sometimes-slow-ping', cache, pingHandler);

// no caching applied here so it will always take 2.5 seconds to respond
app.get('/always-slow-ping', pingHandler);
```
