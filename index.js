'use strict'

/*
  Node type
    static: 0,
    param: 1,
    matchAll: 2,
    regex: 3
    multi-param: 4
      It's used for a parameter, that is followed by another parameter in the same part

  Char codes:
    '#': 35
    '*': 42
    '-': 45
    '/': 47
    ':': 58
    '?': 63
*/

const assert = require('assert')
const Node = require('./node')
const httpMethods = ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT', 'OPTIONS', 'TRACE', 'CONNECT']
var errored = false

function Router (opts) {
  if (!(this instanceof Router)) {
    return new Router(opts)
  }
  opts = opts || {}

  if (opts.defaultRoute) {
    assert(typeof opts.defaultRoute === 'function', 'The default route must be a function')
    this.defaultRoute = opts.defaultRoute
  }

  this.tree = new Node()
}

Router.prototype.on = function on (method, path, handler, store) {
  if (Array.isArray(method)) {
    for (var k = 0; k < method.length; k++) {
      this.on(method[k], path, handler, store)
    }
    return
  }

  // method validation
  assert(typeof method === 'string', 'Method should be a string')
  assert(httpMethods.indexOf(method) !== -1, `Method '${method}' is not an http method.`)
  // path validation
  assert(typeof path === 'string', 'Path should be a string')
  assert(path.length > 0, 'The path could not be empty')
  assert(path[0] === '/' || path[0] === '*', 'The first character of a path should be `/` or `*`')
  // handler validation
  assert(typeof handler === 'function', 'Handler should be a function')

  const params = []
  var j = 0

  for (var i = 0, len = path.length; i < len; i++) {
    // search for parametric or wildcard routes
    // parametric route
    if (path.charCodeAt(i) === 58) {
      var nodeType = 1
      j = i + 1
      this._insert(method, path.slice(0, i), 0, null, null, null, null)

      // isolate the parameter name
      var isRegex = false
      while (i < len && path.charCodeAt(i) !== 47) {
        isRegex = isRegex || path[i] === '('
        if (isRegex) {
          i = path.indexOf(')', i) + 1
          break
        } else if (path.charCodeAt(i) !== 45) {
          i++
        } else {
          break
        }
      }

      if (isRegex && (i === len || path.charCodeAt(i) === 47)) {
        nodeType = 3
      } else if (i < len && path.charCodeAt(i) !== 47) {
        nodeType = 4
      }

      var parameter = path.slice(j, i)
      var regex = isRegex ? parameter.slice(parameter.indexOf('('), i) : null
      if (isRegex) regex = new RegExp(regex)
      params.push(parameter.slice(0, isRegex ? parameter.indexOf('(') : i))

      path = path.slice(0, j) + path.slice(i)
      i = j
      len = path.length

      // if the path is ended
      if (i === len) {
        return this._insert(method, path.slice(0, i), nodeType, params, handler, store, regex)
      }
      this._insert(method, path.slice(0, i), nodeType, params, null, null, regex)

      i--
    // wildcard route
    } else if (path.charCodeAt(i) === 42) {
      this._insert(method, path.slice(0, i), 0, null, null, null, null)
      params.push('*')
      return this._insert(method, path.slice(0, len), 2, params, handler, store, null)
    }
  }
  // static route
  this._insert(method, path, 0, params, handler, store, null)
}

Router.prototype._insert = function _insert (method, path, kind, params, handler, store, regex) {
  var currentNode = this.tree
  var prefix = ''
  var pathLen = 0
  var prefixLen = 0
  var len = 0
  var max = 0
  var node = null

  while (true) {
    prefix = currentNode.prefix
    prefixLen = prefix.length
    pathLen = path.length
    len = 0

    // search for the longest common prefix
    max = pathLen < prefixLen ? pathLen : prefixLen
    while (len < max && path[len] === prefix[len]) len++

    if (len < prefixLen) {
      // split the node in the radix tree and add it to the parent
      node = new Node(prefix.slice(len), currentNode.children, currentNode.kind, Object.assign({}, currentNode.map), currentNode.regex)
      if (currentNode.wildcardChild !== null) {
        node.wildcardChild = currentNode.wildcardChild
      }

      // reset the parent
      currentNode.children = [node]
      currentNode.numberOfChildren = 1
      currentNode.prefix = prefix.slice(0, len)
      currentNode.label = currentNode.prefix[0]
      currentNode.map = {}
      currentNode.kind = 0
      currentNode.regex = null
      currentNode.wildcardChild = null

      if (len === pathLen) {
        // add the handler to the parent node
        assert(!currentNode.getHandler(method), `Method '${method}' already declared for route '${path}'`)
        currentNode.setHandler(method, handler, params, store)
        currentNode.kind = kind
      } else {
        // create a child node and add an handler to it
        node = new Node(path.slice(len), [], kind, null, regex)
        node.setHandler(method, handler, params, store)
        // add the child to the parent
        currentNode.add(node)
      }
    } else if (len < pathLen) {
      path = path.slice(len)
      node = currentNode.findByLabel(path[0])
      if (node) {
        // we must go deeper in the tree
        currentNode = node
        continue
      }
      // create a new child node
      node = new Node(path, [], kind, null, regex)
      node.setHandler(method, handler, params, store)
      // add the child to the parent
      currentNode.add(node)
    } else if (handler) {
      // the node already exist
      assert(!currentNode.getHandler(method), `Method '${method}' already declared for route '${path}'`)
      currentNode.setHandler(method, handler, params, store)
    }
    return
  }
}

Router.prototype.lookup = function lookup (req, res) {
  var handle = this.find(req.method, sanitizeUrl(req.url))
  if (!handle) return this._defaultRoute(req, res)
  return handle.handler(req, res, handle.params, handle.store)
}

Router.prototype.find = function find (method, path) {
  var currentNode = this.tree
  var wildcardNode = null
  var pathLenWildcard = 0
  var originalPath = path
  var decoded = null
  var pindex = 0
  var params = []
  var i = 0

  while (true) {
    var pathLen = path.length
    var prefix = currentNode.prefix
    var prefixLen = prefix.length
    var len = 0

    // found the route
    if (pathLen === 0 || path === prefix) {
      var handle = currentNode.getHandler(method)
      if (handle !== undefined) {
        var paramsObj = {}
        if (handle.paramsLength > 0) {
          var paramNames = handle.params

          for (i = 0; i < handle.paramsLength; i++) {
            paramsObj[paramNames[i]] = params[i]
          }
        }

        return {
          handler: handle.handler,
          params: paramsObj,
          store: handle.store
        }
      }
    }

    // search for the longest common prefix
    i = pathLen < prefixLen ? pathLen : prefixLen
    while (len < i && path[len] === prefix[len]) len++

    if (len === prefixLen) {
      path = path.slice(len)
      pathLen = path.length
    }

    // if exist, save the wildcard child
    if (currentNode.wildcardChild !== null) {
      wildcardNode = currentNode.wildcardChild
      pathLenWildcard = pathLen
    }

    var node = currentNode.find(path[0], method)
    if (node === null) {
      return getWildcardNode(wildcardNode, method, originalPath, pathLenWildcard)
    }
    var kind = node.kind

    // static route
    if (kind === 0) {
      currentNode = node
      continue
    }

    if (len !== prefixLen) {
      return getWildcardNode(wildcardNode, method, originalPath, pathLenWildcard)
    }

    // parametric route
    if (kind === 1) {
      currentNode = node
      i = 0
      while (i < pathLen && path.charCodeAt(i) !== 47) i++
      decoded = fastDecode(path.slice(0, i))
      if (errored) {
        return null
      }
      params[pindex++] = decoded
      path = path.slice(i)
      continue
    }

    // wildcard route
    if (kind === 2) {
      decoded = fastDecode(path)
      if (errored) {
        return null
      }
      params[pindex] = decoded
      currentNode = node
      path = ''
      continue
    }

    // parametric(regex) route
    if (kind === 3) {
      currentNode = node
      i = 0
      while (i < pathLen && path.charCodeAt(i) !== 47) i++
      decoded = fastDecode(path.slice(0, i))
      if (errored) {
        return null
      }
      if (!node.regex.test(decoded)) return null
      params[pindex++] = decoded
      path = path.slice(i)
      continue
    }

    // multiparametric route
    if (kind === 4) {
      currentNode = node
      i = 0
      if (node.regex) {
        var matchedParameter = path.match(node.regex)
        if (!matchedParameter) return null
        i = matchedParameter[1].length
      } else {
        while (i < pathLen && path.charCodeAt(i) !== 47 && path.charCodeAt(i) !== 45) i++
      }
      decoded = fastDecode(path.slice(0, i))
      if (errored) {
        return null
      }
      params[pindex++] = decoded
      path = path.slice(i)
      continue
    }
  }
}

Router.prototype._defaultRoute = function (req, res) {
  if (this.defaultRoute) {
    this.defaultRoute(req, res)
  } else {
    res.statusCode = 404
    res.end()
  }
}

Router.prototype.prettyPrint = function () {
  return this.tree.prettyPrint('', true)
}

Router.prototype.get = function (path, handler, store) {
  return this.on('GET', path, handler, store)
}

Router.prototype.delete = function (path, handler, store) {
  return this.on('DELETE', path, handler, store)
}

Router.prototype.head = function (path, handler, store) {
  return this.on('HEAD', path, handler, store)
}

Router.prototype.patch = function (path, handler, store) {
  return this.on('PATCH', path, handler, store)
}

Router.prototype.post = function (path, handler, store) {
  return this.on('POST', path, handler, store)
}

Router.prototype.put = function (path, handler, store) {
  return this.on('PUT', path, handler, store)
}

Router.prototype.options = function (path, handler, store) {
  return this.on('OPTIONS', path, handler, store)
}

Router.prototype.trace = function (path, handler, store) {
  return this.on('TRACE', path, handler, store)
}

Router.prototype.connect = function (path, handler, store) {
  return this.on('CONNECT', path, handler, store)
}

Router.prototype.all = function (path, handler, store) {
  this.on(httpMethods, path, handler, store)
}

module.exports = Router

function sanitizeUrl (url) {
  for (var i = 0, len = url.length; i < len; i++) {
    var charCode = url.charCodeAt(i)
    if (charCode === 63 || charCode === 35) {
      return url.slice(0, i)
    }
  }
  return url
}

function fastDecode (path) {
  errored = false
  try {
    return decodeURIComponent(path)
  } catch (err) {
    errored = true
  }
}

function getWildcardNode (node, method, path, len) {
  if (node === null) return null
  var decoded = fastDecode(path.slice(-len))
  if (errored) {
    return null
  }
  var handle = node.getHandler(method)
  if (handle !== undefined) {
    return {
      handler: handle.handler,
      params: { '*': decoded },
      store: handle.store
    }
  }
  return null
}
