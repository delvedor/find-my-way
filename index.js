'use strict'

/*
  Node type
    static: 0,
    param: 1,
    matchAll: 2,

  Char codes:
    slash: 47,
    colon: 58,
    star: 42
*/

const Node = require('./node')

function Router (opts) {
  if (!(this instanceof Router)) {
    return new Router(opts)
  }
  opts = opts || {}
  if (opts.defaultRoute) {
    this.defaultRoute = opts.defaultRoute
  }
  if (opts.async) {
    this.async = true
  }

  this.tree = new Node()
}

Router.prototype.on = function (method, path, handler) {
  const params = []
  var charCode = 0
  var j = 0

  for (var i = 0, len = path.length; i < len; i++) {
    // search for parametric or wildcard routes
    charCode = path.codePointAt(i)
    // parametric route
    if (charCode === 58) {
      j = i + 1
      this._insert(method, path.slice(0, i), 0, null, null)

      // isolate the parameter name
      while (i < len && path.codePointAt(i) !== 47) i++
      params.push(path.slice(j, i))

      path = path.slice(0, j) + path.slice(i)
      i = j
      len = path.length

      // if the path is ended
      if (i === len) {
        return this._insert(method, path.slice(0, i), 1, params, handler)
      }
      this._insert(method, path.slice(0, i), 1, params, null)

    // wildcard route
    } else if (charCode === 42) {
      this._insert(method, path.slice(0, i), 0, null, null)
      params.push('*')
      return this._insert(method, path.slice(0, len), 2, params, handler)
    }
  }
  // static route
  this._insert(method, path, 0, params, handler)
}

Router.prototype._insert = function (method, path, kind, params, handler) {
  var prefix = ''
  var pathLen = 0
  var prefixLen = 0
  var len = 0
  var max = 0
  var node = null
  var currentNode = this.tree

  while (true) {
    prefix = currentNode.prefix
    prefixLen = prefix.length
    pathLen = path.length
    len = 0

    // search for the longest common prefix
    max = pathLen < prefixLen ? pathLen : prefixLen
    while (len < max && path.codePointAt(len) === prefix.codePointAt(len)) len++

    if (len < prefixLen) {
      // split the node in the radix tree and add it to the parent
      node = new Node(prefix.slice(len), currentNode.children, currentNode.kind, currentNode.map)

      // reset the parent
      currentNode.children = [node]
      currentNode.prefix = prefix.slice(0, len)
      currentNode.label = currentNode.prefix.codePointAt(0)
      currentNode.map = Object.create(null)
      currentNode.kind = 0

      if (len === pathLen) {
        // add the handler to the parent node
        currentNode.addHandler(method, handler, params)
        currentNode.kind = kind
      } else {
        // create a child node and add an handler to it
        node = new Node(path.slice(len), [], kind)
        node.addHandler(method, handler, params)
        // add the child to the parent
        currentNode.add(node)
      }
    } else if (len < pathLen) {
      path = path.slice(len)
      node = currentNode.findByLabel(path.codePointAt(0))
      if (node) {
        // we must go deeper in the tree
        currentNode = node
        continue
      }
      // create a new child node
      node = new Node(path, [], kind)
      node.addHandler(method, handler, params)
      // add the child to the parent
      currentNode.add(node)
    } else if (handler) {
      // the node already exist
      currentNode.addHandler(method, handler, params)
    }
    return
  }
}

Router.prototype.lookup = function (method, path, req, res) {
  var handle = this._lookup(method, path, this.tree, { handler: null, params: [] })
  if (!handle.handler) return this._defaultRoute(req, res)
  if (this.async) {
    return setImmediate(handle.handler, req, res, handle.params)
  }
  return handle.handler(req, res, handle.params)
}

Router.prototype.find = function (method, path) {
  return this._lookup(method, path, this.tree, { handler: null, params: [] })
}

Router.prototype._lookup = function (method, path, currentNode, route) {
  var pathLen = path.length
  var prefix = currentNode.prefix

  // found the route
  if (pathLen === 0 || path === prefix) {
    var handle = currentNode.findHandler(method)
    if (!handle || !handle.handler) return route

    route.handler = handle.handler
    var paramNames = handle.params
    var paramValues = route.params
    route.params = {}

    for (var i = 0; i < paramNames.length; i++) {
      route.params[paramNames[i]] = paramValues[i]
    }

    return route
  }

  var swapPath = ''
  var prefixLen = prefix.length
  var len = 0
  // search for the longest common prefix
  var max = pathLen < prefixLen ? pathLen : prefixLen
  while (len < max && path.codePointAt(len) === prefix.codePointAt(len)) len++

  if (len === prefixLen) path = path.slice(len)
  swapPath = path

  // static route
  var node = currentNode.find(path.codePointAt(0), 0)
  if (node) {
    this._lookup(method, path, node, route)
    if (route.hanlder) {
      return route
    }
    path = swapPath
  }

  // route not found
  if (len !== prefixLen) {
    return route
  }

  // parametric route
  node = currentNode.findByKind(1)
  if (node) {
    len = path.length
    i = 0
    // find the next '/'
    while (i < len && path.codePointAt(i) !== 47) i++
    // save the param value
    route.params.push(path.slice(0, i))
    swapPath = path
    path = path.slice(i)
    this._lookup(method, path, node, route)
    if (route.handler) {
      return route
    }
    route.params.pop()
    path = swapPath
  }

  // wildcard route
  node = currentNode.findByKind(2)
  if (node) {
    route.params.push(path)
    this._lookup(method, '', node, route)
  }

  return route
}

Router.prototype._defaultRoute = function (req, res) {
  if (this.defaultRoute) {
    this.defaultRoute(req, res)
  } else {
    res.statusCode = 404
    res.end()
  }
}

module.exports = Router
