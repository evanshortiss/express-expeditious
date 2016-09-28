'use strict';

var expect = require('chai').expect;

describe('get-header', function () {

  var mod = require('../lib/get-header');

  it('should extract a header from the header tuples', function () {
    expect(
      mod(['etag', 'abc'], 'etag')
    ).to.equal('abc');
  });

  it('should work regardless of header name casing', function () {
    expect(
      mod(['ETag', 'abc'], 'ETAG')
    ).to.equal('abc');
  });

});
