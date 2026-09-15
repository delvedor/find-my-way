'use strict'

const HandlerStorage = require('./handler-storage')

const NODE_TYPES = {
  STATIC: 0,
  PARAMETRIC: 1,
  WILDCARD: 2
}

// Prefixes at least this long are matched with a native String#indexOf, which
// runs in roughly constant time, instead of the compiled chain of charCodeAt
// comparisons whose cost grows with every char.
const LONG_PREFIX_MIN_LENGTH = 16

function matchSingleCharPrefix () {
  return true
}

function compilePrefixMatch (prefix) {
  if (prefix.length === 1) {
    return matchSingleCharPrefix
  }

  if (prefix.length >= LONG_PREFIX_MIN_LENGTH) {
    return function matchLongPrefix (path, i) {
      return path.indexOf(prefix, i) === i
    }
  }

  const lines = []
  for (let i = 1; i < prefix.length; i++) {
    const charCode = prefix.charCodeAt(i)
    lines.push(`path.charCodeAt(i + ${i}) === ${charCode}`)
  }
  return new Function('path', 'i', `return ${lines.join(' && ')}`) // eslint-disable-line
}

// Every node kind is an instance of this one class so that all nodes share a
// single hidden class. The router's lookup loop alternates between static,
// parametric and wildcard nodes, and with one shape every property access in
// that loop stays monomorphic. Fields that only apply to some kinds are set to
// their neutral value on the others: the lookup loop can then read
// staticChildren, parametricChildren and wildcardChild from any node without
// checking its kind first.
class Node {
  constructor (kind, prefix, regex, staticSuffix, nodePath) {
    this.kind = kind
    this.prefix = prefix
    this.isLeafNode = false
    this.routes = null
    this.handlerStorage = null

    // Static children are stored in parallel arrays keyed by the charCode of
    // the child's first char. A linear scan over integers is faster than a
    // dictionary lookup by single-char string on the hot path.
    this.staticChildrenCharCodes = []
    this.staticChildrenNodes = []

    // static node only
    this.parametricChildren = []
    this.wildcardChild = null
    this.matchPrefix = kind === NODE_TYPES.STATIC ? compilePrefixMatch(prefix) : null

    // parametric node only
    this.isRegex = regex != null
    this.regex = regex || null
    this.staticSuffix = staticSuffix || null
    this.nodePaths = kind === NODE_TYPES.PARAMETRIC ? new Set([nodePath]) : null
  }

  addRoute (route, constrainer) {
    if (this.routes === null) {
      this.routes = []
    }
    if (this.handlerStorage === null) {
      this.handlerStorage = new HandlerStorage()
    }
    this.isLeafNode = true
    this.routes.push(route)
    this.handlerStorage.addHandler(constrainer, route)
  }

  setStaticChild (label, node) {
    const charCode = label.charCodeAt(0)
    const index = this.staticChildrenCharCodes.indexOf(charCode)
    if (index === -1) {
      this.staticChildrenCharCodes.push(charCode)
      this.staticChildrenNodes.push(node)
    } else {
      this.staticChildrenNodes[index] = node
    }
  }

  findStaticMatchingChild (path, pathIndex) {
    const charCode = path.charCodeAt(pathIndex)
    const charCodes = this.staticChildrenCharCodes
    for (let i = 0; i < charCodes.length; i++) {
      if (charCodes[i] === charCode) {
        const staticChild = this.staticChildrenNodes[i]
        if (staticChild.matchPrefix(path, pathIndex)) {
          return staticChild
        }
        return null
      }
    }
    return null
  }

  getStaticChild (path, pathIndex = 0) {
    if (path.length === pathIndex) {
      return this
    }

    const staticChild = this.findStaticMatchingChild(path, pathIndex)
    if (staticChild) {
      return staticChild.getStaticChild(path, pathIndex + staticChild.prefix.length)
    }

    return null
  }

  createStaticChild (path) {
    if (path.length === 0) {
      return this
    }

    const childIndex = this.staticChildrenCharCodes.indexOf(path.charCodeAt(0))
    let staticChild = childIndex === -1 ? undefined : this.staticChildrenNodes[childIndex]
    if (staticChild) {
      let i = 1
      for (; i < staticChild.prefix.length; i++) {
        if (path.charCodeAt(i) !== staticChild.prefix.charCodeAt(i)) {
          staticChild = staticChild.split(this, i)
          break
        }
      }
      return staticChild.createStaticChild(path.slice(i))
    }

    const node = createStaticNode(path)
    this.setStaticChild(path.charAt(0), node)
    return node
  }

  getParametricChild (regex) {
    const regexpSource = regex && regex.source

    const parametricChild = this.parametricChildren.find(child => {
      const childRegexSource = child.regex && child.regex.source
      return childRegexSource === regexpSource
    })

    if (parametricChild) {
      return parametricChild
    }

    return null
  }

  createParametricChild (regex, staticSuffix, nodePath) {
    let parametricChild = this.getParametricChild(regex)
    if (parametricChild) {
      parametricChild.nodePaths.add(nodePath)
      return parametricChild
    }

    parametricChild = createParametricNode(regex, staticSuffix, nodePath)
    this.parametricChildren.push(parametricChild)
    this.parametricChildren.sort((child1, child2) => {
      if (!child1.isRegex) return 1
      if (!child2.isRegex) return -1

      if (child1.staticSuffix === null) return 1
      if (child2.staticSuffix === null) return -1

      if (child2.staticSuffix.endsWith(child1.staticSuffix)) return 1
      if (child1.staticSuffix.endsWith(child2.staticSuffix)) return -1

      return 0
    })

    return parametricChild
  }

  getWildcardChild () {
    return this.wildcardChild
  }

  createWildcardChild () {
    this.wildcardChild = this.getWildcardChild() || createWildcardNode()
    return this.wildcardChild
  }

  // Returns the next node to visit for the path at pathIndex, preferring a
  // static child, then the first parametric child, then the wildcard. Every
  // sibling that is skipped over is pushed on nodeStack as a flat triple
  // (node, pathIndex, paramsCount) so lookup can backtrack to it later.
  getNextNode (path, pathIndex, nodeStack, paramsCount) {
    let node = this.findStaticMatchingChild(path, pathIndex)
    let parametricBrotherNodeIndex = 0

    if (node === null) {
      if (this.parametricChildren.length === 0) {
        return this.wildcardChild
      }

      node = this.parametricChildren[0]
      parametricBrotherNodeIndex = 1
    }

    if (this.wildcardChild !== null) {
      nodeStack.push(this.wildcardChild, pathIndex, paramsCount)
    }

    for (let i = this.parametricChildren.length - 1; i >= parametricBrotherNodeIndex; i--) {
      nodeStack.push(this.parametricChildren[i], pathIndex, paramsCount)
    }

    return node
  }

  split (parentNode, length) {
    const parentPrefix = this.prefix.slice(0, length)
    const childPrefix = this.prefix.slice(length)

    this.prefix = childPrefix
    this.matchPrefix = compilePrefixMatch(childPrefix)

    const staticNode = createStaticNode(parentPrefix)
    staticNode.setStaticChild(childPrefix.charAt(0), this)
    parentNode.setStaticChild(parentPrefix.charAt(0), staticNode)

    return staticNode
  }
}

function createStaticNode (prefix) {
  return new Node(NODE_TYPES.STATIC, prefix, null, null, null)
}

function createParametricNode (regex, staticSuffix, nodePath) {
  return new Node(NODE_TYPES.PARAMETRIC, '', regex, staticSuffix, nodePath)
}

function createWildcardNode () {
  return new Node(NODE_TYPES.WILDCARD, '', null, null, null)
}

module.exports = { Node, createStaticNode, createParametricNode, createWildcardNode, NODE_TYPES }
