'use strict'

/* eslint-env mocha */

var expect = require('chai').expect
var sinon = require('sinon')

describe('should-cache', function () {
  var mod = require('lib/should-cache')
  var shouldCacheStub

  beforeEach(function () {
    shouldCacheStub = sinon.stub()
  })

  it('should return true using custom function', function () {
    var instance = mod({
      shouldCache: shouldCacheStub
    })

    var args = {
      method: 'PUT'
    }

    shouldCacheStub.returns(true)

    var ret = instance(args)

    expect(ret).to.equal(true)
    expect(shouldCacheStub.getCall(0).args[0]).to.equal(args)
  })

  it('should return false using custom function', function () {
    var instance = mod({
      shouldCache: shouldCacheStub
    })

    var args = {
      method: 'HEAD'
    }

    shouldCacheStub.returns(false)

    var ret = instance(args)

    expect(ret).to.equal(false)
    expect(shouldCacheStub.getCall(0).args[0]).to.equal(args)
  });

  ['PUT', 'POST', 'DELETE', 'OPTIONS', 'HEAD'].forEach(function (type) {
    it('should return false for ' + type + ' requests by default', function () {
      var instance = mod({})

      var ret = instance({
        method: type
      })

      expect(ret).to.equal(false)
    })
  })

  it('should return true for GET requests by default', function () {
    var instance = mod({
      method: 'GET'
    })

    var ret = instance({
      method: 'GET'
    })

    expect(ret).to.equal(true)
  })

  it('should return true for GET request with lowercase "method"', function () {
    var instance = mod({})

    var ret = instance({
      method: 'get'
    })

    expect(ret).to.equal(true)
  })
})
