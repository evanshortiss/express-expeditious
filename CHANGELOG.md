# CHANGELOG

Dates are YYYY-MM-DD.

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
