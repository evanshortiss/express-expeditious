'use strict';

var expect = require('chai').expect;

describe('cache-locks', function () {

  var mod;
  var RESOURCE_NAME = 'reosurce-thingy';

  beforeEach(function () {
    mod = require('require-uncached')('lib/cache-locks');
  });

  it('should add a lock', function () {
    mod.addLock(RESOURCE_NAME);

    expect(mod.isLocked(RESOURCE_NAME)).to.be.true;
  });

  it('should remove a lock', function () {
    mod.addLock(RESOURCE_NAME);

    mod.removeLock(RESOURCE_NAME);

    expect(mod.isLocked(RESOURCE_NAME)).to.be.false;
  });

});
