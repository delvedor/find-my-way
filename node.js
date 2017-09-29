'use strict'

/*
  Node type
    static: 0,
    param: 1,
    matchAll: 2,
    regex: 3
*/

function Node (prefix, children, kind, map, regex) {
  this.prefix = prefix || '/'
  this.label = this.prefix[0]
  this.children = children || []
  this.numberOfChildren = this.children.length
  this.kind = kind || 0
  this.map = map || null
  this.regex = regex || null
}

Node.prototype.add = function (node) {
  if (node.kind === 0) {
    for (var i = 0; i < this.numberOfChildren; i++) {
      if (this.children[i].kind > 0) {
        this.children.splice(i, 0, node)
        this.numberOfChildren++
        return
      }
    }
  }
  this.children.push(node)
  this.numberOfChildren++
}

Node.prototype.findByLabel = function (label) {
  for (var i = 0; i < this.numberOfChildren; i++) {
    var child = this.children[i]
    if (child.label === label) {
      return child
    }
  }
  return null
}

// Check in two different places the numberOfChildren and the map object
// gives us around ~5% more speed
Node.prototype.find = function (label, method) {
  for (var i = 0; i < this.numberOfChildren; i++) {
    var child = this.children[i]
    if (child.numberOfChildren !== 0) {
      if (child.label === label && child.kind === 0) {
        return child
      }
      if (child.kind > 0) {
        return child
      }
    }

    if (child.map && child.map[method]) {
      if (child.label === label && child.kind === 0) {
        return child
      }
      if (child.kind > 0) {
        return child
      }
    }
  }
  return null
}

Node.prototype.setHandler = function (method, handler, params, store) {
  if (!handler) return
  this.map = this.map || {}
  this.map[method] = {
    handler: handler,
    params: params,
    store: store || null
  }
}

Node.prototype.getHandler = function (method) {
  return this.map ? this.map[method] : null
}

Node.prototype.prettyPrint = function (prefix, tail) {
  var paramName = ''
  var map = this.map || {}
  var methods = Object.keys(map).filter(method => map[method].handler)

  if (this.prefix === ':') {
    methods.forEach((method, index) => {
      var params = this.map[method].params
      var param = params[params.length - 1]
      if (methods.length > 1) {
        if (index === 0) {
          paramName += param + ` (${method})\n`
          return
        }
        paramName += '    ' + prefix + ':' + param + ` (${method})`
        paramName += (index === methods.length - 1 ? '' : '\n')
      } else {
        paramName = params[params.length - 1] + ` (${method})`
      }
    })
  } else if (methods.length) {
    paramName = ` (${methods.join('|')})`
  }

  var tree = `${prefix}${tail ? '└── ' : '├── '}${this.prefix}${paramName}\n`

  prefix = `${prefix}${tail ? '    ' : '│   '}`
  for (var i = 0; i < this.numberOfChildren - 1; i++) {
    tree += this.children[i].prettyPrint(prefix, false)
  }
  if (this.numberOfChildren > 0) {
    tree += this.children[this.numberOfChildren - 1].prettyPrint(prefix, true)
  }
  return tree
}

module.exports = Node
