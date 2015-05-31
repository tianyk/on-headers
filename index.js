/*!
 * on-headers
 * Copyright(c) 2014 Douglas Christopher Wilson
 * MIT Licensed
 */

/**
 * Reference to Array slice.
 */

var slice = Array.prototype.slice

/**
 * Execute a listener when a response is about to write headers.
 *
 * @param {Object} res
 * @return {Function} listener
 * @api public
 */

module.exports = function onHeaders(res, listener) {
  if (!res) {
    throw new TypeError('argument res is required')
  }

  if (typeof listener !== 'function') {
    throw new TypeError('argument listener must be a function')
  }

  res.writeHead = createWriteHead(res.writeHead, listener)
}

// 代理writeHead
// response.writeHead(statusCode[, statusMessage][, headers])#
// https://nodejs.org/api/http.html#http_response_writehead_statuscode_statusmessage_headers
function createWriteHead(prevWriteHead, listener) {
  var fired = false;

  // return function with core name and argument list
  return function writeHead(statusCode) {
    // set headers from arguments
    var args = setWriteHeadHeaders.apply(this, arguments);

    // 多次修改只执行一次
    // fire listener
    if (!fired) {
      fired = true
      // 调一次listener
      listener.call(this)

      // pass-along an updated status code
      // 取第一个值，取出来statusCode
      // 如果args的第一个参数不是statusCode取args[0]为statusCode
      if (typeof args[0] === 'number' && this.statusCode !== args[0]) {
        args[0] = this.statusCode
        args.length = 1 // 忽略后面的值
      }
    }

    // 调用原生的writeHead，不在取headers参数
    prevWriteHead.apply(this, args);
  }
}

function setWriteHeadHeaders(statusCode) {
  // (statusCode[, statusMessage][, headers])
  var length = arguments.length
  // (200) headerIndex:1
  // (200, 'OK') headerIndex:2
  // (200, {}) headerIndex:1
  // (200, 'OK', {}) headerIndex:2
  var headerIndex = length > 1 && typeof arguments[1] === 'string'
    ? 2
    : 1

  // (200) length:1, headerIndex:1 // undefined
  // (200, 'OK') length:2, headerIndex:2 // undefined
  // (200, {}) length:2, headerIndex:1 // {}
  // (200, 'OK', {}) length:3, headerIndex:2 // {}
  var headers = length >= headerIndex + 1
    ? arguments[headerIndex]
    : undefined

  // 第一个参数
  this.statusCode = statusCode

  // 把writeHead中的head部分全部拿出来，调用setHeader写到响应头中
  // the following block is from node.js core
  if (Array.isArray(headers)) {
    // handle array case
    for (var i = 0, len = headers.length; i < len; ++i) {
      this.setHeader(headers[i][0], headers[i][1])
    }
  } else if (headers) {
    // handle object case
    var keys = Object.keys(headers)
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i]
      if (k) this.setHeader(k, headers[k])
    }
  }


  // (200) length:1, headerIndex:1 // [200]
  // (200, 'OK') length:2, headerIndex:2 // [200, 'OK']
  // (200, {}) length:2, headerIndex:1 // [200]
  // (200, 'OK', {}) length:3, headerIndex:2 // [200, 'OK']
  // 把除了headers的参数保存到新的args中
  // copy leading arguments
  var args = new Array(Math.min(length, headerIndex))
  for (var i = 0; i < args.length; i++) {
    args[i] = arguments[i]
  }

  return args
}
