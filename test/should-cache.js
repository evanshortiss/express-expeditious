'use strict';

var expect = require('chai').expect
  , sinon = require('sinon');

describe('should-cache', function () {

  var mod = require('lib/should-cache')
    , shouldCacheStub;

  beforeEach(function () {
    shouldCacheStub = sinon.stub();
  });

  it('should return true using custom function', function () {
    var instance = mod({
      shouldCache: shouldCacheStub
    });

    var args = {
      method: 'PUT'
    };

    shouldCacheStub.returns(true);

    var ret = instance(args);

    expect(ret).to.be.true;
    expect(shouldCacheStub.getCall(0).args[0]).to.equal(args);
  });

  it('should return false using custom function', function () {
    var instance = mod({
      shouldCache: shouldCacheStub
    });

    var args = {
      method: 'HEAD'
    };

    shouldCacheStub.returns(false);

    var ret = instance(args);

    expect(ret).to.be.false;
    expect(shouldCacheStub.getCall(0).args[0]).to.equal(args);
  });

  ['PUT', 'POST', 'DELETE', 'OPTIONS', 'HEAD'].forEach(function (type) {
    it('should return false for ' + type + ' requests by default', function () {
      var instance = mod({});

      var ret = instance({
        method: type
      });

      expect(ret).to.be.false;
    });
  });

  it('should return true for GET requests by default', function () {
    var instance = mod({
      method: 'GET'
    });

    var ret = instance({
      method: 'GET'
    });

    expect(ret).to.be.true;
  });

  it('should return true for GET request with lowercase "method"', function () {
    var instance = mod({});

    var ret = instance({
      method: 'get'
    });

    expect(ret).to.be.true;
  });

});
