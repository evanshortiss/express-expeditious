# CHANGELOG

Dates are YYYY-MM-DD.

## 3.1.0 / 2017-05-18
* Restructure source code.
* Add API sugar to easily create instances with different cache settings.
* Handle `transfer-encoding: chunked` correctly.
* Add options to enable/disable session awareness.
* Support `timestring` format for setting cache `defaultTtl`, e.g `'1 hour'`.
* Update example code.

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
instances and did not support ETags.
