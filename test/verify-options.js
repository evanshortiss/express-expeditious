'use strict';

var expect = require('chai').expect
  , sinon = require('sinon');

describe('verify-options', function () {

  const mod = require('lib/verify-options');

  it('should throw AssertionError - invalid opts.shouldCache', function () {
    const iomStub = sinon.stub().returns(true);

    expect(function () {
      mod({
        expeditious: {
          isObjectMode: iomStub
        },
        shouldCache: 'nope'
      });
    }).to.throw('opts.shouldCache should be a function');
  });

  it('should throw AssertionError - invalid opts.genCacheKey', function () {
    const iomStub = sinon.stub().returns(true);

    expect(function () {
      mod({
        expeditious: {
          isObjectMode: iomStub
        },
        genCacheKey: 'nope'
      });
    }).to.throw('opts.genCacheKey should be a function if provided');
  });

  it('should throw AssertionError - "namespace" required if opts.expeditious not provided', function () {
    expect(function() {
      mod({
        defaultTtl: '1 hour'
      });
    }).to.throw('opts.namespace must be a non-empty string');
  });

  it('should throw AssertionError - "defaultTtl" required if opts.expeditious not provided', function () {
    expect(function() {
      mod({
        namespace: 'tester'
      });
    }).to.throw('opts.defaultTtl must be a number');
  });

  it('should throw AssertionError - "defaultTtl" should be a string or number', function () {
    expect(function() {
      mod({
        namespace: 'tester',
        defaultTtl: {}
      });
    }).to.throw('opts.defaultTtl must be a number of milliseconds or a timestring');
  });

  it('should throw AssertionError - "statusCodeExpires" should be an object', () => {
    expect(function () {
      mod({
        defaultTtl: 30000,
        namespace: 'testing',
        statusCodeExpires: 'string is not valid'
      });
    }).to.throw('opts.statusCodeExpires should be an object');
  });

  it('should throw AssertionError - "exposeHeader" should be a boolean', () => {
    expect(function () {
      mod({
        defaultTtl: 30000,
        namespace: 'testing',
        exposeHeader: 'asdasdasd'
      });
    }).to.throw('opts.exposeHeader should be a boolean');
  });

  it('should pass verification', function () {
    var iomStub = sinon.stub();

    iomStub.returns(true);

    mod({
      expeditious: {
        isObjectMode: iomStub
      },
      statusCodeExpires: {
        404: 10000
      },
      genCacheKey: function () {},
      shouldCache: function () {}
    });
  });

});
