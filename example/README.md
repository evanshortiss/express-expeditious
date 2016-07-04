express-expeditious example
===========================

## Running the Example

```
git clone git@github.com:evanshortiss/express-expeditious.git
cd express-expeditious
npm install
node example/server.js
```

## Making Requests

The server exposes two endpoints:

* http://127.0.0.1:3000/cached
* http://127.0.0.1:3000/not-cached

Hitting the */cached* endpoint once will take approximately 2 seconds to return
a response. Successive calls within the next 15 seconds will respond
immediately since _express-expeditious_ is serving the response instead of the
route handler!

Hitting the */not-cached* endpoint will always take 2 seconds to return a
result since it does not use _express-expeditious_.

## Sample Calls
Below is two timed requests to this server, the first taking approx 2 seconds,
and the second responding immediately.

```
$ time curl -s http://127.0.0.1:3000/cached > /dev/null

real	0m2.022s
user	0m0.004s
sys	0m0.010s
$ time curl -s http://127.0.0.1:3000/cached > /dev/null

real	0m0.016s
user	0m0.003s
sys	0m0.006s

```
