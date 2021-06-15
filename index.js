'use strict'

/*
  Char codes:
    '#': 35
    '*': 42
    '-': 45
    '.': 46
    '/': 47
    ':': 58
    ';': 59
    '?': 63
*/

const assert = require('assert')
const http = require('http')
const fastDecode = require('fast-decode-uri-component')
const isRegexSafe = require('safe-regex2')
const { flattenNode, compressFlattenedNode, prettyPrintFlattenedNode, prettyPrintRoutesArray } = require('./lib/pretty-print')
const Node = require('./node')
const Constrainer = require('./lib/constrainer')

const NODE_TYPES = Node.prototype.types
const httpMethods = http.METHODS
const FULL_PATH_REGEXP = /^https?:\/\/.*?\//

if (!isRegexSafe(FULL_PATH_REGEXP)) {
  throw new Error('the FULL_PATH_REGEXP is not safe, update this module')
}

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

  if (opts.onBadUrl) {
    assert(typeof opts.onBadUrl === 'function', 'The bad url handler must be a function')
    this.onBadUrl = opts.onBadUrl
  } else {
    this.onBadUrl = null
  }

  if (opts.buildPrettyMeta) {
    assert(typeof opts.buildPrettyMeta === 'function', 'buildPrettyMeta must be a function')
    this.buildPrettyMeta = opts.buildPrettyMeta
  } else {
    this.buildPrettyMeta = defaultBuildPrettyMeta
  }

  this.caseSensitive = opts.caseSensitive === undefined ? true : opts.caseSensitive
  this.ignoreTrailingSlash = opts.ignoreTrailingSlash || false
  this.maxParamLength = opts.maxParamLength || 100
  this.allowUnsafeRegex = opts.allowUnsafeRegex || false
  this.constrainer = new Constrainer(opts.constraints)
  this.trees = {}
  this.routes = []
}

Router.prototype.on = function on (method, path, opts, handler, store) {
  if (typeof opts === 'function') {
    if (handler !== undefined) {
      store = handler
    }
    handler = opts
    opts = {}
  }
  // path validation
  assert(typeof path === 'string', 'Path should be a string')
  assert(path.length > 0, 'The path could not be empty')
  assert(path[0] === '/' || path[0] === '*', 'The first character of a path should be `/` or `*`')
  // handler validation
  assert(typeof handler === 'function', 'Handler should be a function')

  this._on(method, path, opts, handler, store)

  if (this.ignoreTrailingSlash && path !== '/' && !path.endsWith('*')) {
    if (path.endsWith('/')) {
      this._on(method, path.slice(0, -1), opts, handler, store)
    } else {
      this._on(method, path + '/', opts, handler, store)
    }
  }
}

Router.prototype._on = function _on (method, path, opts, handler, store) {
  if (Array.isArray(method)) {
    for (var k = 0; k < method.length; k++) {
      this._on(method[k], path, opts, handler, store)
    }
    return
  }

  assert(typeof method === 'string', 'Method should be a string')
  assert(httpMethods.indexOf(method) !== -1, `Method '${method}' is not an http method.`)

  let constraints = {}
  if (opts.constraints !== undefined) {
    assert(typeof opts.constraints === 'object' && opts.constraints !== null, 'Constraints should be an object')
    if (Object.keys(opts.constraints).length !== 0) {
      constraints = opts.constraints
    }
  }

  this.constrainer.validateConstraints(constraints)
  // Let the constrainer know if any constraints are being used now
  this.constrainer.noteUsage(constraints)

  const params = []
  var j = 0

  this.routes.push({
    method: method,
    path: path,
    opts: opts,
    handler: handler,
    store: store
  })

  for (var i = 0, len = path.length; i < len; i++) {
    // search for parametric or wildcard routes
    // parametric route
    if (path.charCodeAt(i) === 58) {
      if (i !== len - 1 && path.charCodeAt(i + 1) === 58) {
        // It's a double colon. Let's just replace it with a single colon and go ahead
        path = path.slice(0, i) + path.slice(i + 1)
        len = path.length
        continue
      }

      var nodeType = NODE_TYPES.PARAM
      j = i + 1
      var staticPart = path.slice(0, i)

      if (this.caseSensitive === false) {
        staticPart = staticPart.toLowerCase()
      }

      // add the static part of the route to the tree
      this._insert(method, staticPart, NODE_TYPES.STATIC, null, null, null, null, constraints)

      // isolate the parameter name
      var isRegex = false
      while (i < len && path.charCodeAt(i) !== 47) {
        isRegex = isRegex || path[i] === '('
        if (isRegex) {
          i = getClosingParenthensePosition(path, i) + 1
          break
        } else if (path.charCodeAt(i) !== 45 && path.charCodeAt(i) !== 46) {
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
      if (isRegex) {
        regex = new RegExp(regex)
        if (!this.allowUnsafeRegex) {
          assert(isRegexSafe(regex), `The regex '${regex.toString()}' is not safe!`)
        }
      }
      params.push(parameter.slice(0, isRegex ? parameter.indexOf('(') : i))

      path = path.slice(0, j) + path.slice(i)
      i = j
      len = path.length

      // if the path is ended
      if (i === len) {
        var completedPath = path.slice(0, i)
        if (this.caseSensitive === false) {
          completedPath = completedPath.toLowerCase()
        }
        return this._insert(method, completedPath, nodeType, params, handler, store, regex, constraints)
      }
      // add the parameter and continue with the search
      staticPart = path.slice(0, i)
      if (this.caseSensitive === false) {
        staticPart = staticPart.toLowerCase()
      }
      this._insert(method, staticPart, nodeType, params, null, null, regex, constraints)

      i--
    // wildcard route
    } else if (path.charCodeAt(i) === 42) {
      this._insert(method, path.slice(0, i), NODE_TYPES.STATIC, null, null, null, null, constraints)
      // add the wildcard parameter
      params.push('*')
      return this._insert(method, path.slice(0, len), NODE_TYPES.MATCH_ALL, params, handler, store, null, constraints)
    }
  }

  if (this.caseSensitive === false) {
    path = path.toLowerCase()
  }

  // static route
  this._insert(method, path, NODE_TYPES.STATIC, params, handler, store, null, constraints)
}

Router.prototype._insert = function _insert (method, path, kind, params, handler, store, regex, constraints) {
  const route = path
  var prefix = ''
  var pathLen = 0
  var prefixLen = 0
  var len = 0
  var max = 0
  var node = null

  // Boot the tree for this method if it doesn't exist yet
  var currentNode = this.trees[method]
  if (typeof currentNode === 'undefined') {
    currentNode = new Node({ method: method, constrainer: this.constrainer })
    this.trees[method] = currentNode
  }

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
      node = currentNode.split(len)

      // if the longest common prefix has the same length of the current path
      // the handler should be added to the current node, to a child otherwise
      if (len === pathLen) {
        assert(!currentNode.getHandler(constraints), `Method '${method}' already declared for route '${route}' with constraints '${JSON.stringify(constraints)}'`)
        currentNode.addHandler(handler, params, store, constraints)
        currentNode.kind = kind
      } else {
        node = new Node({
          method: method,
          prefix: path.slice(len),
          kind: kind,
          handlers: null,
          regex: regex,
          constrainer: this.constrainer
        })
        node.addHandler(handler, params, store, constraints)
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
      node = new Node({ method: method, prefix: path, kind: kind, handlers: null, regex: regex, constrainer: this.constrainer })
      node.addHandler(handler, params, store, constraints)
      currentNode.addChild(node)

    // the node already exist
    } else if (handler) {
      assert(!currentNode.getHandler(constraints), `Method '${method}' already declared for route '${route}' with constraints '${JSON.stringify(constraints)}'`)
      currentNode.addHandler(handler, params, store, constraints)
    }
    return
  }
}

Router.prototype.reset = function reset () {
  this.trees = {}
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
    self.on(route.method, route.path, route.opts, route.handler, route.store)
  })
}

Router.prototype.lookup = function lookup (req, res, ctx) {
  var handle = this.find(req.method, sanitizeUrl(req.url), this.constrainer.deriveConstraints(req, ctx))
  if (handle === null) return this._defaultRoute(req, res, ctx)
  return ctx === undefined
    ? handle.handler(req, res, handle.params, handle.store)
    : handle.handler.call(ctx, req, res, handle.params, handle.store)
}

Router.prototype.find = function find (method, path, derivedConstraints) {
  var currentNode = this.trees[method]
  if (currentNode === undefined) return null

  if (path.charCodeAt(0) !== 47) { // 47 is '/'
    path = path.replace(FULL_PATH_REGEXP, '/')
  }

  var originalPath = path
  var originalPathLength = path.length

  if (this.caseSensitive === false) {
    path = path.toLowerCase()
  }

  var maxParamLength = this.maxParamLength
  var wildcardNode = null
  var pathLenWildcard = 0
  var decoded = null
  var pindex = 0
  var params = null
  var i = 0
  var idxInOriginalPath = 0

  while (true) {
    var pathLen = path.length
    var prefix = currentNode.prefix

    // found the route
    if (pathLen === 0 || path === prefix) {
      var handle = derivedConstraints !== undefined ? currentNode.getMatchingHandler(derivedConstraints) : currentNode.unconstrainedHandler
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

    var prefixLen = prefix.length
    var len = 0
    var previousPath = path

    // search for the longest common prefix
    i = pathLen < prefixLen ? pathLen : prefixLen
    while (len < i && path.charCodeAt(len) === prefix.charCodeAt(len)) len++

    if (len === prefixLen) {
      path = path.slice(len)
      pathLen = path.length
      idxInOriginalPath += len
    }

    var node = currentNode.findMatchingChild(derivedConstraints, path)

    if (node === null) {
      node = currentNode.parametricBrother
      if (node === null) {
        return this._getWildcardNode(wildcardNode, originalPath, pathLenWildcard, derivedConstraints, params)
      }

      var goBack = previousPath.charCodeAt(0) === 47 ? previousPath : '/' + previousPath
      if (originalPath.indexOf(goBack) === -1) {
        // we need to know the outstanding path so far from the originalPath since the last encountered "/" and assign it to previousPath.
        // e.g originalPath: /aa/bbb/cc, path: bb/cc
        // outstanding path: /bbb/cc
        var pathDiff = originalPath.slice(0, originalPathLength - pathLen)
        previousPath = pathDiff.slice(pathDiff.lastIndexOf('/') + 1, pathDiff.length) + path
      }
      idxInOriginalPath = idxInOriginalPath -
        (previousPath.length - path.length)
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
      return this._getWildcardNode(wildcardNode, originalPath, pathLenWildcard, derivedConstraints, params)
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
      decoded = fastDecode(originalPath.slice(idxInOriginalPath, idxInOriginalPath + i))
      if (decoded === null) {
        return this.onBadUrl !== null
          ? this._onBadUrl(originalPath.slice(idxInOriginalPath, idxInOriginalPath + i))
          : null
      }
      params || (params = [])
      params[pindex++] = decoded
      path = path.slice(i)
      idxInOriginalPath += i
      continue
    }

    // wildcard route
    if (kind === NODE_TYPES.MATCH_ALL) {
      decoded = fastDecode(originalPath.slice(idxInOriginalPath))
      if (decoded === null) {
        return this.onBadUrl !== null
          ? this._onBadUrl(originalPath.slice(idxInOriginalPath))
          : null
      }
      params || (params = [])
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
      decoded = fastDecode(originalPath.slice(idxInOriginalPath, idxInOriginalPath + i))
      if (decoded === null) {
        return this.onBadUrl !== null
          ? this._onBadUrl(originalPath.slice(idxInOriginalPath, idxInOriginalPath + i))
          : null
      }
      if (!node.regex.test(decoded)) return null
      params || (params = [])
      params[pindex++] = decoded
      path = path.slice(i)
      idxInOriginalPath += i
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
        while (i < pathLen && path.charCodeAt(i) !== 47 && path.charCodeAt(i) !== 45 && path.charCodeAt(i) !== 46) i++
        if (i > maxParamLength) return null
      }
      decoded = fastDecode(originalPath.slice(idxInOriginalPath, idxInOriginalPath + i))
      if (decoded === null) {
        return this.onBadUrl !== null
          ? this._onBadUrl(originalPath.slice(idxInOriginalPath, idxInOriginalPath + i))
          : null
      }
      params || (params = [])
      params[pindex++] = decoded
      path = path.slice(i)
      idxInOriginalPath += i
      continue
    }

    wildcardNode = null
  }
}

Router.prototype._getWildcardNode = function (node, path, len, derivedConstraints, params) {
  if (node === null) return null
  var decoded = fastDecode(path.slice(-len))
  if (decoded === null) {
    return this.onBadUrl !== null
      ? this._onBadUrl(path.slice(-len))
      : null
  }

  var handle = derivedConstraints !== undefined ? node.getMatchingHandler(derivedConstraints) : node.unconstrainedHandler

  if (handle !== null && handle !== undefined) {
    var paramsObj = {}
    if (handle.paramsLength > 0 && params !== null) {
      var paramNames = handle.params

      for (i = 0; i < handle.paramsLength; i++) {
        paramsObj[paramNames[i]] = params[i]
      }
    }

    // we must override params[*] to decoded
    paramsObj['*'] = decoded

    return {
      handler: handle.handler,
      params: paramsObj,
      store: handle.store
    }
  }
  return null
}

Router.prototype._defaultRoute = function (req, res, ctx) {
  if (this.defaultRoute !== null) {
    return ctx === undefined
      ? this.defaultRoute(req, res)
      : this.defaultRoute.call(ctx, req, res)
  } else {
    res.statusCode = 404
    res.end()
  }
}

Router.prototype._onBadUrl = function (path) {
  const onBadUrl = this.onBadUrl
  return {
    handler: (req, res, ctx) => onBadUrl(path, req, res),
    params: {},
    store: null
  }
}

Router.prototype.prettyPrint = function (opts = {}) {
  opts.commonPrefix = opts.commonPrefix === undefined ? true : opts.commonPrefix // default to original behaviour
  if (!opts.commonPrefix) return prettyPrintRoutesArray.call(this, this.routes, opts)
  const root = {
    prefix: '/',
    nodes: [],
    children: {}
  }

  for (const node of Object.values(this.trees)) {
    if (node) {
      flattenNode(root, node)
    }
  }

  compressFlattenedNode(root)

  return prettyPrintFlattenedNode.call(this, root, '', true, opts)
}

for (var i in http.METHODS) {
  /* eslint no-prototype-builtins: "off" */
  if (!http.METHODS.hasOwnProperty(i)) continue
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

function defaultBuildPrettyMeta (route) {
  // buildPrettyMeta function must return an object, which will be parsed into key/value pairs for display
  if (!route) return {}
  if (!route.store) return {}
  return Object.assign({}, route.store)
}
