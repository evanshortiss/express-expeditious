'use strict';

var expect = require('chai').expect
  , sinon = require('sinon');

describe('cache-key', function () {

  var mod, genKeyStub, ORIGINAL_URL;

  beforeEach(function () {
    mod = require('lib/cache-key');
    genKeyStub = sinon.stub();
    ORIGINAL_URL = '/cars?make=vw';
  });

  it('should create a key with a custom function', function () {
    var CUSTOM_KEY = 'testing123';

    genKeyStub.returns(CUSTOM_KEY);

    var instance = mod({
      genCacheKey: genKeyStub
    });

    var key = instance({
      originalUrl: ORIGINAL_URL,
      method: 'GET'
    });

    expect(key).to.equal(CUSTOM_KEY);
  });

  it('should create a key with using default behaviour', function () {
    var instance = mod({});

    expect(
      instance({
        originalUrl: ORIGINAL_URL,
        method: 'GET'
      })
    ).to.equal('GET-' + ORIGINAL_URL);
  });

  it('should create a key without a session token', function () {
    var instance = mod({});

    expect(
      instance({
        originalUrl: ORIGINAL_URL,
        method: 'GET'
      })
    ).to.equal('GET-' + ORIGINAL_URL);
  });

  it('should create a key with a session due to opts.sessionAware = true', function () {
    var instance = mod({
      sessionAware: true
    });

    expect(
      instance({
        originalUrl: ORIGINAL_URL,
        method: 'GET',
        session: {id: '12345'}
      })
    ).to.equal('GET-12345-' + ORIGINAL_URL);
  });

  it('should create a key and exclude the session due to opts.sessionAware = false', function () {
    var instance = mod({
      sessionAware: false
    });

    expect(
      instance({
        originalUrl: ORIGINAL_URL,
        method: 'GET',
        session: {id: '12345'}
      })
    ).to.equal('GET-' + ORIGINAL_URL);
  });

});
