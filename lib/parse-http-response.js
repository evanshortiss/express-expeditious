'use strict';

var noop = require('./noop')
  , xtend = require('xtend')
  , getHeader = require('./get-header')
  , HTTPParser = require('http-parser-js').HTTPParser;

/**
 * Since we want to support any HTTP methods (res.sendFile, res.json, etc.)
 * we override the socket.write method. Doing so means we get a HTTP
 * response string that needs to be parsed into an Object format so we
 * can work with it. That's where this function comes in.
 * @param  {Buffer} httpContentBuffer
 * @return {Object}
 */
module.exports = function getHttpResponseData (httpContentBuffer) {
  var parser = new HTTPParser(HTTPParser.RESPONSE)
    , httpData = {};

  parser[HTTPParser.kOnMessageComplete] = noop;
  parser[HTTPParser.kOnHeaders] = noop;

  parser[HTTPParser.kOnHeadersComplete] = function (meta) {
    httpData = xtend(httpData, meta);
  };

  parser[HTTPParser.kOnBody] = function (body, contentOffset, len) {
    httpData = xtend(httpData, {
      // The entire over the wire HTTP response
      completeHttpBody: body.toString(),
      // Just the "content" portion of the response
      body: body.slice(contentOffset, contentOffset+len).toString()
    });
  };

  parser.execute(httpContentBuffer);
  parser.finish();
  parser.close();

  // Parsing is synchronous. The event handlers above will have fired by now
  httpData.etag = getHeader(httpData.headers, 'etag');

  return httpData;
};
