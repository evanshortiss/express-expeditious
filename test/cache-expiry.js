'use strict';

var expect = require('chai').expect
  , sinon = require('sinon');

describe('cache-expiry', function () {

  var mod = require('../lib/cache-expiry');
  var getDefaultTtlStub;

  beforeEach(function () {
    getDefaultTtlStub = sinon.stub();
  });

  it('should use the custom statusCodeExpires value', function () {
    var instance = mod({
      statusCodeExpires: {
        404: 1500
      }
    });

    var ret = instance('404');

    expect(ret).to.equal(1500);
  });

  it('should use the default expeditious ttl value', function () {
    var instance = mod({
      expeditious: {
        getDefaultTtl: getDefaultTtlStub
      }
    });

    getDefaultTtlStub.returns(500);

    var ret = instance('500');

    expect(ret).to.equal(500);
  });

});
