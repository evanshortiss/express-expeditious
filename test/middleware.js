'use strict';

var supertest = require('supertest')
  , expect = require('chai').expect
  , sinon = require('sinon');

describe('cache middleware', function () {

  var mod
    , app
    , request
    , slowModuleStub
    , shouldCacheStub
    , engineStubs
    , PROCESSING_DELAY = 50;

  beforeEach(function () {
    app = require('express')();

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
    };

    shouldCacheStub = sinon.stub();

    // A fake module that we simulate slow responses from
    slowModuleStub = sinon.stub();

    // Create an instance
    mod = require('lib/middleware');

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
    );

    // Convuluted function to simulate slow loading, chunked responses
    // We wrap with the first setTimeout to mimic a slow loading request/db
    // call. The second setTimeout mimics a stream that is taking a while to
    // write data which is necessary to test the ability of this module to
    // intelligently decide if it should buffer a response in memory to be
    // cached based on the fact it might already be buffering the same response
    function onReq (req, res) {
      setTimeout(function () {
        slowModuleStub(function (err) {
          if (err) {
            res.status(500).end('500 error');
          } else {
            res.write('o', 'utf8');

            // Simulate a slow stream
            setTimeout(function () {
              res.end('k');
            }, 50);
          }
        });
      }, PROCESSING_DELAY);
    }

    app.get('/404', (req, res) => {
      res.status(404).end('404 test for a non cached response');
    });
    app.get('/*', onReq);
    app.post('/*', onReq);

    request = supertest(app);
  });

  it('should return data in the standard fashion', function (done) {
    engineStubs.get.yields(null, null);
    engineStubs.set.yields(null);
    slowModuleStub.yields(null);
    shouldCacheStub.returns(true);

    request
      .get('/')
      .expect(200)
      .end(function (err, res) {

        // Need a timeout since the "cache.set" might be called a few
        // milliseconds after the response has finished
        setTimeout(() => {
          expect(engineStubs.get.calledOnce).to.be.true;
          expect(engineStubs.set.calledOnce).to.be.true;
          expect(shouldCacheStub.calledOnce).to.be.true;
          expect(slowModuleStub.calledOnce).to.be.true;

          expect(res.text).to.equal('ok');

          done();
        }, 100);

      });
  });


  it('should use cache for the second call', function (done) {
    slowModuleStub.yields(null);
    shouldCacheStub.returns(true);
    engineStubs.set.yields(null);
    engineStubs.get.yields(null, null);

    request
      .get('/use-cache-for-subsequent-call')
      .expect(200)
      .expect('x-expeditious-cache', 'miss')
      .end(function (err, firstRes) {
        expect(err).to.equal(null);

        setTimeout(function () {
          // On the second call we want the cached data from the first call to
          // be returned to us
          engineStubs.get.yields(
            null,
            engineStubs.set.getCall(0).args[1]
          );

          request
            .get('/use-cache-for-subsequent-call')
            .expect('x-expeditious-cache', 'hit')
            .expect(200)
            .end(function (err, secondRes) {
              expect(err).to.be.null;
              expect(firstRes.text).to.equal(secondRes.text);

              expect(slowModuleStub.calledOnce).to.be.true;
              expect(engineStubs.get.callCount).to.equal(2);
              expect(engineStubs.set.calledOnce).to.be.true;
              expect(shouldCacheStub.callCount).to.equal(2);

              done();
            });
        }, 100);
    });
  });


  it('should not use the cache for any calls', function (done) {
    slowModuleStub.yields(null);
    shouldCacheStub.returns(false);

    function doRequest (callback) {
      request
        .get('/')
        .expect(200)
        .end(callback);
    }

    doRequest(function (err, firstRes) {
      expect(err).to.be.null;

      setTimeout(function () {
        doRequest(function (err, secondRes) {
          expect(err).to.be.null;
          expect(firstRes.text).to.equal(secondRes.text);

          expect(slowModuleStub.callCount).to.equal(2);
          expect(shouldCacheStub.callCount).to.equal(2);

          done();
        });
      }, 100);
    });
  });

  it('should use default route if cache.get fails', function (done) {
    slowModuleStub.yields(null);
    shouldCacheStub.returns(true);
    engineStubs.get.yields(new Error('failed to read cache'));

    request
      .get('/')
      .expect('x-expeditious-cache', 'miss')
      .expect(200)
      .end(function (err, res) {
        expect(err).to.equal(null);
        // Need a timeout since the "cache.set" might be called a few
        // milliseconds after the response has finished
        setTimeout(() => {
          expect(err).to.be.null;
          expect(slowModuleStub.calledOnce).to.be.true;
          expect(shouldCacheStub.calledOnce).to.be.true;
          expect(engineStubs.get.calledOnce).to.be.true;
          expect(engineStubs.set.calledOnce).to.be.true;
          expect(res.text).to.equal('ok');

          done();
        }, 100);
      });
  });

  it('should process request on cache.set error', function (done) {
    slowModuleStub.yields(null);
    shouldCacheStub.returns(true);
    engineStubs.get.yields(null, null);
    engineStubs.set.yields(new Error('cache.set error'), null);

    request
      .get('/cache-set-error')
      .expect(200)
      .end(function (err, res) {

        setTimeout(() => {
          expect(err).to.be.null;
          expect(slowModuleStub.calledOnce).to.be.true;
          expect(shouldCacheStub.calledOnce).to.be.true;
          expect(engineStubs.get.calledOnce).to.be.true;
          expect(engineStubs.set.calledOnce).to.be.true;
          expect(res.text).to.equal('ok');

          done();
        }, 100);
      });
  });

  it('should not call cache.set due to bad status code and no opts.statusCodeExpires being provided', function (done) {
    slowModuleStub.yields(new Error('nope!'));
    shouldCacheStub.returns(true);
    engineStubs.get.yields(null, null);


    request
      .get('/')
      .expect(500)
      .end(function (err, res) {
        expect(err).to.be.null;
        expect(slowModuleStub.calledOnce).to.be.true;
        expect(shouldCacheStub.calledOnce).to.be.true;
        expect(engineStubs.get.calledOnce).to.be.true;

        // This is the key to this test - cache should not be called at all
        expect(engineStubs.set.calledOnce).to.be.false;

        expect(res.text).to.equal('500 error');

        done();
      });
  });

  it('should only cache.set once on concurrent requests', function (done) {
    slowModuleStub.yields(null);
    shouldCacheStub.returns(true);
    engineStubs.get.yields(null, null);
    engineStubs.set.yields(null, null);

    function doRequest (callback) {
      request
        .get('/cache-set-once-only')
        .expect(200)
        .end(callback);
    }

    require('async').parallel([
      doRequest,
      doRequest
    ], function () {

      // Need a timeout since the "cache.set" might be called a few
      // milliseconds after the response has finished
      setTimeout(() => {
        expect(slowModuleStub.callCount).to.equal(2);
        expect(shouldCacheStub.callCount).to.equal(2);
        expect(engineStubs.get.callCount).to.equal(2);
        expect(engineStubs.set.callCount).to.equal(1);

        done();
      }, 100);
    });
  });

  it('should respond with a 304', function (done) {
    var fs = require('fs')
      , path = require('path');

    slowModuleStub.yields(null);
    shouldCacheStub.returns(true);
    engineStubs.get.onCall(0).yields(null, null);
    engineStubs.set.yields(null, null);

    engineStubs.get.onCall(1).yields(null, JSON.stringify({
      headers: {
        ETag: 'W/"c8-j36pDBD4000wLNnKKK96Dg"'
      },
      body: fs.readFileSync(
        path.join(__dirname, './sample-http-response.txt'),
        'utf8'
      ).replace(/\n/g, '\r')
    }));

    request
      .get('/expecting-a-304')
      .expect(200)
      .end(function () {
        request
          .get('/expecting-a-304')
          .set('if-none-match', 'W/"c8-j36pDBD4000wLNnKKK96Dg"')
          .expect(304)
          .end(done);
      });
  });

  it('should not cache since the status code is non cacheable', (done) => {
    shouldCacheStub.returns(true);
    engineStubs.get.yields(null, null);

    request
      .get('/404')
      .expect(404)
      .end(done);
  });

  it('should use the default memory engine', () => {
    mod({
      defaultTtl: 30000,
      namespace: 'expresscache'
    });
  });

});
