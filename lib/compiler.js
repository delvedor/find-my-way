'use strict'

const { NODE_TYPES } = require('./node')
const { NullObject } = require('./null-object')
const { safeDecodeURIComponent } = require('./url-sanitizer')

// Prefixes at least this long are matched with a native String#indexOf, which
// runs in roughly constant time, instead of a chain of charCodeAt comparisons
// whose cost grows with every char.
const LONG_PREFIX_MIN_LENGTH = 16

// The raw matcher scans path segments with a char loop up to this many chars
// before switching to a native regex search, whose fixed cost only pays off
// on longer segments.
const SCAN_LOOP_MAX_LENGTH = 12

// A subtree whose generated code exceeds SPLIT_LINES lines, or that would
// grow the function it is emitted into past FUNCTION_LINES lines, is emitted
// as a function of its own. V8 only optimizes functions up to a certain
// bytecode size, and a large route table compiled into a single function
// would stay in the interpreter forever.
const SPLIT_LINES = 250
const FUNCTION_LINES = 400

// Returned by a subtree function instead of null when the caller has to do
// something besides trying the next alternative: retry through the
// sanitized matcher in raw mode, or record that a parameter exceeded
// maxParamLength in sanitized mode.
const FLAG = Symbol('find-my-way.compiled.flag')

// Stand for the path position and for the "retry through the sanitized
// matcher" statement in the code of a subtree until it is known whether that
// code is emitted inline or as a function of its own.
const POSITION_PLACEHOLDER = '@POS@'
const RETRY_PLACEHOLDER = '@RETRY@'
const POSITION_PATTERN = /@POS@(?: \+ (\d+))?/g
const SUM_PATTERN = /^(\S+) \+ (\d+)$/

// Replaces the position placeholder in a line of generated code, folding
// the constant offsets so `e0 + 1 + 1` is emitted as `e0 + 2`.
function substitutePosition (line, position) {
  return line.replace(POSITION_PATTERN, (match, offset) => {
    if (offset === undefined) return position
    const sum = SUM_PATTERN.exec(position)
    if (sum !== null) return `${sum[1]} + ${Number(sum[2]) + Number(offset)}`
    if (/^\d+$/.test(position)) return String(Number(position) + Number(offset))
    return `${position} + ${offset}`
  })
}

// Compiles a method tree into JavaScript functions.
//
// The interpreter in Router#find walks the radix tree node by node: every
// step loads the node, dispatches on its kind, calls into the node to pick
// the next child and pushes the skipped siblings on a backtracking stack.
// The compiler visits the tree once at build time and emits straight-line
// code instead: static prefixes become charCodeAt comparisons against
// literal char codes at literal offsets, children become nested if/switch
// blocks, and backtracking is the plain fall-through from a failed block to
// the next alternative. Parameter values live in fixed locals because the
// number of parameters collected on the way to any node is known at compile
// time. Handler storages and regexes are captured as closure constants.
//
// Two matchers are generated from the same tree:
//
// - The "sanitized" matcher takes the decoded path without its querystring,
//   exactly like the tree walk in Router#find, and implements the same
//   matching order and semantics: static child first, then parametric
//   children in their sorted order, then the wildcard, with backtracking to
//   the next alternative whenever a deeper match fails.
//
// - The "raw" matcher runs directly on the request URL and so skips the
//   sanitizing pre-scan. Its leaf checks accept a `?` or `#` where the
//   sanitized matcher expects the end of the path, and its parameter scans
//   stop at those delimiters too. Whenever a `%` turns up where it could
//   change the outcome (inside a parameter, or anywhere in a URL that did
//   not match) it gives up and defers to the sanitized matcher, which is
//   authoritative. The raw matcher is only generated when the router options
//   and the registered routes keep the raw URL and the sanitized path
//   char-for-char identical up to the first delimiter.
class TreeCompiler {
  constructor (router, raw) {
    this.router = router
    this.raw = raw
    this.constNames = []
    this.constValues = []
    this.functions = []
    this.lines = []
    this.indent = 1
    this.maxParams = 0
    this.uid = 0
    this.tracksMaxParamLength = router.onMaxParamLength !== null
    this.useSemicolonDelimiter = router.useSemicolonDelimiter
    this.routerConst = this.addConst(router, 'router')
  }

  addConst (value, hint) {
    const name = `${hint}_${this.constNames.length}`
    this.constNames.push(name)
    this.constValues.push(value)
    return name
  }

  emit (line) {
    this.lines.push('  '.repeat(this.indent) + line)
  }

  compile (root, slow) {
    if (this.raw) this.indent = 2

    // The root prefix is never compared against the path, just skipped,
    // mirroring `pathIndex = currentNode.prefix.length` in Router#find.
    this.emitNodeBody(root, null, root.prefix.length, 0)

    if (this.raw) {
      if (this.tracksMaxParamLength) {
        this.emit('if (maxParamLengthExceeded) break raw')
      }
      // A failed match may be due to a percent-encoded char in a static part
      // of the URL, which only the sanitized matcher can resolve.
      this.emit("if (path.indexOf('%', 1) === -1) return null")
    } else {
      if (this.tracksMaxParamLength) {
        this.emit(`if (maxParamLengthExceeded) return ${this.routerConst}._onMaxParamLength(originPath)`)
      }
      this.emit('return null')
    }

    const source = []
    for (const fn of this.functions) {
      source.push(`function ${fn.name} (${this.subtreeArguments(fn.paramsCount)}) {`)
      source.push(`  let ${this.paramLocals(fn.paramsCount)}`)
      if (this.raw) {
        source.push('  let c')
      } else if (this.tracksMaxParamLength) {
        source.push('  let maxParamLengthExceeded = false')
      }
      source.push(...fn.lines)
      if (this.tracksMaxParamLength && !this.raw) {
        source.push('  return maxParamLengthExceeded ? FLAG : null')
      } else {
        source.push('  return null')
      }
      source.push('}')
    }

    if (this.raw) {
      const delimiters = this.delimiterCharCodes()
      source.push(
        this.scanFunction('scanSegment', [47].concat(delimiters), false),
        this.scanFunction('scanRest', delimiters, true),
        'return function compiledFind (path, derivedConstraints) {',
        '  raw: {',
        '    if (path.charCodeAt(0) !== 47) break raw',
        '    const pathLen = path.length',
        '    let c',
        `    let ${this.paramLocals(0)}`
      )
      if (this.tracksMaxParamLength) {
        source.push('    let maxParamLengthExceeded = false')
      }
      source.push(...this.lines.map(line => line.replaceAll(RETRY_PLACEHOLDER, 'break raw')), '  }', '  return slow(path, derivedConstraints)', '}')
    } else {
      source.push(
        'return function compiledFindSanitized (path, originPath, shouldDecodeParam, derivedConstraints, querystring) {',
        '  const pathLen = path.length',
        `  let ${this.paramLocals(0)}`
      )
      if (this.tracksMaxParamLength) {
        source.push('  let maxParamLengthExceeded = false')
      }
      source.push(...this.lines, '}')
    }

    const code = source.join('\n')
    const factory = new Function('NullObject', 'decodeParam', 'slow', 'FLAG', ...this.constNames, code) // eslint-disable-line no-new-func
    const fn = factory(NullObject, safeDecodeURIComponent, slow, FLAG, ...this.constValues)
    fn.source = code
    return fn
  }

  // Locals for the parameter values collected from slot `from` on. Four are
  // always declared so the per-handler params constructor can be called.
  paramLocals (from) {
    const locals = []
    for (let i = from; i < Math.max(this.maxParams, 4); i++) {
      locals.push(`p${i}`)
    }
    return locals.length === 0 ? 'unused' : locals.join(', ')
  }

  subtreeArguments (paramsCount) {
    const args = this.raw
      ? ['path', 'pathLen', 'i', 'derivedConstraints']
      : ['path', 'originPath', 'pathLen', 'shouldDecodeParam', 'derivedConstraints', 'querystring', 'i']
    for (let i = 0; i < paramsCount; i++) args.push(`p${i}`)
    return args.join(', ')
  }

  delimiterCharCodes () {
    const delimiters = [63, 35] // '?' and '#'
    if (this.useSemicolonDelimiter) delimiters.push(59)
    return delimiters
  }

  // Emits a scanner returning the index of the first char among `stops` (or
  // the end of the path), or -1 as soon as a '%' is seen: the slice before a
  // '%' may decode differently and must go through the sanitized matcher.
  // A char loop is cheapest for the short segments that make up most paths,
  // a native regex search wins on long ones, so the scanner starts with a
  // bounded loop and hands anything longer over to the regex. A wildcard
  // consumes the rest of the path, so its scanner knows the length up front
  // and can pick the strategy before looping.
  scanFunction (name, stops, knowsLength) {
    const checks = stops.concat(37).map(code => `c === ${code}`).join(' || ')
    const charClass = stops.concat(37).map(code => '\\x' + code.toString(16).padStart(2, '0')).join('')
    const lines = [
      // A global regex with lastIndex finds the first stop char in one
      // native call, without allocating a match result.
      `const ${name}Regex = /[${charClass}]/g`,
      `function ${name}Long (path, i, len) {`,
      `  ${name}Regex.lastIndex = i`,
      `  if (!${name}Regex.test(path)) return len`,
      `  i = ${name}Regex.lastIndex - 1`,
      '  return path.charCodeAt(i) === 37 ? -1 : i',
      '}',
      `function ${name} (path, i, len) {`
    ]
    if (knowsLength) {
      lines.push(`  if (len - i > ${SCAN_LOOP_MAX_LENGTH}) return ${name}Long(path, i, len)`)
      lines.push('  for (; i < len; i++) {')
    } else {
      lines.push(`  const limit = len - i > ${SCAN_LOOP_MAX_LENGTH} ? i + ${SCAN_LOOP_MAX_LENGTH} : len`)
      lines.push('  for (; i < limit; i++) {')
    }
    lines.push(
      '    const c = path.charCodeAt(i)',
      `    if (${checks}) return c === 37 ? -1 : i`,
      '  }'
    )
    if (knowsLength) {
      lines.push('  return len')
    } else {
      lines.push(`  return i === len ? len : ${name}Long(path, i, len)`)
    }
    lines.push('}')
    return lines.join('\n')
  }

  // Position of `offset` chars past `base`, where base is null for the
  // constant position after the root (no parameter consumed yet) or the
  // name of a local holding the end of the last consumed parameter.
  position (base, offset) {
    if (base === null) return String(offset)
    if (offset === 0) return base
    return `${base} + ${offset}`
  }

  // Statement handing the lookup over to the sanitized matcher (raw mode):
  // a jump out of the raw block, or a FLAG return from a subtree function.
  retry () {
    return RETRY_PLACEHOLDER
  }

  // Condition for the path to end at `pos`. The raw matcher also accepts a
  // query delimiter there, since the sanitized path stops at it.
  endCondition (pos) {
    if (!this.raw) return `pathLen === ${pos}`
    const delimiters = this.delimiterCharCodes()
    const checks = [`pathLen === ${pos}`, `(c = path.charCodeAt(${pos})) === ${delimiters[0]}`]
    for (let i = 1; i < delimiters.length; i++) checks.push(`c === ${delimiters[i]}`)
    return checks.join(' || ')
  }

  querystringExpression (pos) {
    if (!this.raw) return 'querystring'
    return `pathLen === ${pos} ? '' : path.slice(${pos} + 1)`
  }

  // Emits the code run once a node's prefix has matched and the path
  // position is at `offset` past `base`: the leaf check, then the children.
  emitNodeBody (node, base, offset, paramsCount) {
    if (node.isLeafNode) {
      const pos = this.position(base, offset)
      if (node.kind === NODE_TYPES.WILDCARD && !this.raw) {
        // A wildcard always consumes the rest of the path.
        this.emitLeaf(node, paramsCount, pos)
      } else {
        this.emit(`if (${this.endCondition(pos)}) {`)
        this.indent++
        this.emitLeaf(node, paramsCount, pos)
        this.indent--
        this.emit('}')
      }
    }

    this.emitStaticChildren(node, base, offset, paramsCount)
    this.emitParametricChildren(node, base, offset, paramsCount)
    this.emitWildcardChild(node, base, offset, paramsCount)
  }

  // Like emitNodeBody, but a body too large to stay in the current function
  // is moved to a function of its own and replaced by a call. The body is
  // generated once against a position placeholder, which is then replaced
  // by the real position expression or by the function's own argument.
  emitSubtree (node, base, offset, paramsCount) {
    const outerLines = this.lines
    const outerIndent = this.indent
    this.lines = []
    this.indent = 0
    this.emitNodeBody(node, POSITION_PLACEHOLDER, 0, paramsCount)
    const bodyLines = this.lines
    this.lines = outerLines
    this.indent = outerIndent

    if (bodyLines.length <= SPLIT_LINES && this.lines.length + bodyLines.length <= FUNCTION_LINES) {
      // Inline: the retry placeholder is left for the enclosing context.
      const position = this.position(base, offset)
      const prefix = '  '.repeat(this.indent)
      for (const line of bodyLines) {
        this.lines.push(prefix + substitutePosition(line, position))
      }
      return
    }

    const name = `subtree_${this.functions.length}`
    this.functions.push({
      name,
      paramsCount,
      lines: bodyLines.map(line => '  ' + substitutePosition(line, 'i').replaceAll(RETRY_PLACEHOLDER, 'return FLAG'))
    })

    const args = this.raw
      ? ['path', 'pathLen', this.position(base, offset), 'derivedConstraints']
      : ['path', 'originPath', 'pathLen', 'shouldDecodeParam', 'derivedConstraints', 'querystring', this.position(base, offset)]
    for (let i = 0; i < paramsCount; i++) args.push(`p${i}`)

    const result = `r${this.uid++}`
    this.emit(`const ${result} = ${name}(${args.join(', ')})`)
    this.emit(`if (${result} !== null) {`)
    this.emit(`  if (${result} !== FLAG) return ${result}`)
    if (this.raw) {
      this.emit(`  ${this.retry()}`)
    } else if (this.tracksMaxParamLength) {
      this.emit('  maxParamLengthExceeded = true')
    }
    this.emit('}')
  }

  emitLeaf (node, paramsCount, pos) {
    const storage = node.handlerStorage
    const storageConst = this.addConst(storage, 'handlers')
    const handle = `h${this.uid++}`

    this.emit(`const ${handle} = ${storageConst}.getMatchingHandler(derivedConstraints)`)
    this.emit(`if (${handle} !== null) {`)
    this.indent++

    let paramsExpr
    if (storage.handlers.length === 1) {
      // A single handler: build its params object inline with literal keys.
      const params = storage.handlers[0].params
      this.maxParams = Math.max(this.maxParams, paramsCount, params.length)
      const paramsObject = `o${this.uid++}`
      this.emit(`const ${paramsObject} = new NullObject()`)
      for (let i = 0; i < params.length; i++) {
        this.emit(`${paramsObject}[${JSON.stringify(params[i])}] = p${i}`)
      }
      paramsExpr = paramsObject
    } else {
      // Several constrained handlers may have different param names: defer
      // to the per-handler params constructor, which takes the first four
      // values positionally and the rest in an array.
      this.maxParams = Math.max(this.maxParams, paramsCount)
      const extra = []
      for (let i = 4; i < paramsCount; i++) extra.push(`p${i}`)
      const extraExpr = extra.length === 0 ? 'null' : `[${extra.join(', ')}]`
      paramsExpr = `${handle}._createParamsObject(p0, p1, p2, p3, ${extraExpr})`
    }

    this.emit('return {')
    this.emit(`  handler: ${handle}.handler,`)
    this.emit(`  store: ${handle}.store,`)
    this.emit(`  params: ${paramsExpr},`)
    this.emit(`  searchParams: ${this.routerConst}.querystringParser(${this.querystringExpression(pos)})`)
    this.emit('}')

    this.indent--
    this.emit('}')
  }

  // Condition matching a static child's prefix at the given position. The
  // first char can be skipped when a surrounding switch already checked it.
  prefixCondition (child, base, offset, skipFirstChar) {
    const prefix = child.prefix
    if (prefix.length >= LONG_PREFIX_MIN_LENGTH) {
      const pos = this.position(base, offset)
      return `path.indexOf(${JSON.stringify(prefix)}, ${pos}) === ${pos}`
    }
    const checks = []
    for (let i = skipFirstChar ? 1 : 0; i < prefix.length; i++) {
      checks.push(`path.charCodeAt(${this.position(base, offset + i)}) === ${prefix.charCodeAt(i)}`)
    }
    return checks.length === 0 ? null : checks.join(' && ')
  }

  emitStaticChildren (node, base, offset, paramsCount) {
    const children = node.staticChildrenNodes
    if (children.length === 0) return

    if (children.length === 1) {
      const child = children[0]
      this.emit(`if (${this.prefixCondition(child, base, offset, false)}) {`)
      this.indent++
      this.emitSubtree(child, base, offset + child.prefix.length, paramsCount)
      this.indent--
      this.emit('}')
      return
    }

    this.emit(`switch (path.charCodeAt(${this.position(base, offset)})) {`)
    this.indent++
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      this.emit(`case ${node.staticChildrenCharCodes[i]}: {`)
      this.indent++
      const condition = this.prefixCondition(child, base, offset, true)
      if (condition !== null) {
        this.emit(`if (${condition}) {`)
        this.indent++
      }
      this.emitSubtree(child, base, offset + child.prefix.length, paramsCount)
      if (condition !== null) {
        this.indent--
        this.emit('}')
      }
      this.emit('break')
      this.indent--
      this.emit('}')
    }
    this.indent--
    this.emit('}')
  }

  emitParametricChildren (node, base, offset, paramsCount) {
    const children = node.parametricChildren
    if (children.length === 0) return

    const pos = this.position(base, offset)
    const id = this.uid++
    const end = `e${id}`
    const value = `v${id}`

    // Every parametric sibling consumes the same slice of the path, up to
    // the next slash, so it is extracted once for all of them.
    if (this.raw) {
      this.emit(`const ${end} = scanSegment(path, ${pos}, pathLen)`)
      this.emit(`if (${end} === -1) ${this.retry()}`)
      this.emit(`const ${value} = path.slice(${pos}, ${end})`)
    } else {
      this.emit(`let ${end} = originPath.indexOf('/', ${pos})`)
      this.emit(`if (${end} === -1) ${end} = pathLen`)
      this.emit(`let ${value} = originPath.slice(${pos}, ${end})`)
      this.emit(`if (shouldDecodeParam) ${value} = decodeParam(${value})`)
    }

    for (const child of children) {
      if (child.isRegex) {
        this.emitRegexChild(child, end, value, paramsCount)
      } else {
        this.emit(`if (${value}.length <= ${this.routerConst}.maxParamLength) {`)
        this.indent++
        this.emit(`p${paramsCount} = ${value}`)
        this.emitSubtree(child, end, 0, paramsCount + 1)
        this.indent--
        if (this.tracksMaxParamLength) {
          this.emit('} else {')
          this.emit('  maxParamLengthExceeded = true')
        }
        this.emit('}')
      }
    }
  }

  emitRegexChild (child, end, value, paramsCount) {
    const regexConst = this.addConst(child.regex, 'regex')
    const groupCount = countCaptureGroups(child.regex)
    const match = `m${this.uid++}`

    this.emit(`const ${match} = ${regexConst}.exec(${value})`)
    this.emit(`if (${match} !== null) {`)
    this.indent++

    const groups = []
    for (let i = 1; i <= groupCount; i++) {
      const group = `${match}g${i}`
      groups.push(group)
      this.emit(`const ${group} = ${match}[${i}] ?? ''`)
    }

    const tooLong = groups.map(group => `${group}.length > ${this.routerConst}.maxParamLength`).join(' || ')
    if (groups.length > 0) {
      this.emit(`if (${tooLong}) {`)
      if (this.tracksMaxParamLength) {
        this.emit('  maxParamLengthExceeded = true')
      }
      this.emit('} else {')
      this.indent++
    }
    for (let i = 0; i < groups.length; i++) {
      this.emit(`p${paramsCount + i} = ${groups[i]}`)
    }
    this.emitSubtree(child, end, 0, paramsCount + groups.length)
    if (groups.length > 0) {
      this.indent--
      this.emit('}')
    }

    this.indent--
    this.emit('}')
  }

  emitWildcardChild (node, base, offset, paramsCount) {
    const child = node.wildcardChild
    if (child === null) return

    const pos = this.position(base, offset)
    const id = this.uid++
    const value = `w${id}`
    this.emit('{')
    this.indent++
    if (this.raw) {
      const end = `e${id}`
      this.emit(`const ${end} = scanRest(path, ${pos}, pathLen)`)
      this.emit(`if (${end} === -1) ${this.retry()}`)
      this.emit(`const ${value} = path.slice(${pos}, ${end})`)
      this.emit(`p${paramsCount} = ${value}`)
      this.emitNodeBody(child, end, 0, paramsCount + 1)
    } else {
      this.emit(`let ${value} = originPath.slice(${pos})`)
      this.emit(`if (shouldDecodeParam) ${value} = decodeParam(${value})`)
      this.emit(`p${paramsCount} = ${value}`)
      this.emitNodeBody(child, 'pathLen', 0, paramsCount + 1)
    }
    this.indent--
    this.emit('}')
  }
}

function countCaptureGroups (regex) {
  return new RegExp(regex.source + '|').exec('').length - 1
}

// The raw matcher relies on the raw URL and the sanitized path being
// identical up to the first delimiter, which the router options and the
// static parts of the routes must allow.
function supportsRawMatching (router, root) {
  if (router.ignoreTrailingSlash || router.ignoreDuplicateSlashes || router.caseSensitive === false) {
    return false
  }
  const forbidden = router.useSemicolonDelimiter ? /[%?#;]/ : /[%?#]/
  const stack = [root]
  while (stack.length > 0) {
    const node = stack.pop()
    if (forbidden.test(node.prefix)) return false
    stack.push(...node.staticChildrenNodes, ...node.parametricChildren)
    if (node.wildcardChild !== null) stack.push(node.wildcardChild)
  }
  return true
}

// Returns the compiled find(path, derivedConstraints) for a method tree.
function compileTree (router, root) {
  const sanitized = new TreeCompiler(router, false).compile(root, null)
  const slow = function findSanitized (path, derivedConstraints) {
    return router._findSanitized(sanitized, path, derivedConstraints)
  }
  if (!supportsRawMatching(router, root)) {
    return slow
  }
  return new TreeCompiler(router, true).compile(root, slow)
}

module.exports = { compileTree }
