express-expeditious
===================
![TravisCI](https://travis-ci.org/evanshortiss/express-expeditious.svg) [![npm version](https://badge.fury.io/js/express-expeditious.svg)](https://badge.fury.io/js/express-expeditious)

An express middleware that simplifies caching responses for HTTP requests.

## Features

* Supports all response functions and data types json, html, binary
(res.json, res.sendFile, res.pipe, etc.)
* Caching engines can be swapped easily. Need to use memcached instead of one
of the default adapters? Go ahead!
* Retains ETag support from express 4.12.X
* Support for custom cache keys
* Determine caching behaviour using custom functions
* Cache times can be configured based on status code
* Simple cache invalidation using the expeditious instance passed in

## Example
This example will cache responses in node.js process memory:

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
  // Must use object mode
  objectMode: true,
  // Store cache entries in memory
  engine: require('expeditious-engine-memory')()
});

// Our express application
var app = require('express')();

// Cache all responses to all routes below this line
app.use(expressExpeditious({
  expeditious: expeditiousInstance
}));

// the initial call to this will take 2.5 seconds, but any subsequent calls
// will receive a response instantaneously for the next 60 seconds
app.get('/slow-ping', (req, res) => {
  setTimeout(() => {
    res.end('slow-pong');
  }, 2500);
});
```

## Debugging
If you need to enable logging for this module, simply run your application in a
session with a DEBUG environment variable set to "express-expeditious" like so:

```
export DEBUG=express-expeditious
$ node my-app.js
```

This will cause *express-expeditious* to enable the [debug](https://www.npmjs.com/package/debug) logger it uses.


## Why Use This?
I covered this in a [blogpost here](http://evanshortiss.com/development/javascript/nodejs/2016/07/07/better-caching-for-express.html), but there's a TLDR below if you don't feel like reading much.

TLDR: _express-expeditious_ is an express middleware that simplifies caching so
you can spend time actually getting work done, and celebrating your
application's awesome response times. Existing modules that try to provide a
middleware for caching don't work for many use cases (_res.sendFile_,
_res.pipe_), and provide a "black box" cache that you cannot easily perform
CRUD operations on.

## Extended Example

See the example folder [here](https://github.com/evanshortiss/express-expeditious/tree/master/example).


## API

This module is a factory function like express, that returns a middleware
function. A number of options are supported.

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
as the primary unique identifier (key). The querystring is included in this
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
var expressExpeditiousInstance = expressExpeditious({
  expeditious: yourExpeditiousInstance,

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

* 2.1.3 - Use coveralls. Migrate to TravisCI. Fix session issue. Update example.

* 2.1.2 - Add warning about potential for session leak

* 2.1.1 - Ensure cache lock is removed when a response is not to be cached

* 2.1.0 - Log details when `engine.set` calls fail

* 2.0.0 - By default only 200 responses are cached now. Use _statusCodeExpires_
to enable caching of non 200 responses.

* 1.0.0 - Add ETag support.

* <1.0.0 - Ye Olde Days. Expected objectMode to be "false" on expeditious
instances and did not support ETags.
