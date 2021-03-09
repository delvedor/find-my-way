/* eslint-disable no-multi-spaces */
const indent              = '    '
const branchIndent        = '│   '
const midBranchIndent     = '├── '
const endBranchIndent     = '└── '
const pathDelimiter       = '/'
const pathRegExp          = /(?=\/)/
/* eslint-enable */

function prettyPrintRoutesArray (routeArray) {
  const mergedRouteArray = []

  let tree = ''

  routeArray.sort((a, b) => {
    if (!a.path || !b.path) return 0
    return a.path.localeCompare(b.path)
  })

  // merge alike paths
  for (let i = 0; i < routeArray.length; i++) {
    const route = routeArray[i]
    const pathExists = mergedRouteArray.find(r => route.path === r.path)
    if (pathExists) {
      // path already declared, add new method and break out of loop
      pathExists.handlers.push({
        method: route.method,
        opts: route.opts.constraints || undefined
      })
      continue
    }

    const routeHandler = {
      method: route.method,
      opts: route.opts.constraints || undefined
    }
    mergedRouteArray.push({
      path: route.path,
      methods: [route.method],
      opts: [route.opts],
      handlers: [routeHandler],
      parents: [],
      branchLevel: 1
    })
  }

  // insert root level path if none defined
  if (!mergedRouteArray.filter(r => r.path === pathDelimiter).length) {
    mergedRouteArray.unshift({
      path: pathDelimiter,
      truncatedPath: '',
      methods: [],
      opts: {},
      handlers: [],
      parents: [pathDelimiter]
    })
  }

  // build tree
  const routeTree = buildRouteTree(mergedRouteArray)

  // draw tree
  tree = drawBranch(routeTree, null, true, false, true)
  return tree
}

function buildRouteTree (mergedRouteArray, rootPath) {
  rootPath = rootPath || pathDelimiter

  const result = []
  const temp = { result }
  mergedRouteArray.forEach((route, idx) => {
    let splitPath = route.path.split(pathRegExp)

    // add preceding slash for proper nesting
    if (splitPath[0] !== pathDelimiter) splitPath = [pathDelimiter, splitPath[0].slice(1), ...splitPath.slice(1)]

    // build tree
    splitPath.reduce((acc, path, pidx) => {
      if (!acc[path]) {
        acc[path] = { result: [] }
        const pathSeg = { path, children: acc[path].result }

        if (pidx === splitPath.length - 1) pathSeg.handlers = route.handlers
        acc.result.push(pathSeg)
      }
      return acc[path]
    }, temp)
  })

  // unfold root object from array
  return result.find(res => res.path === rootPath)
}

function drawBranch (pathSeg, prefix, endBranch, noPrefix, rootBranch) {
  let branch = ''

  if (!noPrefix && !rootBranch) branch += '\n'
  if (!noPrefix) branch += `${prefix || ''}${endBranch ? endBranchIndent : midBranchIndent}`
  branch += `${pathSeg.path}`

  if (pathSeg.handlers) branch += ` (${pathSeg.handlers.map(h => h.method + `${h.opts ? ' ' + JSON.stringify(h.opts) : ''}`).join(', ') || '-'})`
  if (!noPrefix) prefix = `${prefix || ''}${endBranch ? indent : branchIndent}`

  pathSeg.children.forEach((child, idx) => {
    const endBranch = idx === pathSeg.children.length - 1
    const skipPrefix = (!pathSeg.handlers && pathSeg.children.length === 1)
    branch += drawBranch(child, prefix, endBranch, skipPrefix)
  })

  return branch
}

function prettyPrintFlattenedNode (flattenedNode, prefix, tail) {
  var paramName = ''
  const printHandlers = []

  for (const node of flattenedNode.nodes) {
    for (const handler of node.handlers) {
      printHandlers.push({ method: node.method, ...handler })
    }
  }

  printHandlers.forEach((handler, index) => {
    let suffix = `(${handler.method}`
    if (Object.keys(handler.constraints).length > 0) {
      suffix += ' ' + JSON.stringify(handler.constraints)
    }
    suffix += ')'

    let name = ''
    if (flattenedNode.prefix.includes(':')) {
      var params = handler.params
      name = params[params.length - 1]
      if (index > 0) {
        name = ':' + name
      }
    } else if (index > 0) {
      name = flattenedNode.prefix
    }

    if (index === 0) {
      paramName += name + ` ${suffix}`
      return
    } else {
      paramName += '\n'
    }

    paramName += prefix + indent + name + ` ${suffix}`
  })

  var tree = `${prefix}${tail ? endBranchIndent : midBranchIndent}${flattenedNode.prefix}${paramName}\n`

  prefix = `${prefix}${tail ? indent : branchIndent}`
  const labels = Object.keys(flattenedNode.children)
  for (var i = 0; i < labels.length; i++) {
    const child = flattenedNode.children[labels[i]]
    tree += prettyPrintFlattenedNode(child, prefix, i === (labels.length - 1))
  }
  return tree
}

function flattenNode (flattened, node) {
  if (node.handlers.length > 0) {
    flattened.nodes.push(node)
  }

  if (node.children) {
    for (const child of Object.values(node.children)) {
      // split on the slash separator but use a regex to lookahead and not actually match it, preserving it in the returned string segments
      const childPrefixSegments = child.prefix.split(pathRegExp)
      let cursor = flattened
      let parent
      for (const segment of childPrefixSegments) {
        parent = cursor
        cursor = cursor.children[segment]
        if (!cursor) {
          cursor = {
            prefix: segment,
            nodes: [],
            children: {}
          }
          parent.children[segment] = cursor
        }
      }
      flattenNode(cursor, child)
    }
  }
}

function compressFlattenedNode (flattenedNode) {
  const childKeys = Object.keys(flattenedNode.children)
  if (flattenedNode.nodes.length === 0 && childKeys.length === 1) {
    const child = flattenedNode.children[childKeys[0]]
    if (child.nodes.length <= 1) {
      compressFlattenedNode(child)
      flattenedNode.nodes = child.nodes
      flattenedNode.prefix += child.prefix
      flattenedNode.children = child.children
      return flattenedNode
    }
  }

  for (const key of Object.keys(flattenedNode.children)) {
    compressFlattenedNode(flattenedNode.children[key])
  }

  return flattenedNode
}

module.exports = { flattenNode, compressFlattenedNode, prettyPrintFlattenedNode, prettyPrintRoutesArray }
