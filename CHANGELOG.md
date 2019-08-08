# CHANGELOG

Dates are YYYY-MM-DD.

## 5.1.1 / 2019-08-09
* Fixes a bug that caused aborted/cancelled requests to create empty cache entries.

## 5.1.0 / 2019-05-10
* Add `cacheStatusHeader` option to rename or disable `x-expeditious-cache'`
headers
* Fix issue `res.socket` was `undefined` when attempting to write
* Update dependencies and devDependencies for bug/security fixes

## 5.0.0 / 2018-11-27
* Drop support for Node.js versions less than 6.x
* Enable Greenkeeper and update dependencies

## 4.0.0 / 2018-06-18
* Fix issues related to caching binary and compressed responses.
* Cached body is now stored as a Buffer
* Headers are stored as a string

## 3.3.0 / 2017-04-02
* Update signature of `genCacheKey(req)` to `genCacheKey(req, res)`

## 3.2.1 / 2017-12-01
* Update to use expeditious@1.0.1 internally.
* Use `standard` module for linting.
* Remove use of `xtend` in facour of `Object.assign`.
* Fix cache expiry time decision logic and increase coverage.

## 3.2.0 / 2017-07-06
* TypeScript support added via type definitions file.
* New example provided that uses TypeScript.

## 3.1.2 / 2017-06-30
* Fix a bug where `timestring` values passed in `opts.defaultTtl` were ignored.

## 3.1.1 / 2017-06-12
* Fix bug where the `socket.write` callback was not fired. This affected certain
cases such as `res.render`.
* Add unit test for `parse-http-response` code.
* Fix bug where `x-expeditious-cache` could return `miss` when it should be a
`hit`.
* Fix bug where sever would respond with 304 to requests without `if-none-match`
header in their payload. This manifested itself if the first incoming request
after cache expiry resulted in a 304 and would cause clients that were new, and
therefore needed a 200 with data, to receive a 304.

## 3.1.0 / 2017-05-22
* Restructure source code.
* Minor performance improvements.
* Add `sessionAware` option and `withSessionAwareness()` function to facilitate
turning `express-session` awareness on and off as needed.
* Add API sugar to easily create instances with different settings.
* Fix bug where `transfer-encoding: chunked` responses cloud be corrupted.
* Add options to enable/disable session awareness.
* Add `x-expeditious-cache` response header to indicate cache `hit` or `miss` to
calling clients.
* Support `timestring` format for setting cache `defaultTtl`, e.g `'1 hour'`.
* Update example code and benchmark information.

## 3.0.0 / 2017-05-08
* Drop support for node.js versions below v4.4.2.
* Persist original "Date" headers.
* Simplify module initialisation.
* Add benchmarks and results to README.
* Fix bug whereby the response data that generated a 304 was not cached.
* Add better benchmark and examples.


## Before 2017-04-28
* 2.1.3 - Use coveralls. Migrate to TravisCI. Fix session issue. Update example.

* 2.1.2 - Add warning about potential for session leak

* 2.1.1 - Ensure cache lock is removed when a response is not to be cached

* 2.1.0 - Log details when `engine.set` calls fail

* 2.0.0 - By default only 200 responses are cached now. Use _statusCodeExpires_
to enable caching of non 200 responses.

* 1.0.0 - Add ETag support.

* <1.0.0 - Ye Olde Days. Expected objectMode to be "false" on expeditious
instances. Did not support ETags. Was _not_ `express-session` safe.
