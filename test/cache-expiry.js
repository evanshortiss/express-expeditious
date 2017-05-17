'use strict';

var expect = require('chai').expect
  , sinon = require('sinon');

describe('cache-expiry', function () {

  var mod = require('lib/cache-expiry');
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

  it(
    'should return 0 due to bad status code and having no custom cache times',
    function () {
      var instance = mod({
        expeditious: {
          getDefaultTtl: getDefaultTtlStub
        }
      });

      expect(instance('500')).to.equal(0);
    }
  );

  it(
    'should return 0 due to bad status code and having no specific cache time',
    function () {
      var instance = mod({
        statusCodeExpires: {
          '503': 100
        },
        expeditious: {
          getDefaultTtl: getDefaultTtlStub
        }
      });

      expect(instance('500')).to.equal(0);
    }
  );

});
