'use strict';

var expect = require('chai').expect
  , sinon = require('sinon');

describe('verify-options', function () {

  var mod = require('../lib/verify-options');

  it('should throw AssertionError - invalid opts.expeditious', function () {
    expect(mod.bind(mod, {
      expeditious: null
    })).to.throw('opts.expeditious');
  });

  it('should throw AssertionError - invalid opts.shouldCache', function () {
    var iomStub = sinon.stub().returns(true);

    expect(mod.bind(mod, {
      expeditious: {
        isObjectMode: iomStub
      },
      shouldCache: 'nope'
    })).to.throw('opts.shouldCache should be a function');
  });

  it('should throw AssertionError - invalid opts.genCacheKey', function () {
    expect(mod.bind(mod, {
      expeditious: {},
      genCacheKey: 'nope'
    })).to.throw('opts.genCacheKey should be a function if provided');
  });

  it('should throw AssertionError - invalid opts.expeditious', function () {
    expect(mod.bind(mod, {
      expeditious: null,
    })).to.throw('opts.expeditious must be an object');
  });

  it('should pass verification', function () {
    var iomStub = sinon.stub();

    iomStub.returns(true);

    mod({
      expeditious: {
        isObjectMode: iomStub
      },
      genCacheKey: function () {},
      shouldCache: function () {},
    });
  });

});
