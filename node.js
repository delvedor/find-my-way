'use strict'

const types = {
  STATIC: 0,
  PARAM: 1,
  MATCH_ALL: 2,
  REGEX: 3,
  // It's used for a parameter, that is followed by another parameter in the same part
  MULTI_PARAM: 4
}

function Node (prefix, children, kind, map, regex) {
  this.prefix = prefix || '/'
  this.label = this.prefix[0]
  this.children = children || []
  this.numberOfChildren = this.children.length
  this.kind = kind || this.types.STATIC
  this.map = map || {}
  this.regex = regex || null
  this.wildcardChild = null
  this.parametricBrother = null
}

Object.defineProperty(Node.prototype, 'types', {
  value: types
})

Node.prototype.add = function (node) {
  if (node.kind === this.types.MATCH_ALL) {
    this.wildcardChild = node
  }

  this.children.push(node)
  this.children.sort((n1, n2) => n1.kind - n2.kind)
  this.numberOfChildren++

  // Search for a parametric brother and store it in a variable
  for (var i = 0; i < this.numberOfChildren; i++) {
    const child = this.children[i]
    if ([this.types.PARAM, this.types.REGEX, this.types.MULTI_PARAM].indexOf(node.kind) > -1) {
      var parametricBrother = child
      break
    }
  }

  // Save the parametric brother inside a static child
  for (i = 0; i < this.numberOfChildren; i++) {
    if (this.children[i].kind === thid.types.STATIC && parametricBrother) {
      this.children[i].parametricBrother = parametricBrother
    }
  }
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

Node.prototype.find = function (label, method) {
  for (var i = 0; i < this.numberOfChildren; i++) {
    var child = this.children[i]
    if (child.numberOfChildren !== 0 || child.map[method]) {
      if (child.label === label && child.kind === 0) {
        return child
      }
      if (child.kind !== 0) return child
    }
  }
  return null
}

Node.prototype.setHandler = function (method, handler, params, store) {
  if (!handler) return

  this.map[method] = {
    handler: handler,
    params: params,
    store: store || null,
    paramsLength: params.length
  }
}

Node.prototype.getHandler = function (method) {
  return this.map[method]
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
