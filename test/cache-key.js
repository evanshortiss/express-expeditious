'use strict';

var expect = require('chai').expect
  , sinon = require('sinon');

describe('cache-key', function () {

  var mod, genKeyStub, ORIGINAL_URL;

  beforeEach(function () {
    mod = require('../lib/cache-key');
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
    ).to.equal('GET - ' + ORIGINAL_URL);
  });

});
