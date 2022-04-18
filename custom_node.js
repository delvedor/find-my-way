'use strict'

const HandlerStorage = require('./handler_storage')

const NODE_TYPES = {
  STATIC: 0,
  PARAMETRIC: 1,
  WILDCARD: 2
}

class Node {
  constructor () {
    this.handlerStorage = new HandlerStorage()
  }
}

class ParentNode extends Node {
  constructor () {
    super()
    this.staticChildren = {}
  }

  findStaticMatchingChild (path, pathIndex) {
    const staticChild = this.staticChildren[path.charAt(pathIndex)]
    if (staticChild === undefined) {
      return null
    }

    for (let i = 0; i < staticChild.prefix.length; i++) {
      if (path.charCodeAt(pathIndex + i) !== staticChild.prefix.charCodeAt(i)) {
        return null
      }
    }
    return staticChild
  }

  createStaticChild (path) {
    if (path.length === 0) {
      return this
    }

    let staticChild = this.staticChildren[path.charAt(0)]
    if (staticChild) {
      let i = 0
      for (; i < staticChild.prefix.length; i++) {
        if (path.charCodeAt(i) !== staticChild.prefix.charCodeAt(i)) {
          staticChild = staticChild.split(this, i)
          break
        }
      }
      return staticChild.createStaticChild(path.slice(i))
    }

    const label = path.charAt(0)
    this.staticChildren[label] = new StaticNode(path)
    return this.staticChildren[label]
  }
}

class StaticNode extends ParentNode {
  constructor (prefix) {
    super()
    this.prefix = prefix
    this.wildcardChild = null
    this.parametricChild = null
    this.kind = NODE_TYPES.STATIC
  }

  createParametricChild (regex) {
    if (this.parametricChild) {
      return this.parametricChild
    }

    this.parametricChild = new ParametricNode(regex)
    return this.parametricChild
  }

  createWildcardChild () {
    if (this.wildcardChild) {
      return this.wildcardChild
    }

    this.wildcardChild = new WildcardNode()
    return this.wildcardChild
  }

  split (parentNode, length) {
    const parentPrefix = this.prefix.slice(0, length)
    const childPrefix = this.prefix.slice(length)

    this.prefix = childPrefix

    const staticNode = new StaticNode(parentPrefix)
    staticNode.staticChildren[childPrefix.charAt(0)] = this
    parentNode.staticChildren[parentPrefix.charAt(0)] = staticNode

    return staticNode
  }
}

class ParametricNode extends ParentNode {
  constructor (regex) {
    super()
    this.regex = regex || null
    this.isRegex = !!regex
    this.kind = NODE_TYPES.PARAMETRIC
  }
}

class WildcardNode extends Node {
  constructor () {
    super()
    this.kind = NODE_TYPES.WILDCARD
  }
}

module.exports = { StaticNode, ParametricNode, WildcardNode, NODE_TYPES }
