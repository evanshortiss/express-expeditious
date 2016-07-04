express-expeditious
===================
[![Circle CI](https://circleci.com/gh/evanshortiss/express-expeditious/tree/master.svg?style=svg)](https://circleci.com/gh/evanshortiss/express-expeditious/tree/master)

## What?
An express middleware that simplifies caching responses for HTTP requests.

## Why?

TLDR: Caching ~~can be~~ is hard. We've all screwed it up at some point (don't lie).
_express-expeditious_ aims to simplify caching so you can spend time actually
getting work done, and celebrating your awesome response times.

Unfortunately, we're all too familiar with routes in web applications that load
slowly, or have data that changes infrequently but is expensive to generate.
Such requests are an excellent candidate for caching since it will save you
resources, and result in happier users due to improved response times!

A common strategy I've seen for caching such routes in express applications is
demonstrated below. You've probably done something like this and found it
tedious.

```js
var expensiveFn = require('./my-expensive-fn.js')
  , cache = require('./my-cache.js');

app.get('/expensive-query', function (req, res) {
  cache.get(req.originalUrl, onCacheResponse);

  function getData () {
    expensiveFn(function (err, data) {
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

The solution above works, but it's repetitive, error prone, requires you to do all the hard work, and probably can't have the cache provider changed easily. When you start working on a team it will become even more difficult to manage a solution like this due to varying implementations across express routes, and inconsistent key-value conventions unless you have fantastic code reviews and processes.

*express-expeditious* offers a solution to this problem by utilising express middleware and _expeditious_ instances to simplify your caching strategy. It decouples the cache interface from the middleware to facilitate easier programatic interaction with your cache while still allowing the middleware to use it to get its job done.

## How?

*express-expeditious* leverages the *expeditious* cache module to do the caching, while it deals with the HTTP and routing work! This means *express-expeditious* does not become a mysterious "black box" style cache that you're unable to invalidate and work with effectively.


## Example
```js
// expeditious module, we'll use this to create cache instances
var expeditious = require('expeditious');

// express middleware that will use an expeditious instance for caching
var expressExpeditious = require('express-expeditious');

// The cache instance that our middleware will use
var expeditiousInstance = expeditious({
  namespace: 'my-express-cache',
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
By default only HTTP GET requests are cached using the URL as a unique identifier (key). The querystring is included in this unique identifier meaning _GET /users?name=john_ and _GET /users?name=jane_ are both cached separately.

#### Custom
If the default behaviour is undesirable that's fine, simply provide a _shouldCache_ function in the options to *express-expeditious* and you can have any logic you desire to determine if a request should be cached.

```js
var expressExpeditiousInstance = expressExpeditious({
  expeditious: yourExpeditiousInstance,

  // here we want to cache only PUT and POST requests
  shouldCache: function (req) {
    return ['post', 'put'].indexOf(
      req.method.toLowerCase()
    ) !== -1;
  }
});
```

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
The default behaviour for _express-expeditious_ is to cache all responses,
regardless of status code, for the same duration/ttl.

#### Custom
To have different cache ttl values for different status codes, simply add the
_statusCodeExpires_ option, and specify the expiry/ttl value you would like
to use for a particular status code in milliseconds. An example is provided
below.

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
