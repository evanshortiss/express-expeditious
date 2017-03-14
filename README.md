express-expeditious
===================
[![Circle CI](https://circleci.com/gh/evanshortiss/express-expeditious/tree/master.svg?style=svg)](https://circleci.com/gh/evanshortiss/express-expeditious/tree/master)

An express middleware that simplifies caching responses for HTTP requests.

## Features

* Supports all response functions and data types json, html, binary
(res.json, res.sendFile, res.pipe, etc.)
* Caching engines can be swapped easily. Need to use memcached instead of one
of the default adapters? Go ahead!
* Retains ETag support from express 4.12.X
* Custom generated cache keys via a simple function
* Conditional caching behaviour via a simple function
* Varied cache times can be determined based on status code
* Caching engine can be accessed programmatically for simple cache management
since it's just an expeditious instance

## Example
This example will cache responses in memory,
```js
// expeditious module, we'll use this to create cache instances
var expeditious = require('expeditious');

// express middleware that will use an expeditious instance for caching
var expressExpeditious = require('express-expeditious');

// The cache instance that our middleware will use
var expeditiousInstance = expeditious({
  namespace: 'expressCache',
  // Store cache entries for 1 minute
  defaultTtl: (60 * 1000),
  // Store cache entries in memory
  engine: require('expeditious-engine-memory')()
});


// Our express application
var app = require('express')();

// Cache all responses to all routes by injecting expeditious
app.use(expressExpeditious({
  expeditious: expeditiousInstance
}));
```

## Debugging
If you need to enable logging for this module, simply run your application in a
session with a DEBUG environment variable set to "express-expeditious" like so:

```
export DEBUG=express-expeditious
$ node server.js
```

This will cause *express-expeditious* to enable the *[debug](https://www.npmjs.com/package/debug)* logger it uses.


## Why?

TLDR: _express-expeditious_ is an express middleware that simplifies caching so
you can spend time actually getting work done, and celebrating your
application's awesome response times. Existing modules that try to provide a
middleware for caching don't work for many use cases (_res.sendFile_,
_res.pipe_), and provide a "black box" cache that you cannot easily perform
CRUD operations on.

We're all too familiar with routes in web applications that load
slowly, or have data that changes infrequently but is expensive to generate.
Such requests are an excellent candidate for caching since it will save you
resources, and result in happier users due to improved response times!

A common strategy I've seen for caching such routes in express applications is
demonstrated below.

```js
var slowExpensiveFn = require('./my-expensive-fn.js')
  , cache = require('./my-cache.js');

app.get('/expensive-query', function (req, res) {
  cache.get(req.originalUrl, onCacheResponse);

  function getData () {
    slowExpensiveFn(function (err, data) {
      if (err) {
        res.status(500).end('error getting data');
      } else {
        res.end(data);

        // Store in the cache for later calls
        cache.put(req.originalUrl, data);
      }
    });
  }

  function onCacheResponse (err, data) {
    if (err) {
      console.error('failed to read cache. perform standard request');
      getData();
    } else if (data) {
      res.end(data);
    } else {
      getData();
    }
  }
});
```

The solution above works, but it's repetitive, error prone, requires you to do
all the hard work, and probably can't have the cache "provider" changed easily.
When you start working on a team it will become even more difficult to manage a
solution like this due to varying implementations across express routes, and
inconsistent key-value conventions unless you have fantastic code reviews and
processes.


## Extended Example
```js
// expeditious module, we'll use this to create cache instances
var expeditious = require('expeditious');

// express middleware that will use an expeditious instance for caching
var expressExpeditious = require('express-expeditious');

// The cache instance that our middleware will use
var expeditiousInstance = expeditious({
  namespace: 'expressCache',
  // Store cache entries for 1 minute
  defaultTtl: (60 * 1000),
  // Store cache entries in memory
  engine: require('expeditious-engine-memory')()
});

// The middleware instance that express will use for caching
var expressExpeditiousInstance = expressExpeditious({
  expeditious: expeditiousInstance
});

// Our express application
var app = require('express')();

// Add a route that is slow to load. After the first call our cache will be
// used to respond immediately for the next 60 seconds!
app.get('/slow-loading-route',  expressExpeditiousInstance, function (req, res) {
  console.log('received a request, please wait 3 seconds for a response');
  setTimeout(function () {
    res.end('Finally, an http response! Next time this will be faster!');
  }, 3000);
});

// This route will not be cached since it does not have the middleware applied
app.get('/flush-cache', function (req, res) {
  // Call the flush method on our expeditious instance that the middleware uses
  expeditiousInstance.flush(onFlushed);

  function onFlushed (err) {
    if (err) {
      res.status(500).end('failed to flush cache');
    } else {
      res.end('cache flushed. requests will be slow again');
    }
  }
});

app.listen(3000);
```


## API

The API is very basic in that this module is a factory function (like express) that returns a middleware function. A number of options are supported though.

#### module(opts)
Create an _express-expeditious_ instance using _opts_. Supported options are:

* [Required] expeditious - The expeditious instance that will be used for caching response data for requests.
* [Optional] shouldCache - Function that will be called to determine if the response for a request should be cached.
* [Optional] genCacheKey - Function that will be called to generate a custom key for reading and writing a response from the cache. By default _req.originalUrl_ is used as the key.
* [Optional] statusCodeExpires

These options are covered in greater detail below in the Behaviours section.


## Behaviours

### When to Cache (_shouldCache_)

#### Default
By default only HTTP GET requests with 200 responses are cached using the URL
as a unique identifier (key). The querystring is included in this unique
identifier meaning _GET /users?name=john_ and _GET /users?name=jane_ are both
cached separately and only if a 200 response is received.

#### Custom
If the default behaviour is undesirable that's fine, simply provide a
_shouldCache_ function in the options to *express-expeditious* and you can have
any logic you desire to determine if a request should be cached.

```js
var expressExpeditiousInstance = expressExpeditious({
  expeditious: yourExpeditiousInstance,

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
By default _req.originalUrl_ will be used as the key for cache entries.
_req.originalUrl_ will be the entire original URL that the client requested,
including the querystring, e.g _GET /branch/texas/users?name=alex_.

#### Custom
You can define custom a custom key for incoming requests by providing a
_genCacheKey_ option when creating _express-expeditious_ instances. Here's an
example:

```js
var expressExpeditiousInstance = expressExpeditious({
  expeditious: yourExpeditiousInstance,

  // This cache key is based on a session id and the request url
  genCacheKey: function (req) {
    return req.session.id + req.originalUrl
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
var expressExpeditiousInstance = expressExpeditious({
  expeditious: yourExpeditiousInstance,

  // We want a 500 error to be cached for 30 seconds, and a 404 to be cached
  // for 120 seconds. We also override the "defaultTtl" passed to expeditious
  // for 200 requests and cache them for 2 minutes!
  statusCodeExpires: {
    200: (120 * 1000),
    404: (60 * 1000),
    500: (30 * 1000)
  }
});
```

## Changelog

* 2.1.1 - Ensure cache lock is removed when a response is not to be cached

* 2.1.0 - Log details when `engine.set` calls fail

* 2.0.0 - By default only 200 responses are cached now. Use _statusCodeExpires_
to enable caching of non 200 responses.

* 1.0.0 - Add ETag support.

* <1.0.0 - Ye Olde Days. Expected objectMode to be "false" on expeditious
instances and did not support ETags.
