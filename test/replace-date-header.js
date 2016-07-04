'use strict';

var fs = require('fs')
  , path = require('path')
  , expect = require('chai').expect;

describe('replace-date-header', function () {

  var mod = require('../lib/replace-date-header');

  it('should return the same string as passed', function () {
    var txt = 'testing with the date: stuff, uh, stuff';
    var ret = mod(txt);

    expect(ret).to.equal(txt);
  });

  it('should return a string with a new date value', function () {
    var html = fs.readFileSync(
      path.join(__dirname, './sample-http-response.txt'),
      'utf8'
    );

    var ret = mod(html);

    // TODO: be less lazy and make a "real" assertion here
    expect(ret).to.not.equal(html);
    expect(ret).to.contain('UTC');
  });

});
