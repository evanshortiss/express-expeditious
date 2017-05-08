'use strict';

/**
 * Get a header from the header array created by "http-parser-js", e.g
 * ['X-Powered-By', 'Express', 'ETag', 'W/"c8-j36pDBD4000wLNnKKK96Dg"']
 * @param  {Array}  headers
 * @param  {String} name
 * @return {String|null}
 */
module.exports = function getHeader (headers, name) {
  for (let i = 0; i < headers.length; i += 2) {
    if (headers[i].toLowerCase() === name.toLowerCase()) {
      return headers[i + 1];
    }
  }

  return null;
};

// function isCompleteLine (line) {
//   return line.includes('\r\n');
// }
//
// exports.getHeaderFromHttpString = (headername, httpStr) => {
//   // const lines = httpStr.split('\r\n');
//   const rgx = new RegExp(`${headername}: *.+`, 'gi');
//
//   const len = httpStr.length;
//   let i = 0;
//   let buf = '';
//
//   while (i !== len) {
//     if (isCompleteLine(buf)) {
//       const match = buf.match(rgx);
//
//       if (match) {
//         return match[0].split(': ')[1];
//       } else {
//         buf = '';
//       }
//     }
//
//     if (buf === '\r\n') {
//       // we've run out of headers so exit early
//       return null;
//     }
//
//     buf += httpStr[i++];
//   }
// };
