'use strict'

/*
  Char codes:
    '#': 35
    '*': 42
    '-': 45
    '/': 47
    ':': 58
    ';': 59
    '?': 63
*/

const assert = require('assert')
const http = require('http')
const fastDecode = require('fast-decode-uri-component')
const Node = require('./node')
const NODE_TYPES = Node.prototype.types
const httpMethods = http.METHODS

function Router (opts) {
  if (!(this instanceof Router)) {
    return new Router(opts)
  }
  opts = opts || {}

  if (opts.defaultRoute) {
    assert(typeof opts.defaultRoute === 'function', 'The default route must be a function')
    this.defaultRoute = opts.defaultRoute
  } else {
    this.defaultRoute = null
  }

  this.ignoreTrailingSlash = opts.ignoreTrailingSlash || false
  this.maxParamLength = opts.maxParamLength || 100
  this.tree = new Node()
  this.routes = []
}

Router.prototype.on = function on (method, path, handler, store) {
  // path validation
  assert(typeof path === 'string', 'Path should be a string')
  assert(path.length > 0, 'The path could not be empty')
  assert(path[0] === '/' || path[0] === '*', 'The first character of a path should be `/` or `*`')
  // handler validation
  assert(typeof handler === 'function', 'Handler should be a function')

  this._on(method, path, handler, store)

  if (this.ignoreTrailingSlash && path !== '/' && !path.endsWith('*')) {
    if (path.endsWith('/')) {
      this._on(method, path.slice(0, -1), handler, store)
    } else {
      this._on(method, path + '/', handler, store)
    }
  }
}

Router.prototype._on = function _on (method, path, handler, store) {
  if (Array.isArray(method)) {
    for (var k = 0; k < method.length; k++) {
      this._on(method[k], path, handler, store)
    }
    return
  }

  // method validation
  assert(typeof method === 'string', 'Method should be a string')
  assert(httpMethods.indexOf(method) !== -1, `Method '${method}' is not an http method.`)

  const params = []
  var j = 0

  this.routes.push({
    method: method,
    path: path,
    handler: handler,
    store: store
  })

  for (var i = 0, len = path.length; i < len; i++) {
    // search for parametric or wildcard routes
    // parametric route
    if (path.charCodeAt(i) === 58) {
      var nodeType = NODE_TYPES.PARAM
      j = i + 1
      // add the static part of the route to the tree
      this._insert(method, path.slice(0, i), 0, null, null, null, null)

      // isolate the parameter name
      var isRegex = false
      while (i < len && path.charCodeAt(i) !== 47) {
        isRegex = isRegex || path[i] === '('
        if (isRegex) {
          i = getClosingParenthensePosition(path, i) + 1
          break
        } else if (path.charCodeAt(i) !== 45) {
          i++
        } else {
          break
        }
      }

      if (isRegex && (i === len || path.charCodeAt(i) === 47)) {
        nodeType = NODE_TYPES.REGEX
      } else if (i < len && path.charCodeAt(i) !== 47) {
        nodeType = NODE_TYPES.MULTI_PARAM
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
      // add the parameter and continue with the search
      this._insert(method, path.slice(0, i), nodeType, params, null, null, regex)

      i--
    // wildcard route
    } else if (path.charCodeAt(i) === 42) {
      this._insert(method, path.slice(0, i), 0, null, null, null, null)
      // add the wildcard parameter
      params.push('*')
      return this._insert(method, path.slice(0, len), 2, params, handler, store, null)
    }
  }
  // static route
  this._insert(method, path, 0, params, handler, store, null)
}

Router.prototype._insert = function _insert (method, path, kind, params, handler, store, regex) {
  const route = path
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

    // the longest common prefix is smaller than the current prefix
    // let's split the node and add a new child
    if (len < prefixLen) {
      node = new Node(
        prefix.slice(len),
        currentNode.children,
        currentNode.kind,
        new Node.Handlers(currentNode.handlers),
        currentNode.regex
      )
      if (currentNode.wildcardChild !== null) {
        node.wildcardChild = currentNode.wildcardChild
      }

      // reset the parent
      currentNode
        .reset(prefix.slice(0, len))
        .addChild(node)

      // if the longest common prefix has the same length of the current path
      // the handler should be added to the current node, to a child otherwise
      if (len === pathLen) {
        assert(!currentNode.getHandler(method), `Method '${method}' already declared for route '${route}'`)
        currentNode.setHandler(method, handler, params, store)
        currentNode.kind = kind
      } else {
        node = new Node(path.slice(len), {}, kind, null, regex)
        node.setHandler(method, handler, params, store)
        currentNode.addChild(node)
      }

    // the longest common prefix is smaller than the path length,
    // but is higher than the prefix
    } else if (len < pathLen) {
      // remove the prefix
      path = path.slice(len)
      // check if there is a child with the label extracted from the new path
      node = currentNode.findByLabel(path)
      // there is a child within the given label, we must go deepen in the tree
      if (node) {
        currentNode = node
        continue
      }
      // there are not children within the given label, let's create a new one!
      node = new Node(path, {}, kind, null, regex)
      node.setHandler(method, handler, params, store)
      currentNode.addChild(node)

    // the node already exist
    } else if (handler) {
      assert(!currentNode.getHandler(method), `Method '${method}' already declared for route '${route}'`)
      currentNode.setHandler(method, handler, params, store)
    }
    return
  }
}

Router.prototype.reset = function reset () {
  this.tree = new Node()
  this.routes = []
}

Router.prototype.off = function off (method, path) {
  var self = this

  if (Array.isArray(method)) {
    return method.map(function (method) {
      return self.off(method, path)
    })
  }

  // method validation
  assert(typeof method === 'string', 'Method should be a string')
  assert(httpMethods.indexOf(method) !== -1, `Method '${method}' is not an http method.`)
  // path validation
  assert(typeof path === 'string', 'Path should be a string')
  assert(path.length > 0, 'The path could not be empty')
  assert(path[0] === '/' || path[0] === '*', 'The first character of a path should be `/` or `*`')

  // Rebuild tree without the specific route
  const ignoreTrailingSlash = this.ignoreTrailingSlash
  var newRoutes = self.routes.filter(function (route) {
    if (!ignoreTrailingSlash) {
      return !(method === route.method && path === route.path)
    }
    if (path.endsWith('/')) {
      const routeMatches = path === route.path || path.slice(0, -1) === route.path
      return !(method === route.method && routeMatches)
    }
    const routeMatches = path === route.path || (path + '/') === route.path
    return !(method === route.method && routeMatches)
  })
  if (ignoreTrailingSlash) {
    newRoutes = newRoutes.filter(function (route, i, ar) {
      if (route.path.endsWith('/') && i < ar.length - 1) {
        return route.path.slice(0, -1) !== ar[i + 1].path
      } else if (route.path.endsWith('/') === false && i < ar.length - 1) {
        return (route.path + '/') !== ar[i + 1].path
      }
      return true
    })
  }
  self.reset()
  newRoutes.forEach(function (route) {
    self.on(route.method, route.path, route.handler, route.store)
  })
}

Router.prototype.lookup = function lookup (req, res) {
  var handle = this.find(req.method, sanitizeUrl(req.url))
  if (handle === null) return this._defaultRoute(req, res)
  return handle.handler(req, res, handle.params, handle.store)
}

Router.prototype.find = function find (method, path) {
  var maxParamLength = this.maxParamLength
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
    var previousPath = path

    // found the route
    if (pathLen === 0 || path === prefix) {
      var handle = currentNode.handlers[method]
      if (handle !== null && handle !== undefined) {
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
    while (len < i && path.charCodeAt(len) === prefix.charCodeAt(len)) len++

    if (len === prefixLen) {
      path = path.slice(len)
      pathLen = path.length
    }

    var node = currentNode.findChild(path, method)
    if (node === null) {
      node = currentNode.parametricBrother
      if (node === null) {
        return getWildcardNode(wildcardNode, method, originalPath, pathLenWildcard)
      }
      path = previousPath
      pathLen = previousPath.length
      len = prefixLen
    }
    var kind = node.kind

    // static route
    if (kind === NODE_TYPES.STATIC) {
      // if exist, save the wildcard child
      if (currentNode.wildcardChild !== null) {
        wildcardNode = currentNode.wildcardChild
        pathLenWildcard = pathLen
      }
      currentNode = node
      continue
    }

    if (len !== prefixLen) {
      return getWildcardNode(wildcardNode, method, originalPath, pathLenWildcard)
    }

    // if exist, save the wildcard child
    if (currentNode.wildcardChild !== null) {
      wildcardNode = currentNode.wildcardChild
      pathLenWildcard = pathLen
    }

    // parametric route
    if (kind === NODE_TYPES.PARAM) {
      currentNode = node
      i = path.indexOf('/')
      if (i === -1) i = pathLen
      if (i > maxParamLength) return null
      decoded = fastDecode(path.slice(0, i))
      if (decoded === null) return null
      params[pindex++] = decoded
      path = path.slice(i)
      continue
    }

    // wildcard route
    if (kind === NODE_TYPES.MATCH_ALL) {
      decoded = fastDecode(path)
      if (decoded === null) return null
      params[pindex] = decoded
      currentNode = node
      path = ''
      continue
    }

    // parametric(regex) route
    if (kind === NODE_TYPES.REGEX) {
      currentNode = node
      i = path.indexOf('/')
      if (i === -1) i = pathLen
      if (i > maxParamLength) return null
      decoded = fastDecode(path.slice(0, i))
      if (decoded === null) return null
      if (!node.regex.test(decoded)) return null
      params[pindex++] = decoded
      path = path.slice(i)
      continue
    }

    // multiparametric route
    if (kind === NODE_TYPES.MULTI_PARAM) {
      currentNode = node
      i = 0
      if (node.regex !== null) {
        var matchedParameter = path.match(node.regex)
        if (matchedParameter === null) return null
        i = matchedParameter[1].length
      } else {
        while (i < pathLen && path.charCodeAt(i) !== 47 && path.charCodeAt(i) !== 45) i++
        if (i > maxParamLength) return null
      }
      decoded = fastDecode(path.slice(0, i))
      if (decoded === null) return null
      params[pindex++] = decoded
      path = path.slice(i)
      continue
    }

    wildcardNode = null
  }
}

Router.prototype._defaultRoute = function (req, res) {
  if (this.defaultRoute !== null) {
    this.defaultRoute(req, res)
  } else {
    res.statusCode = 404
    res.end()
  }
}

Router.prototype.prettyPrint = function () {
  return this.tree.prettyPrint('', true)
}

for (var i in http.METHODS) {
  const m = http.METHODS[i]
  const methodName = m.toLowerCase()

  if (Router.prototype[methodName]) throw new Error('Method already exists: ' + methodName)

  Router.prototype[methodName] = function (path, handler, store) {
    return this.on(m, path, handler, store)
  }
}

Router.prototype.all = function (path, handler, store) {
  this.on(httpMethods, path, handler, store)
}

module.exports = Router

function sanitizeUrl (url) {
  for (var i = 0, len = url.length; i < len; i++) {
    var charCode = url.charCodeAt(i)
    // Some systems do not follow RFC and separate the path and query
    // string with a `;` character (code 59), e.g. `/foo;jsessionid=123456`.
    // Thus, we need to split on `;` as well as `?` and `#`.
    if (charCode === 63 || charCode === 59 || charCode === 35) {
      return url.slice(0, i)
    }
  }
  return url
}

function getWildcardNode (node, method, path, len) {
  if (node === null) return null
  var decoded = fastDecode(path.slice(-len))
  if (decoded === null) return null
  var handle = node.handlers[method]
  if (handle !== null && handle !== undefined) {
    return {
      handler: handle.handler,
      params: { '*': decoded },
      store: handle.store
    }
  }
  return null
}

function getClosingParenthensePosition (path, idx) {
  // `path.indexOf()` will always return the first position of the closing parenthese,
  // but it's inefficient for grouped or wrong regexp expressions.
  // see issues #62 and #63 for more info

  var parentheses = 1

  while (idx < path.length) {
    idx++

    // ignore skipped chars
    if (path[idx] === '\\') {
      idx++
      continue
    }

    if (path[idx] === ')') {
      parentheses--
    } else if (path[idx] === '(') {
      parentheses++
    }

    if (!parentheses) return idx
  }

  throw new TypeError('Invalid regexp expression in "' + path + '"')
}
