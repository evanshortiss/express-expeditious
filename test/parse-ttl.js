'use strict';

const expect = require('chai').expect;

describe('parse-ttl', function () {

  const parseTtl = require('lib/parse-ttl');

  it('should return 1000 for "1 second" input', () => {
    expect(parseTtl('1 second')).to.equal(1000);
  });

  it('should return 1,800,000 for "30 minutes" input', () => {
    expect(parseTtl('30 minutes')).to.equal(1800000);
  });

  it('should return passed in number when passed a number', () => {
    const input = 20000;
    expect(parseTtl(input)).to.equal(input);
  });

  it('should throw an AssertionError', () => {
    expect(function () {
      parseTtl('garbage input');
    }).to.throw(require('assert').AssertionError, 'could not parse');
  });

});
