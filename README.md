express-expeditious
===================
![https://travis-ci.org/evanshortiss/express-expeditious](https://travis-ci.org/evanshortiss/express-expeditious.svg) [![npm version](https://badge.fury.io/js/express-expeditious.svg)](https://badge.fury.io/js/express-expeditious) [![https://coveralls.io/repos/github/evanshortiss/express-expeditious](https://coveralls.io/repos/github/evanshortiss/express-expeditious/badge.svg?branch=master)](https://coveralls.io/github/evanshortiss/express-expeditious?branch=master)
[![TypeScript](https://badges.frapsoft.com/typescript/version/typescript-next.svg?v=101)](https://github.com/ellerbrock/typescript-badges/) [![Greenkeeper badge](https://badges.greenkeeper.io/evanshortiss/express-expeditious.svg)](https://greenkeeper.io/)

An express middleware that simplifies caching responses for HTTP requests of any
type. It also handles many unique cases such as piping data, using sessions, and
ETags. This middleware is implemented at the socket level, so it is entirely
transparent to the response methods such as `res.json`, `res.end`, etc. and
stays out of your way as a result. TypeScript support is also included.


## How Does it Work?

Using the default settings it works by:

1. Generating a cache key for all incoming GET requests
2. Checking if that key already exists in a storage engine
3. Responding with the cached data if found, otherwise process the request using
the defined router logic and place the response in the cache if the status code
was a HTTP 200 (success).


## Features

* Support for TypeScript.
* Seamlessly caches responses without the need to modify route handler code.
* Caches all response functions and data types, e.g `res.json`, `res.sendFile`,
`res.pipe`, etc.
* Cache storage engines can be swapped easily. You're not limited to node.js
memory or redis (but there are adapters prebuilt for those two).
* Is `express-session` (`req.session`) aware. This ensures user data is not
accidentally shared when two users request the same URL.
* Retains ETag (HTTP 304) support from express 4.12.X and for all response types
including those piped or of file format.
* Support for custom cache key generation.
* Can override caching behaviours using a custom function.
* Cache times can be configured on a per status code basis.
* Cache inspection and invalidation using the underlying `expeditious` instance
* Support for `timestring` format for setting cache timeouts. For example you
can pass `'1 hour'` instead of `60 * 60 * 1000`.
* Responses contain an `x-expeditious-cache` header that states either `hit` or
`miss` so clients can determine if the data is a cached copy.


## Install

```
npm install express-expeditious --save
```

You can also install one of these to customise the cache storage location:

* expeditious-engine-redis
* expeditious-engine-memory (this is the default)

If you'd like to write an engine of your own for another storage system then take a look at the source
code for those modules - it's pretty easy and there's more information [here](https://github.com/evanshortiss/expeditious#custom-engines).

## Usage
These examples will cache any successful request - this is a request that you
send a 200 status code to the client.


### Using the Default In-Memory Cache
```js
const getExpeditiousCache = require('express-expeditious');
const express = require('express');

const cache = getExpeditiousCache({
  // Namespace used to prevent cache conflicts, must be alphanumeric
  namespace: 'expresscache',

  // Store cache entries for 1 minute (can also pass milliseconds e.g 60000)
  defaultTtl: '1 minute'
});

const app = express();

// the initial call to this will take 2 seconds, but any subsequent calls
// will receive a response instantly from cache for the next hour
app.get('/ping', cache.withTtl('1 hour'), (req, res) => {
  setTimeout(() => {
    res.end('pong');
  }, 2000);
});

// Cache everything below this line for 1 minute (defaultTtl)
app.use(cache);
```

### Using the Default In-Memory Cache with TypeScript
Similar to the regular JavaScript example:

```ts
import * as expeditious from 'express-expeditious';
import * as express from 'express';

const cacheoptions: expeditious.ExpeditiousOptions = {
  namespace: 'expresscache',
  defaultTtl: '1 minute'
};

const cache = expeditious(cacheoptions);

const app = express();

// the initial call to this will take 2 seconds, but any subsequent calls
// will receive a response instantly from cache for the next hour
app.get('/ping', cache.withTtl('1 hour'), (req, res) => {
  setTimeout(() => {
    res.end('pong');
  }, 2000);
});
```

There's also a TypeScript sample folder in this repo at `/example-ts`.


### Using Redis
Just like before, except we pass a redis engine:

```js
const getExpeditiousCache = require('express-expeditious');
const express = require('express');

const cache = getExpeditiousCache({
  namespace: 'expresscache',
  defaultTtl: '1 minute',
  engine: require('expeditious-engine-redis')({
    // options for the redis driver
    host: 'redis.acme.com',
    port: 6379
  })
});

const app = express();

app.use(cache);

app.get('/ping', (req, res) => {
  setTimeout(() => {
    res.end('pong');
  }, 2000);
});
```

### Cache Storage Format
Currently cached data is stored in the following format:

```js

{
  headers: String
  data: {
    type: 'Buffer',
    data: Uint8Array
  }
}
```

For example, here's a cache entry that would be stored by the module:

```js
{
  "headers": "HTTP/1.1 200 OK\r\nX-Powered-By: Express\r\nx-expeditious-cache: hit\r\nDate: Thu, 14 Jun 2018 16:16:33 GMT\r\nConnection: close\r\nTransfer-Encoding: chunked",
  "data": {
    "type": "Buffer",
    "data": [
      13,
      10,
      13,
      10,
      49,
      13,
      10,
      111,
      13,
      10,
      49,
      13,
      10,
      107,
      13,
      10,
      48,
      13,
      10,
      13,
      10
    ]
  }
}
```

This format could be changed to improve the ability to query for specific
headers or data. The use of Buffers is to ensure binary/compressed data can be
cached, but PRs and ideas surrounding this are welcome. For example, we could
store non-binary data as strings to simplify the ability to query it.

### Using Modifers
You can modify cache behaviour for specific endpoint or routers easily like so:

```js
const app = require('express')();
const isEmpty = require('lodash.isempty');
const products = require('lib/products');
const cache = require('express-expeditious')({
  namespace: 'expresscache',
  defaultTtl: '1 minute'
});


/**
 * Exposes a /products endpoint that can be queried for a list of products.
 *
 * If the client provides a querystring then the request will NOT be cached.
 *
 * The endpoint is also session independent meaning the data returned is the
 * same regardless of the user that calls, so we set sessionAware to false since
 * it will reduce resource usage.
 */
app.get(
  '/products',

  cache
    .withSessionAwareness(false)
    .withCondition((req) => { return isEmpty(req.query) }),

  (req, res, next) => {
    products.list(req.query)
      .then((listOfProducts) => res.json(listOfProducts))
      .catch(next)
  }
);


/**
 * Expose a /orders endpoint that caches all HTTP 200 responses for 5 minutes.
 * It overrides the default behaviour and also caches 404 responses for a given
 * request for 1 minute - by default only 200 responses are cached
 */
app.use(
  '/orders',

  cache
    .withTtl('5 minutes')
    .withTtlForStatus('1 minute', 404),

  require('lib/routes/orders')
);
```

## Debugging
If you need to enable logging for this module, simply run your application in a
session with a DEBUG environment variable set to "express-expeditious" like so:

```
export DEBUG=express-expeditious
$ node your-app.js
```

This will have *express-expeditious* to enable the
[debug](https://www.npmjs.com/package/debug) logger module it uses.


## Benchmarks
Here's the performance increase seen in simple benchmarks using Apache Bench.
All of these tests use `expeditious-engine-memory` for storage meaning the
node.js process memory is used.

You can run the same tests using the following commands:

```
# after cloning the repo
cd express-expeditious/
npm install
npm run benchmark-server
```

You need to run MongoDB locally on its default port of 27017 also. These tests
were performed with MongoDB running inside docker using the following command:


```
docker run --name mongodb -p 27017:27017 -p 28017:28017 -d mongo
```

Now, to start the tests run the command below in another terminal:

```
ab -n 1000 -c 100 http://localhost:8080/$ENDPOINT_TO_TEST
```

Here are the requests per second averaged from 4 runs:

![](https://raw.githubusercontent.com/evanshortiss/express-expeditious/master/benchmark/requests-per-second.png)

And here is the average time taken for each request averaged over 4 runs:

![](https://raw.githubusercontent.com/evanshortiss/express-expeditious/master/benchmark/time-per-request.png)

It's clear that with caching applied using *express-expeditious* latency is
reduced so your application will feel more responsive and the amount of requests
per second that can be served increases significantly.


## Full Example
See the example folder [here](https://github.com/evanshortiss/express-expeditious/tree/master/example).

You can hit HTTP endpoints on the example server using the following URLs:

* http://localhost:8080/ - Uses `res.render` to render a homepage
* http://localhost:8080/ping - Uses `res.end`
* http://localhost:8080/sendfile - Uses `res.sendFile`
* http://localhost:8080/pipe - Uses `res.pipe`
* http://localhost:8080/write - Uses `res.write`

All of these URLs respond after 2 seconds on the first call, but subsequent
calls will use *express-expeditious* to respond instantly using the cache.


## API
This module is a factory function (similar to express) that returns a
middleware function. A number of options are supported and are explained in the
following sections.

### module(opts)
Create a middleware `instance` using _opts_. Supported options are:

* [Optional] expeditious - The expeditious instance that will be used for caching response data for requests.
* [Optional] shouldCache - Function that will be called to determine if the response for a request should be cached.
* [Optional] genCacheKey - Function that will be called to generate a custom key for reading and writing a response
* [Optional] sessionAware - Determines if the default cache key generation will
include the session token in the key. Defaults to true since this is the safest
option to prevent data leaks between users. If `genCacheKey` is also supplied
then this option is ignored.
from the cache. By default _req.originalUrl_ is used as the key.
* [Optional] statusCodeExpires - Useful if you want different status code responses to be cached for different
durations.
* [Optional] cacheStatusHeader - Default responses use `x-expeditious-cache` as the header key. Set a new string value to 
customize the header or `false` if you prefer not to write the expeditious response header.
* [Required/Optional] defaultTtl - This is required if the `expeditious` option is not passed. Represents time entries
will remain in the cache. Can be set to any value the `timestring` module accepts.
* [Required/Optional] namespace - This is required if the `expeditious` option is not passed. It's used as a namespace
to prevent cache conflicts.
* [Required/Optional] engine - This is required if the `expeditious` option is not passed. It is the storage engine for
caching.

These options are covered in greater detail in the behaviours section below.

### instance.withTtl(number)
Returns a new cache middleware that has a `defaultTtl` setting of `number`, but
inherits other values of the parent instance.

```js
const cache = require('express-expeditious')({
  namespace: 'mycache',
  defaultTtl: '30 minutes'
});

const userRoutes = require('./routes/users');

// Set cache time (defaultTtl) for /users to 15 minutes
app.use('/users', cache.withTtl('15 minutes'), userRoutes);
```

### instance.withNamespace(string)
Creates a new cache instance with the given namespace. All other settings are
inherited from the parent instance.

### instance.withTtlForStatus(ttl, statusCode)
Creates a new cache instance with the given ttl for a specific status code.
All other settings are inherited from the parent instance. Previously supplied
values for `statusCodeExpires` will be used, but the values you pass to this
function will override if a conflict in values is found.

### instance.withCondition(function)
Returns a new cache middleware that has a `shouldCache` setting of its parent
overwritten by the passed function. Passing nothing will create an instance
without a `shouldCache` entry. Other settings are inherited.

### instance.withCacheKey(function)
Returns a new cache middleware that has a `genCacheKey` setting of its parent
overwritten by the passed function. Passing nothing will create an instance
without a `genCacheKey` entry. Other settings are inherited.

### instance.withSessionAwareness([boolean])
Returns a new cache instance that either respects or ignores sessions. Pass
_true_ to create a clone of the original instance, but ignore sessions. Passing
_false_ will create an instance that will include session IDs in generated cache
keys. Passing no arguments is treated the same as passing _true_.

NOTE: If you supply a `genCacheKey` or `withCacheKey` option then this option
will not apply since you have chosen to generate cache keys manually.

### instance.flush([string, ]callback)
Deletes all cache entries associated with this middleware namespace and fires
the callback once complete. If you supply a _string_ for the first parameter
this will be passed to the flush function to target specific keys.


## Behaviours

### When to use the Cache (_shouldCache_ or _withCondition_)

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
const cache = expressExpeditious({
  defaultTtl: 30000,
  namespace: 'mycache',

  shouldCache: function (req) {
    // by default this middleware will cache all successful PUT requests
    return 'put' === req.method.toLowerCase();
  }
});

const cacheWhenNoSessionExists = cache.withCondition((req, res) => {
  // if req.session is not found then the middleware will cache this request
  return req.hasOwnProperty('session') === false;
});
```

You can also use the _statusCodeExpires_ (see Status Code Variations below)
to determine if you would like to cache a non 200 response.


### Cache Key Generation (_genCacheKey_ or _withCacheKey_)

#### Default
The default cache key is generated using:

* req.method
* req.session.id (if you are using `express-session`)
* req.originalUrl

Here's a sample cache key from an application or route that's using
`express-session`:

```
GET-fa0391d0a99ca3693bb8d658feabd28b-/cached
```

And here's one not using `express-session`:

```
GET-/cached
```

#### Custom
You can define custom a custom key for incoming requests by providing a
_genCacheKey_ option when creating _express-expeditious_ instances.

Here's an example for an API that has versioning based on a header:

```js
const cache = expressExpeditious({
  defaultTtl: 30000,
  namespace: 'mycache',

  // cache key is based on a session id, api version, method, and url
  genCacheKey: function (req, res) {
    const sessionId = req.session.id;
    const version = req.headers['x-api-version'];
    const resource = req.originalUrl;
    const method = req.method;

    // Could also use res to access etag etc.
    return `${method}-${resource}-${version}-${sessionId}`;
  }
});

// this is similar to the default key generation in this middleware, but is
// simply provided for the sake of an example here - there's no need to do this
const versionlessCache = cache.withCacheKey((req, res) => {
  const sessionId = req.session.id;
  const resource = req.originalUrl;
  const method = req.method;

  return `${method}-${resource}-${sessionId}`;
});
```

### Hit/Miss Header (_cacheStatusHeader_)

#### Default
An `x-expeditious-cache` header is returned in each response with the value of
`hit` or `miss` to indicate if the request was served by the cache.

#### Custom
Passing the `cacheStatusHeader` option can change the name of the header from
`x-expeditious-cache` to a value of your choosing by passing a string. You can
also pass the boolean value `false` to disable the header entirely.

```js
const cache = expressExpeditious({
  defaultTtl: '1 hour',
  namespace: 'mycache',

  // Disable sending the header
  cacheStatusHeader: false
})

const cache = expressExpeditious({
  defaultTtl: '1 minute',
  namespace: 'my-other-cache',

  // Change the header name
  cacheStatusHeader: 'x-cache-status'
})
```


### Status Code Variations (_statusCodeExpires_ or _withTtlForStatus_)

#### Default
The default behaviour for _express-expeditious_ is to cache responses that have
a status code of 200. All other status codes will not be cached.

#### Custom
To cache non 200 responses and have different cache timeout (ttl) values for
different status codes, simply add the _statusCodeExpires_ option, and specify
the ttl value you would like to use for a particular status code in
milliseconds or as a `timestring` compatible value.

An example is provided below:

```js
const cache = expressExpeditious({
  defaultTtl: '1 hour',
  namespace: 'mycache',

  // 500 errors will be cached for 60 seconds, and 404s will be cached for 5
  // minutes. 200 responses are cached for 1 hour due to defaultTtl
  statusCodeExpires: {
    404: '5 minutes',
    500: 60 * 1000 // 1 minute in milliseconds
  }
});

app.get('/users', (req, res) => {
  res.json({
    message: `You want a list of all users? We should implement that feature... `
  });
})

app.get('/users/:id', cache.withTtlForStatus('10 minutes', 400), (req, res) => {
  if (req.params.id.match(/^[0-9]+$/)) {
    // This response will be cached for an 10 minutes due to being a 400 status
    res.status(400).json({
      message: 'Hmm, that ID is invalid., IDs should have numbers only.'
    })
  } else {
    // This will be cached for an hour since it's a 200 response
    res.json({
      message: `You wanted user with ID ${req.params.id}. We should implement that feature... `
    });
  }
})
```


## CHANGELOG
[Click here](https://github.com/evanshortiss/express-expeditious/blob/master/CHANGELOG.md) to see the CHANGELOG.md file.


## Contributing
Contributions are welcome and encouraged. Ensure you add or remove tests as
needed, and verify the build is passing for your Pull Request.
