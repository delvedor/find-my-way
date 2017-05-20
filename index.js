'use strict'

/*
  Node type
    static: 0,
    param: 1,
    matchAll: 2,
*/

const assert = require('assert')
const Node = require('./node')
const httpMethods = ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT', 'OPTIONS', 'TRACE', 'CONNECT']

function Router (opts) {
  if (!(this instanceof Router)) {
    return new Router(opts)
  }
  opts = opts || {}

  if (opts.defaultRoute) {
    assert.equal(typeof opts.defaultRoute, 'function', 'The default route must be a function')
    this.defaultRoute = opts.defaultRoute
  }

  this.tree = new Node()
}

Router.prototype.on = function (method, path, handler, store) {
  assert.equal(typeof method, 'string', 'Method should be a string')
  assert.equal(typeof path, 'string', 'Path should be a string')
  assert.equal(typeof handler, 'function', 'Handler should be a function')
  assert.notEqual(httpMethods.indexOf(method), -1, `Method '${method}' is not an http method.`)

  const params = []
  var j = 0

  for (var i = 0, len = path.length; i < len; i++) {
    // search for parametric or wildcard routes
    // parametric route
    if (path.charCodeAt(i) === 58 /* : */) {
      j = i + 1
      this._insert(method, path.slice(0, i), 0, null, null, null)

      // isolate the parameter name
      while (i < len && path.charCodeAt(i) !== 47 /* / */) i++
      params.push(path.slice(j, i))

      path = path.slice(0, j) + path.slice(i)
      i = j
      len = path.length

      // if the path is ended
      if (i === len) {
        return this._insert(method, path.slice(0, i), 1, params, handler, store)
      }
      this._insert(method, path.slice(0, i), 1, params, null, null)

    // wildcard route
    } else if (path.charCodeAt(i) === 42 /* * */) {
      this._insert(method, path.slice(0, i), 0, null, null, null)
      params.push('*')
      return this._insert(method, path.slice(0, len), 2, params, handler, store)
    }
  }
  // static route
  this._insert(method, path, 0, params, handler, store)
}

Router.prototype._insert = function (method, path, kind, params, handler, store) {
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
    while (len < max && path[len] === prefix[len]) len++

    if (len < prefixLen) {
      // split the node in the radix tree and add it to the parent
      node = new Node(prefix.slice(len), currentNode.children, currentNode.kind, currentNode.map)

      // reset the parent
      currentNode.children = [node]
      currentNode.numberOfChildren = 1
      currentNode.prefix = prefix.slice(0, len)
      currentNode.label = currentNode.prefix[0]
      currentNode.map = {}
      currentNode.kind = 0

      if (len === pathLen) {
        // add the handler to the parent node
        assert(!currentNode.findHandler(method), `Method '${method}' already declared for route '${path}'`)
        currentNode.addHandler(method, handler, params, store)
        currentNode.kind = kind
      } else {
        // create a child node and add an handler to it
        node = new Node(path.slice(len), [], kind)
        node.addHandler(method, handler, params, store)
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
      node = new Node(path, [], kind)
      node.addHandler(method, handler, params, store)
      // add the child to the parent
      currentNode.add(node)
    } else if (handler) {
      // the node already exist
      assert(!currentNode.findHandler(method), `Method '${method}' already declared for route '${path}'`)
      currentNode.addHandler(method, handler, params, store)
    }
    return
  }
}

Router.prototype.lookup = function (req, res) {
  var handle = this.find(req.method, sanitizeUrl(req.url))
  if (!handle) return this._defaultRoute(req, res)
  return handle.handler(req, res, handle.params, handle.store)
}

Router.prototype.find = function (method, path) {
  var currentNode = this.tree
  var node = null
  var pindex = 0
  var params = []
  var pathLen = 0
  var prefix = ''
  var prefixLen = 0
  var len = 0
  var i = 0

  while (true) {
    pathLen = path.length
    prefix = currentNode.prefix
    prefixLen = prefix.length
    len = 0

    // found the route
    if (pathLen === 0 || path === prefix) {
      var handle = currentNode.findHandler(method)
      if (!handle) return null

      var paramNames = handle.params
      var paramsObj = {}

      for (i = 0; i < paramNames.length; i++) {
        paramsObj[paramNames[i]] = params[i]
      }

      return {
        handler: handle.handler,
        params: paramsObj,
        store: handle.store
      }
    }

    // search for the longest common prefix
    i = pathLen < prefixLen ? pathLen : prefixLen
    while (len < i && path[len] === prefix[len]) len++

    if (len === prefixLen) path = path.slice(len)

    // static route
    node = currentNode.find(path[0], 0)
    if (node) {
      currentNode = node
      continue
    }

    // parametric route
    node = currentNode.findByKind(1)
    if (node) {
      currentNode = node
      i = 0
      while (i < pathLen && path.charCodeAt(i) !== 47 /* / */) i++
      try {
        params[pindex++] = decodeURIComponent(path.slice(0, i))
      } catch (e) {
        return null
      }
      path = path.slice(i)
      continue
    }

    // wildcard route
    node = currentNode.findByKind(2)
    if (node) {
      try {
        params[pindex] = decodeURIComponent(path)
      } catch (e) {
        return null
      }
      currentNode = node
      path = ''
      continue
    }

    // route not found
    if (len !== prefixLen) return null
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

module.exports = Router

function sanitizeUrl (url) {
  for (var i = 0; i < url.length; i++) {
    var charCode = url.charCodeAt(i)
    if (charCode === 63 /* ? */ || charCode === 35 /* # */) {
      return url.slice(0, i)
    }
  }
  return url
}
