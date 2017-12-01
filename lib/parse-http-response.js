'use strict'

const noop = require('./noop')
const xtend = Object.assign
const HTTPParser = require('http-parser-js').HTTPParser

/**
 * Since we want to support any HTTP methods (res.sendFile, res.json, etc.)
 * we override the socket.write method. Doing so means we get a HTTP
 * response string that needs to be parsed into an Object format so we
 * can work with it. That's where this function comes in.
 * @param  {Buffer} httpContentBuffer
 * @return {Object}
 */
module.exports = function getHttpResponseData (httpContentBuffer) {
  const parser = new HTTPParser(HTTPParser.RESPONSE)
  let httpData = {}

  parser[HTTPParser.kOnMessageComplete] = noop
  parser[HTTPParser.kOnHeaders] = noop

  // Get headers and parse them to an object format for easier use
  parser[HTTPParser.kOnHeadersComplete] = function (meta) {
    const headerObject = {}

    for (let i = 0; i < meta.headers.length; i += 2) {
      headerObject[meta.headers[i]] = meta.headers[i + 1]
    }

    httpData = xtend(httpData, meta, {
      headers: headerObject
    })
  }

  // The below function can fire multiple times for "transfer-encoding: chunked"
  // We need to build up the body in a buffer to ensure we capture it entirely
  let completeBody = ''
  parser[HTTPParser.kOnBody] = function (body, contentOffset, len) {
    completeBody += body.slice(contentOffset, contentOffset + len).toString()
  }

  parser.execute(httpContentBuffer)
  parser.finish()
  parser.close()

  return xtend(httpData, {
    body: completeBody
  })
}
