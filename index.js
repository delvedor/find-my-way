'use strict'

/*
  Char codes:
    '!': 33 - !
    '#': 35 - %23
    '$': 36 - %24
    '%': 37 - %25
    '&': 38 - %26
    ''': 39 - '
    '(': 40 - (
    ')': 41 - )
    '*': 42 - *
    '+': 43 - %2B
    ',': 44 - %2C
    '-': 45 - -
    '.': 46 - .
    '/': 47 - %2F
    ':': 58 - %3A
    ';': 59 - %3B
    '=': 61 - %3D
    '?': 63 - %3F
    '@': 64 - %40
    '_': 95 - _
    '~': 126 - ~
*/

const assert = require('assert')
const http = require('http')
const isRegexSafe = require('safe-regex2')
const { flattenNode, compressFlattenedNode, prettyPrintFlattenedNode, prettyPrintRoutesArray } = require('./lib/pretty-print')
const Node = require('./custom_node')
const Constrainer = require('./lib/constrainer')
const sanitizeUrl = require('./lib/url-sanitizer')

const NODE_TYPES = Node.prototype.types
const httpMethods = http.METHODS
const FULL_PATH_REGEXP = /^https?:\/\/.*?\//
const OPTIONAL_PARAM_REGEXP = /(\/:[^/()]*?)\?(\/?)/

if (!isRegexSafe(FULL_PATH_REGEXP)) {
  throw new Error('the FULL_PATH_REGEXP is not safe, update this module')
}

if (!isRegexSafe(OPTIONAL_PARAM_REGEXP)) {
  throw new Error('the OPTIONAL_PARAM_REGEXP is not safe, update this module')
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

  if (opts.decodeUriParameters) {
    assert(typeof opts.decodeUriParameters === 'function', 'decodeUriParameters must be a function')
    this.decodeUriParameters = opts.decodeUriParameters
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

  // path ends with optional parameter
  const optionalParamMatch = path.match(OPTIONAL_PARAM_REGEXP)
  if (optionalParamMatch) {
    assert(path.length === optionalParamMatch.index + optionalParamMatch[0].length, 'Optional Parameter needs to be the last parameter of the path')

    const pathFull = path.replace(OPTIONAL_PARAM_REGEXP, '$1$2')
    const pathOptional = path.replace(OPTIONAL_PARAM_REGEXP, '$2')

    this.on(method, pathFull, opts, handler, store)
    this.on(method, pathOptional, opts, handler, store)
    return
  }

  const methods = Array.isArray(method) ? method : [method]
  const paths = [path]

  if (this.ignoreTrailingSlash && path !== '/' && !path.endsWith('*')) {
    if (path.endsWith('/')) {
      paths.push(path.slice(0, -1))
    } else {
      paths.push(path + '/')
    }
  }

  for (const path of paths) {
    for (const method of methods) {
      this._on(method, path, opts, handler, store)
    }
  }
}

Router.prototype._on = function _on (method, path, opts, handler, store) {
  assert(typeof method === 'string', 'Method should be a string')
  assert(httpMethods.includes(method), `Method '${method}' is not an http method.`)

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

  this.routes.push({ method, path, opts, handler, store })

  // Boot the tree for this method if it doesn't exist yet
  let currentNode = this.trees[method]
  if (typeof currentNode === 'undefined') {
    currentNode = new Node({ method: method, constrainer: this.constrainer })
    this.trees[method] = currentNode
  }

  if (!path.startsWith('/') && currentNode.prefix !== '') {
    currentNode.split(0)
  }

  let parentNodePathIndex = this.trees[method].prefix.length

  const params = []
  for (let i = 0; i <= path.length; i++) {
    // search for parametric or wildcard routes
    // parametric route
    if (path.charCodeAt(i) === 58) {
      if (path.charCodeAt(i + 1) === 58) {
        // It's a double colon. Let's just replace it with a single colon and go ahead
        path = path.slice(0, i) + path.slice(i + 1)
        continue
      }

      // add the static part of the route to the tree
      currentNode = this._insert(currentNode, method, path.slice(parentNodePathIndex, i), NODE_TYPES.STATIC, null)

      const paramStartIndex = i + 1

      const regexps = []
      let nodeType = NODE_TYPES.PARAM
      let lastParamStartIndex = paramStartIndex

      for (let j = paramStartIndex; ; j++) {
        const charCode = path.charCodeAt(j)

        if (charCode === 40 || charCode === 45 || charCode === 46) {
          nodeType = NODE_TYPES.REGEX

          const paramName = path.slice(lastParamStartIndex, j)
          params.push(paramName)

          if (charCode === 40) {
            const endOfRegexIndex = getClosingParenthensePosition(path, j)
            const regexString = path.slice(j, endOfRegexIndex + 1)

            if (!this.allowUnsafeRegex) {
              assert(isRegexSafe(new RegExp(regexString)), `The regex '${regexString}' is not safe!`)
            }

            regexps.push(trimRegExpStartAndEnd(regexString))

            j = endOfRegexIndex + 1
          } else {
            regexps.push('(.*?)')
          }

          let lastParamEndIndex = j
          for (; lastParamEndIndex < path.length; lastParamEndIndex++) {
            const charCode = path.charCodeAt(lastParamEndIndex)
            if (charCode === 58 || charCode === 47) {
              break
            }
          }

          const staticPart = path.slice(j, lastParamEndIndex)
          if (staticPart) {
            regexps.push(escapeRegExp(staticPart))
          }

          lastParamStartIndex = lastParamEndIndex + 1
          j = lastParamEndIndex
        } else if (charCode === 47 || j === path.length) {
          const paramName = path.slice(lastParamStartIndex, j)
          params.push(paramName)

          if (regexps.length !== 0) {
            regexps.push('(.*?)')
          }
        }

        if (path.charCodeAt(j) === 47 || j === path.length) {
          path = path.slice(0, paramStartIndex) + path.slice(j)
          break
        }
      }

      let regex = null
      if (nodeType === NODE_TYPES.REGEX) {
        regex = new RegExp('^' + regexps.join('') + '$')
      }

      currentNode = this._insert(currentNode, method, ':', nodeType, regex)
      parentNodePathIndex = i + 1
    // wildcard route
    } else if (path.charCodeAt(i) === 42) {
      currentNode = this._insert(currentNode, method, path.slice(parentNodePathIndex, i), NODE_TYPES.STATIC, null)
      // add the wildcard parameter
      params.push('*')
      currentNode = this._insert(currentNode, method, path.slice(i), NODE_TYPES.MATCH_ALL, null)
      break
    } else if (i === path.length && i !== parentNodePathIndex) {
      currentNode = this._insert(currentNode, method, path.slice(parentNodePathIndex), NODE_TYPES.STATIC, null)
    }
  }

  assert(!currentNode.getHandler(constraints), `Method '${method}' already declared for route '${path}' with constraints '${JSON.stringify(constraints)}'`)
  currentNode.addHandler(handler, params, store, constraints)
}

Router.prototype._insert = function _insert (currentNode, method, path, kind, regex) {
  if (!this.caseSensitive) {
    path = path.toLowerCase()
  }

  let childNode = currentNode.getChildByLabel(path.charAt(0), kind)
  while (childNode) {
    currentNode = childNode

    let i = 0
    for (; i < currentNode.prefix.length; i++) {
      if (path.charCodeAt(i) !== currentNode.prefix.charCodeAt(i)) {
        currentNode.split(i)
        break
      }
    }
    path = path.slice(i)
    childNode = currentNode.getChildByLabel(path.charAt(0), kind)
  }

  if (path.length > 0) {
    const node = new Node({ method, prefix: path, kind, handlers: null, regex, constrainer: this.constrainer })
    currentNode.addChild(node)
    currentNode = node
  }

  return currentNode
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

  // path ends with optional parameter
  const optionalParamMatch = path.match(OPTIONAL_PARAM_REGEXP)
  if (optionalParamMatch) {
    assert(path.length === optionalParamMatch.index + optionalParamMatch[0].length, 'Optional Parameter needs to be the last parameter of the path')

    const pathFull = path.replace(OPTIONAL_PARAM_REGEXP, '$1$2')
    const pathOptional = path.replace(OPTIONAL_PARAM_REGEXP, '$2')

    this.off(method, pathFull)
    this.off(method, pathOptional)
    return
  }

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
  var handle = this.find(req.method, req.url, this.constrainer.deriveConstraints(req, ctx))
  if (handle === null) return this._defaultRoute(req, res, ctx)
  return ctx === undefined
    ? handle.handler(req, res, handle.params, handle.store)
    : handle.handler.call(ctx, req, res, handle.params, handle.store)
}

Router.prototype.find = function find (method, path, derivedConstraints) {
  let currentNode = this.trees[method]
  if (currentNode === undefined) return null

  if (path.charCodeAt(0) !== 47) { // 47 is '/'
    path = path.replace(FULL_PATH_REGEXP, '/')
  }

  let sanitizedUrl
  try {
    sanitizedUrl = sanitizeUrl(path, this.decodeUriParameters)
    path = sanitizedUrl.path
  } catch (error) {
    return this._onBadUrl(path)
  }

  if (this.caseSensitive === false) {
    path = path.toLowerCase()
  }

  const maxParamLength = this.maxParamLength

  let pathIndex = currentNode.prefix.length
  const params = []
  const pathLen = path.length

  const parametricBrothersStack = []
  const wildcardBrothersStack = []

  while (true) {
    // found the route
    if (pathIndex === pathLen) {
      const handle = currentNode.getMatchingHandler(derivedConstraints)

      if (handle !== null && handle !== undefined) {
        const paramsObj = {}
        if (handle.paramsLength > 0) {
          const paramNames = handle.params

          for (let i = 0; i < handle.paramsLength; i++) {
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

    let node = currentNode.findStaticMatchingChild(path, pathIndex)

    if (currentNode.parametricChild !== null) {
      if (node === null) {
        node = currentNode.parametricChild
      } else {
        parametricBrothersStack.push({
          brotherPathIndex: pathIndex,
          paramsCount: params.length
        })
      }
    }

    if (currentNode.wildcardChild !== null) {
      if (node === null) {
        node = currentNode.wildcardChild
      } else {
        wildcardBrothersStack.push({
          brotherPathIndex: pathIndex,
          paramsCount: params.length
        })
      }
    }

    if (node === null) {
      let brotherNodeState
      node = currentNode.parametricBrother
      if (node === null) {
        node = currentNode.wildcardBrother
        if (node === null) {
          return null
        }
        brotherNodeState = wildcardBrothersStack.pop()
      } else {
        brotherNodeState = parametricBrothersStack.pop()
      }

      pathIndex = brotherNodeState.brotherPathIndex
      params.splice(brotherNodeState.paramsCount)
    }

    currentNode = node
    const kind = node.kind

    // static route
    if (kind === NODE_TYPES.STATIC) {
      pathIndex += node.prefix.length
      continue
    }

    let paramEndIndex = kind === NODE_TYPES.MATCH_ALL ? pathLen : pathIndex

    for (; paramEndIndex < pathLen; paramEndIndex++) {
      if (path.charCodeAt(paramEndIndex) === 47) {
        break
      }
    }

    const decoded = sanitizedUrl.sliceParameter(pathIndex, paramEndIndex)
    if (decoded === null) {
      return this._onBadUrl(path.slice(pathIndex, paramEndIndex))
    }

    if (
      kind === NODE_TYPES.PARAM ||
      kind === NODE_TYPES.MATCH_ALL
    ) {
      if (decoded.length > maxParamLength) {
        return null
      }
      params.push(decoded)
    }

    if (kind === NODE_TYPES.REGEX) {
      const matchedParameters = node.regex.exec(decoded)
      if (matchedParameters === null) {
        return null
      }

      for (let i = 1; i < matchedParameters.length; i++) {
        const param = matchedParameters[i]
        if (param.length > maxParamLength) {
          return null
        }
        params.push(param)
      }
    }

    pathIndex = paramEndIndex
  }
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
  if (this.onBadUrl === null) {
    return null
  }
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

function escapeRegExp (string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function trimRegExpStartAndEnd (regexString) {
  // removes chars that marks start "^" and end "$" of regexp
  if (regexString.charCodeAt(1) === 94) {
    regexString = regexString.slice(0, 1) + regexString.slice(2)
  }

  if (regexString.charCodeAt(regexString.length - 2) === 36) {
    regexString = regexString.slice(0, regexString.length - 2) + regexString.slice(regexString.length - 1)
  }

  return regexString
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
