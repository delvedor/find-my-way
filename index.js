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
const deepEqual = require('fast-deep-equal')
const fastDecode = require('fast-decode-uri-component')
const { flattenNode, compressFlattenedNode, prettyPrintFlattenedNode, prettyPrintRoutesArray } = require('./lib/pretty-print')
const { StaticNode, NODE_TYPES } = require('./custom_node')
const Constrainer = require('./lib/constrainer')

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
  }

  this.caseSensitive = opts.caseSensitive === undefined ? true : opts.caseSensitive
  this.ignoreTrailingSlash = opts.ignoreTrailingSlash || false
  this.maxParamLength = opts.maxParamLength || 100
  this.allowUnsafeRegex = opts.allowUnsafeRegex || false
  this.routes = []
  this.trees = {}

  this.decodeURIComponent = opts.decodeUriParameters || fastDecode
  this.constrainer = new Constrainer(opts.constraints)
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

  const route = path

  if (this.ignoreTrailingSlash) {
    path = trimLastSlash(path)
  }

  const methods = Array.isArray(method) ? method : [method]
  for (const method of methods) {
    this._on(method, path, opts, handler, store, route)
    this.routes.push({ method, path, opts, handler, store })
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

  // Boot the tree for this method if it doesn't exist yet
  if (this.trees[method] === undefined) {
    this.trees[method] = new StaticNode('/')
  }

  if (path === '*' && this.trees[method].prefix.length !== 0) {
    const currentRoot = this.trees[method]
    this.trees[method] = new StaticNode('')
    this.trees[method].staticChildren['/'] = currentRoot
  }

  let currentNode = this.trees[method]
  let parentNodePathIndex = currentNode.prefix.length

  const params = []
  for (let i = 0; i <= path.length; i++) {
    if (path.charCodeAt(i) === 58 && path.charCodeAt(i + 1) === 58) {
      // It's a double colon. Let's just replace it with a single colon and go ahead
      path = path.slice(0, i) + path.slice(i + 1)
      continue
    }

    const isParametricNode = path.charCodeAt(i) === 58
    const isWildcardNode = path.charCodeAt(i) === 42

    if (isParametricNode || isWildcardNode || (i === path.length && i !== parentNodePathIndex)) {
      let staticNodePath = path.slice(parentNodePathIndex, i)
      if (!this.caseSensitive) {
        staticNodePath = staticNodePath.toLowerCase()
      }

      if (opts.encode) {
        staticNodePath = encodeURI(staticNodePath)
      }

      // add the static part of the route to the tree
      currentNode = currentNode.createStaticChild(staticNodePath)
    }

    if (isParametricNode) {
      let isRegexNode = false
      const regexps = []

      let lastParamStartIndex = i + 1
      for (let j = lastParamStartIndex; ; j++) {
        const charCode = path.charCodeAt(j)

        if (charCode === 40 || charCode === 45 || charCode === 46) {
          isRegexNode = true

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

          let staticPart = path.slice(j, lastParamEndIndex)
          if (staticPart) {
            if (!this.caseSensitive) {
              staticPart = staticPart.toLowerCase()
            }

            if (opts.encode) {
              staticPart = encodeURI(staticPart)
            }

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
          path = path.slice(0, i + 1) + path.slice(j)
          break
        }
      }

      let regex = null
      if (isRegexNode) {
        regex = new RegExp('^' + regexps.join('') + '$')
      }

      currentNode = currentNode.createParametricChild(regex)
      parentNodePathIndex = i + 1
    } else if (isWildcardNode) {
      // add the wildcard parameter
      params.push('*')
      currentNode = currentNode.createWildcardChild()
      parentNodePathIndex = i + 1
    }
  }

  assert(!currentNode.handlerStorage.hasHandler(constraints), `Method '${method}' already declared for route '${path}' with constraints '${JSON.stringify(constraints)}'`)
  currentNode.handlerStorage.addHandler(handler, params, store, this.constrainer, constraints)
}

Router.prototype.reset = function reset () {
  this.trees = {}
  this.routes = []
}

Router.prototype.off = function off (method, path, opts) {
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

    this.off(method, pathFull, opts)
    this.off(method, pathOptional, opts)
    return
  }

  if (this.ignoreTrailingSlash) {
    path = trimLastSlash(path)
  }

  const methods = Array.isArray(method) ? method : [method]
  for (const method of methods) {
    this._off(method, path, opts)
  }
}

Router.prototype._off = function _off (method, path, opts) {
  // method validation
  assert(typeof method === 'string', 'Method should be a string')
  assert(httpMethods.includes(method), `Method '${method}' is not an http method.`)

  function matcher (currentConstraints) {
    if (!opts || !currentConstraints) return true

    return deepEqual(opts, currentConstraints)
  }

  // Rebuild tree without the specific route
  const newRoutes = this.routes.filter((route) => method !== route.method || path !== route.path || !matcher(route.opts.constraints))
  this.reset()

  for (const route of newRoutes) {
    const { method, path, opts, handler, store } = route
    this._on(method, path, opts, handler, store)
    this.routes.push({ method, path, opts, handler, store })
  }
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

  if (this.ignoreTrailingSlash) {
    path = trimLastSlash(path)
  }
  const originPath = path

  if (this.caseSensitive === false) {
    path = path.toLowerCase()
  }

  const maxParamLength = this.maxParamLength

  let pathIndex = currentNode.prefix.length
  const params = []

  const brothersNodesStack = []

  while (true) {
    if (pathIndex === path.length) {
      const handle = currentNode.handlerStorage.getMatchingHandler(derivedConstraints)

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

    let node = null

    if (
      currentNode.kind === NODE_TYPES.STATIC ||
      currentNode.kind === NODE_TYPES.PARAMETRIC
    ) {
      node = currentNode.findStaticMatchingChild(path, pathIndex)

      if (currentNode.kind === NODE_TYPES.STATIC) {
        if (node === null) {
          if (currentNode.parametricChild !== null) {
            node = currentNode.parametricChild

            if (currentNode.wildcardChild !== null) {
              brothersNodesStack.push({
                brotherPathIndex: pathIndex,
                paramsCount: params.length,
                brotherNode: currentNode.wildcardChild
              })
            }
          } else {
            node = currentNode.wildcardChild
          }
        } else {
          if (currentNode.wildcardChild !== null) {
            brothersNodesStack.push({
              brotherPathIndex: pathIndex,
              paramsCount: params.length,
              brotherNode: currentNode.wildcardChild
            })
          }

          if (currentNode.parametricChild !== null) {
            brothersNodesStack.push({
              brotherPathIndex: pathIndex,
              paramsCount: params.length,
              brotherNode: currentNode.parametricChild
            })
          }
        }
      }
    }

    if (node === null) {
      if (brothersNodesStack.length === 0) {
        return null
      }

      const brotherNodeState = brothersNodesStack.pop()
      pathIndex = brotherNodeState.brotherPathIndex
      params.splice(brotherNodeState.paramsCount)
      node = brotherNodeState.brotherNode
    }

    currentNode = node

    // static route
    if (currentNode.kind === NODE_TYPES.STATIC) {
      pathIndex += currentNode.prefix.length

      // Some systems do not follow RFC and separate the path and query
      // string with a `;` character (code 59), e.g. `/foo;jsessionid=123456`.
      // Thus, we need to split on `;` as well as `?` and `#`.
      const charCode = path.charCodeAt(pathIndex)
      if (charCode === 63 || charCode === 59 || charCode === 35) {
        path = path.slice(0, pathIndex)
      }

      continue
    }

    if (currentNode.kind === NODE_TYPES.WILDCARD) {
      let paramEndIndex = pathIndex
      let shouldDecode = false
      for (; paramEndIndex < path.length; paramEndIndex++) {
        const charCode = path.charCodeAt(paramEndIndex)
        if (charCode === 37) {
          shouldDecode = true
        } else if (charCode === 63 || charCode === 59 || charCode === 35) {
          path = path.slice(0, paramEndIndex)
          break
        }
      }

      let param = originPath.slice(pathIndex, paramEndIndex)
      if (shouldDecode) {
        param = this.decodeURIComponent(param)

        if (param === null) {
          return this._onBadUrl(originPath)
        }
      }

      if (param.length > maxParamLength) {
        return null
      }

      params.push(param)
      pathIndex = path.length
      continue
    }

    if (currentNode.kind === NODE_TYPES.PARAMETRIC) {
      let paramEndIndex = pathIndex
      let shouldDecode = false
      for (; paramEndIndex < path.length; paramEndIndex++) {
        const charCode = path.charCodeAt(paramEndIndex)
        if (charCode === 47) {
          break
        } else if (charCode === 37) {
          shouldDecode = true
        } else if (charCode === 63 || charCode === 59 || charCode === 35) {
          path = path.slice(0, paramEndIndex)
          break
        }
      }

      let param = originPath.slice(pathIndex, paramEndIndex)
      if (shouldDecode) {
        param = this.decodeURIComponent(param)

        if (param === null) {
          return this._onBadUrl(originPath)
        }
      }

      if (currentNode.isRegex) {
        const matchedParameters = currentNode.regex.exec(param)
        if (matchedParameters === null) {
          return null
        }

        for (let i = 1; i < matchedParameters.length; i++) {
          const matchedParameter = matchedParameters[i]
          if (matchedParameter.length > maxParamLength) {
            return null
          }
          params.push(matchedParameter)
        }
      } else {
        if (param.length > maxParamLength) {
          return null
        }
        params.push(param)
      }

      pathIndex = paramEndIndex
    }
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

  for (const method in this.trees) {
    const node = this.trees[method]
    if (node) {
      flattenNode(root, node, method)
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

function trimLastSlash (path) {
  if (path.length > 1 && path.charCodeAt(path.length - 1) === 47) {
    return path.slice(0, -1)
  }
  return path
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
