'use strict'

/* eslint-env mocha */

const supertest = require('supertest')
const expect = require('chai').expect
const sinon = require('sinon')
const EventEmitter = require('events')
const http = require('http')

describe('cache middleware', function () {
  var mod
  var app
  var request
  var slowModuleStub
  var shouldCacheStub
  var engineStubs
  var PROCESSING_DELAY = 50

  beforeEach(function () {
    app = require('express')()

    engineStubs = {
      set: sinon.stub(),
      get: sinon.stub(),
      del: sinon.stub(),
      keys: sinon.stub(),
      ttl: sinon.stub(),
      flush: sinon.stub(),
      isObjectMode: sinon.stub().returns(true),
      getKeyWithoutNamespace: sinon.stub(),
      getNamespaceFromKey: sinon.stub()
    }

    shouldCacheStub = sinon.stub()

    // A fake module that we simulate slow responses from
    slowModuleStub = sinon.stub()

    // Create an instance
    mod = require('lib/middleware')

    // Add our cache to the express app
    app.use(
      mod(
        {
          shouldCache: shouldCacheStub,
          defaultTtl: 5000,
          namespace: 'expresstest',
          engine: engineStubs
        }
      )
    )

    // Convuluted function to simulate slow loading, chunked responses
    // We wrap with the first setTimeout to mimic a slow loading request/db
    // call. The second setTimeout mimics a stream that is taking a while to
    // write data which is necessary to test the ability of this module to
    // intelligently decide if it should buffer a response in memory to be
    // cached based on the fact it might already be buffering the same response
    function onReq (req, res) {
      setTimeout(function () {
        slowModuleStub(function (code) {
          if (code === 500) {
            res.status(500).end('500 error')
          } else if (code === 304) {
            res.set('etag', 'ETAG')
            res.status(304).end()
          } else {
            res.write('o', 'utf8')

            // Simulate a slow stream
            setTimeout(function () {
              res.end('k')
            }, 50)
          }
        })
      }, PROCESSING_DELAY)
    }

    app.get('/404', (req, res) => {
      res.status(404).end('404 test for a non cached response')
    })
    app.get('/*', onReq)
    app.post('/*', onReq)

    request = supertest(app)
  })

  it('should return data in the standard fashion', function (done) {
    engineStubs.get.yields(null, null)
    engineStubs.set.yields(null)
    slowModuleStub.yields(200)
    shouldCacheStub.returns(true)

    request
      .get('/')
      .expect(200)
      .end(function (err, res) {
        expect(err).to.equal(null)
        // Need a timeout since the "cache.set" might be called a few
        // milliseconds after the response has finished
        setTimeout(() => {
          expect(engineStubs.get.calledOnce).to.equal(true)
          expect(engineStubs.set.calledOnce).to.equal(true)
          expect(shouldCacheStub.calledOnce).to.equal(true)
          expect(slowModuleStub.calledOnce).to.equal(true)

          expect(res.text).to.equal('ok')

          done()
        }, 100)
      })
  })

  it('should use cache for the second call', function (done) {
    slowModuleStub.yields(200)
    shouldCacheStub.returns(true)
    engineStubs.set.yields(null)
    engineStubs.get.yields(null, null)

    request
      .get('/use-cache-for-subsequent-call')
      .expect(200)
      .expect('x-expeditious-cache', 'miss')
      .end(function (err, firstRes) {
        expect(err).to.equal(null)

        setTimeout(function () {
          // On the second call we want the cached data from the first call to
          // be returned to us
          engineStubs.get.yields(
            null,
            engineStubs.set.getCall(0).args[1]
          )

          request
            .get('/use-cache-for-subsequent-call')
            .expect('x-expeditious-cache', 'hit')
            .expect(200)
            .end(function (err, secondRes) {
              expect(err).to.equal(null)
              expect(firstRes.text).to.equal(secondRes.text)

              expect(slowModuleStub.calledOnce).to.equal(true)
              expect(engineStubs.get.callCount).to.equal(2)
              expect(engineStubs.set.calledOnce).to.equal(true)
              expect(shouldCacheStub.callCount).to.equal(2)

              done()
            })
        }, 100)
      })
  })

  it('should not use the cache for any calls', function (done) {
    slowModuleStub.yields(200)
    shouldCacheStub.returns(false)

    function doRequest (callback) {
      request
        .get('/')
        .expect(200)
        .end(callback)
    }

    doRequest(function (err, firstRes) {
      expect(err).to.equal(null)

      setTimeout(function () {
        doRequest(function (err, secondRes) {
          expect(err).to.equal(null)
          expect(firstRes.text).to.equal(secondRes.text)

          expect(slowModuleStub.callCount).to.equal(2)
          expect(shouldCacheStub.callCount).to.equal(2)

          done()
        })
      }, 100)
    })
  })

  it('should use default route if cache.get fails', function (done) {
    slowModuleStub.yields(200)
    shouldCacheStub.returns(true)
    engineStubs.get.yields(new Error('failed to read cache'))

    request
      .get('/')
      .expect('x-expeditious-cache', 'miss')
      .expect(200)
      .end(function (err, res) {
        expect(err).to.equal(null)
        // Need a timeout since the "cache.set" might be called a few
        // milliseconds after the response has finished
        setTimeout(() => {
          expect(err).to.equal(null)
          expect(slowModuleStub.calledOnce).to.equal(true)
          expect(shouldCacheStub.calledOnce).to.equal(true)
          expect(engineStubs.get.calledOnce).to.equal(true)
          expect(engineStubs.set.calledOnce).to.equal(true)
          expect(res.text).to.equal('ok')

          done()
        }, 100)
      })
  })

  it('should process request on cache.set error', function (done) {
    slowModuleStub.yields(200)
    shouldCacheStub.returns(true)
    engineStubs.get.yields(null, null)
    engineStubs.set.yields(new Error('cache.set error'), null)

    request
      .get('/cache-set-error')
      .expect(200)
      .end(function (err, res) {
        setTimeout(() => {
          expect(err).to.equal(null)
          expect(slowModuleStub.calledOnce).to.equal(true)
          expect(shouldCacheStub.calledOnce).to.equal(true)
          expect(engineStubs.get.calledOnce).to.equal(true)
          expect(engineStubs.set.calledOnce).to.equal(true)
          expect(res.text).to.equal('ok')

          done()
        }, 100)
      })
  })

  it('should not call cache.set due to bad status code and no opts.statusCodeExpires being provided', function (done) {
    slowModuleStub.yields(500)
    shouldCacheStub.returns(true)
    engineStubs.get.yields(null, null)

    request
      .get('/')
      .expect(500)
      .end(function (err, res) {
        expect(err).to.equal(null)
        expect(slowModuleStub.calledOnce).to.equal(true)
        expect(shouldCacheStub.calledOnce).to.equal(true)
        expect(engineStubs.get.calledOnce).to.equal(true)

        // This is the key to this test - cache should not be called at all
        expect(engineStubs.set.calledOnce).to.equal(false)

        expect(res.text).to.equal('500 error')

        done()
      })
  })

  it('should only cache.set once on concurrent requests', function (done) {
    slowModuleStub.yields(200)
    shouldCacheStub.returns(true)
    engineStubs.get.yields(null, null)
    engineStubs.set.yields(null, null)

    function doRequest (callback) {
      request
        .get('/cache-set-once-only')
        .expect(200)
        .end(callback)
    }

    require('async').parallel([
      doRequest,
      doRequest
    ], function () {
      // Need a timeout since the "cache.set" might be called a few
      // milliseconds after the response has finished
      setTimeout(() => {
        expect(slowModuleStub.callCount).to.equal(2)
        expect(shouldCacheStub.callCount).to.equal(2)
        expect(engineStubs.get.callCount).to.equal(2)
        expect(engineStubs.set.callCount).to.equal(1)

        done()
      }, 100)
    })
  })

  it('should respond with a 304 due to matching etag in second request', function (done) {
    slowModuleStub.yields(200)
    shouldCacheStub.returns(true)
    engineStubs.get.onCall(0).yields(null, null)
    engineStubs.set.yields(null, null)

    engineStubs.get.onCall(1).yields(null, JSON.stringify({
      headers: 'HTTP/1.1 200 Not Modified\r\nX-Powered-By: Express\r\nx-expeditious-cache: hit\r\nETag: W/"11a-5VdvADh/zRWypLIWVzof8gO9s3U"',
      data: JSON.stringify(Buffer.from('\r\n Hello World'))
    }))

    request
      .get('/expecting-a-304')
      .expect(200)
      .end(function () {
        request
          .get('/expecting-a-304')
          .set('if-none-match', 'W/"11a-5VdvADh/zRWypLIWVzof8gO9s3U"')
          .expect(304)
          .end(done)
      })
  })

  it('should respond with a 304 and generate a 304 cache entry', (done) => {
    slowModuleStub.yields(304)
    shouldCacheStub.returns(true)
    engineStubs.get.yields(null, null)

    request
      .get('/expecting-a-304')
      .expect(304)
      .end((err) => {
        setTimeout(() => {
          expect(err).to.equal(null)
          expect(engineStubs.set.calledOnce).to.equal(true)
          expect(engineStubs.set.getCall(0).args[0]).to.equal(
            'expresstest:GET-/expecting-a-304-ETAG'
          )
          done()
        }, 200)
      })
  })

  it('should not cache since the status code is non cacheable', (done) => {
    shouldCacheStub.returns(true)
    engineStubs.get.yields(null, null)

    request
      .get('/404')
      .expect(404)
      .end(done)
  })

  it('should use the default memory engine', () => {
    mod({
      defaultTtl: 30000,
      namespace: 'expresscache'
    })
  })

  it('should wait for a socket', (done) => {
    // This test mocks out a request flow. We need to simulate a request that
    // doesn't have a response socket bound (not sure how this can happen) but
    // appears to be possible based on issue #28

    engineStubs.get.yields(null, null)

    const mw = mod({
      defaultTtl: 5000,
      namespace: 'expresstest',
      engine: engineStubs
    })

    const req = {
      on: sinon.stub(),
      headers: {},
      originalUrl: '/test/socket-event',
      url: '/socket-event',
      method: 'GET'
    }

    const res = new EventEmitter()
    const responseText = 'all good'

    res.set = sinon.stub()
    res.end = function (data) {
      res.socket.write(data)
    }

    // Trigger the socket bind event so it occurs shortly
    // after the middleware has configured our request.
    // If the event handlers are bound correctly in middleware.js
    // then socket.write will be called
    setTimeout(() => {
      res.socket = {
        write: (data) => {
          expect(engineStubs.get.calledOnce).to.equal(true)
          expect(res.set.calledOnce).to.equal(true)
          expect(data.toString()).to.equal(responseText)
          done()
        }
      }
      res.emit('socket')
    }, 100)

    mw(req, res, () => res.end(responseText))
  })

  it('should not expose header', done => {
    app = require('express')()

    // Create an instance
    mod = require('lib/middleware')

    // Add our cache to the express app
    app.use(
      mod(
        {
          defaultTtl: 5000,
          namespace: 'expresstest',
          cacheStatusHeader: false
        }
      )
    )

    app.get('/*', (req, res) => {
      res.json({})
    })

    supertest(app)
      .get('/test')
      .end((err, res) => {
        expect(err).to.equal(null)
        expect(res.headers['x-expeditious-cache']).to.equal(undefined)
        done()
      })
  })

  it('should expose custom header', done => {
    app = require('express')()

    // Create an instance
    mod = require('lib/middleware')

    // Add our cache to the express app
    app.use(
      mod(
        {
          defaultTtl: 5000,
          namespace: 'expresstest',
          cacheStatusHeader: 'X-Cool-Cached'
        }
      )
    )

    app.get('/*', (req, res) => {
      res.json({})
    })

    supertest(app)
      .get('/test')
      .end((_err, res) => {
        expect(res.headers['x-cool-cached']).to.equal('miss')
        done()
      })
  })

  it('should not cache a request that errors', (done) => {
    const REQ_TIMEOUT = 250
    const ASSERT_TIMEOUT = 1000

    engineStubs.get.yields(null, null)
    shouldCacheStub.returns(true)

    let clientReq = null
    const app = require('express')()
    const port = Math.floor(Math.random() * 60000) + 1024

    app.use(
      mod({
        shouldCache: shouldCacheStub,
        defaultTtl: 5000,
        namespace: 'expresstest',
        engine: engineStubs
      })
    )

    app.post('/', (req, res) => {
      // Set the client to kill connection during the response
      setTimeout(() => clientReq.socket.end(), REQ_TIMEOUT)

      setTimeout(() => res.write('O'), REQ_TIMEOUT / 2)
      setTimeout(() => res.write('K'), REQ_TIMEOUT)
      setTimeout(() => res.end(), REQ_TIMEOUT * 2)
    })

    const server = app.listen(port, (err) => {
      if (err) {
        return done(err)
      }

      // Make a http request, then abort it before the server responds
      clientReq = http.request({
        port: port,
        host: 'localhost',
        path: '/',
        method: 'POST'
      }, (res) => {})
      clientReq.on('error', () => {}) // Required to prevent uncaught expection
      clientReq.write('hello')

      setTimeout(() => {
        try {
          // Should try read from cache to fulfill the request
          expect(engineStubs.get.called).to.equal(true)
          // Should not cache since request was aborted by the client
          expect(engineStubs.set.called).to.equal(false)
          // This is called if a cache miss occurs as is the case here
          expect(shouldCacheStub.called).to.equal(true)

          server.close(done)
        } catch (e) {
          server.close(() => {
            done(e)
          })
        }
      }, ASSERT_TIMEOUT)
    })
  })
})
