'use strict';

const expect = require('chai').expect;
const readFileSync = require('fs').readFileSync;
const join = require('path').join;

describe('parse-http-response', function () {

  const parse = require('lib/parse-http-response');

  it('should return an object with http data', () => {
    const ret = parse(readFileSync(join(__dirname, 'sample-http-response.txt')));

    expect(ret).to.deep.equal({
      'headers': {
        'X-Powered-By': 'Express',
        'x-expeditious-cache': 'miss',
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': '164',
        'ETag': 'W/\"a4-2p92UAB5XcSwzu9B627m6w\"',
        'Date': 'Sat, 10 Jun 2017 01:09:39 GMT',
        'Connection': 'keep-alive'
      },
      upgrade: false,
      versionMajor: 1,
      versionMinor: 1,
      statusCode: 200,
      statusMessage: 'OK',
      shouldKeepAlive: true,
      body: '<!DOCTYPE html><html lang=\"en\"><head><title>express-expeditious</title></head><body><h2>express-expeditious example server</h2><p>You loaded /ping</p></body></html>'
    });
  });

});
