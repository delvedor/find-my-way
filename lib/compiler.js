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

// Returned by a subtree function when nothing matched. A route handler called
// from a compiled lookup may itself return null, so null cannot mean that.
const NO_MATCH = Symbol('find-my-way.compiled.no-match')

// Stand for the path position and for the "retry through the sanitized
// matcher" statement in the code of a subtree until it is known whether that
// code is emitted inline or as a function of its own. They are framed by a
// control char, which can never appear literally in the generated code: the
// only user-provided text in it (route prefixes) goes through
// JSON.stringify, which escapes control chars.
const POSITION_PLACEHOLDER = '\u0001POS\u0001'
const RETRY_PLACEHOLDER = '\u0001RETRY\u0001'
const POSITION_PATTERN = new RegExp(`${POSITION_PLACEHOLDER}(?: \\+ (\\d+))?`, 'g')
const SUM_PATTERN = /^(\S+) \+ (\d+)$/

// Chars that decodeURI leaves percent-encoded, as the sanitized path does,
// and a table of their char codes that also includes '%', which
// safeDecodeURI keeps encoded as well.
const RESERVED_CHARS = ';/?:@&=+$,#'
const KEPT_ENCODED = new Uint8Array(128)
for (const char of RESERVED_CHARS + '%') {
  KEPT_ENCODED[char.charCodeAt(0)] = 1
}

// Value of a hex digit char code, or -1 for any other char code, including
// the NaN read past the end of the path.
function hexValue (code) {
  if (code >= 48 && code <= 57) return code - 48
  code |= 32 // to lower case
  return code >= 97 && code <= 102 ? code - 87 : -1
}

// Decodes the UTF-8 sequence of escapes starting at `i`, whose first byte
// `lead` is not ASCII. Returns its code point, which tells how many escapes
// it spans (see escapedLength), or -1 where decodeURIComponent would throw:
// a missing or malformed continuation byte, an overlong encoding, a
// surrogate or a code point past U+10FFFF.
function decodeUtf8 (url, i, lead) {
  let count, codePoint, min
  if (lead >= 0xc0 && lead <= 0xdf) {
    count = 1
    codePoint = lead & 0x1f
    min = 0x80
  } else if (lead >= 0xe0 && lead <= 0xef) {
    count = 2
    codePoint = lead & 0x0f
    min = 0x800
  } else if (lead >= 0xf0 && lead <= 0xf7) {
    count = 3
    codePoint = lead & 0x07
    min = 0x10000
  } else {
    return -1
  }
  for (let k = 1; k <= count; k++) {
    const j = i + 3 * k
    if (url.charCodeAt(j) !== 37) return -1
    const high = hexValue(url.charCodeAt(j + 1))
    const low = hexValue(url.charCodeAt(j + 2))
    // A continuation byte is 10xxxxxx: its high hex digit is 8 to b.
    if (high < 8 || high > 11 || low === -1) return -1
    codePoint = (codePoint << 6) | ((high & 3) << 4) | low
  }
  if (codePoint < min || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
    return -1
  }
  return codePoint
}

// Length of the escapes that encode a non-ASCII code point.
function escapedLength (codePoint) {
  return codePoint < 0x800 ? 6 : codePoint < 0x10000 ? 9 : 12
}

// Splits and decodes a URL starting with '/' exactly like safeDecodeURI:
// the escapes of the chars that decodeURI keeps encoded stay as they are,
// the others are decoded. Doing it here spares the call to decodeURI, by
// far the most expensive part of sanitizing a URL with escapes. Returns
// null when an escape is malformed, for safeDecodeURI to report.
function sanitizeRawUrl (url, useSemicolonDelimiter) {
  let path = ''
  let last = 0
  let shouldDecodeParam = false
  let i = 1
  for (; i < url.length; i++) {
    const code = url.charCodeAt(i)
    if (code === 37) {
      const high = hexValue(url.charCodeAt(i + 1))
      const low = hexValue(url.charCodeAt(i + 2))
      if (high === -1 || low === -1) return null
      const byte = (high << 4) | low
      if (byte > 127) {
        const codePoint = decodeUtf8(url, i, byte)
        if (codePoint === -1) return null
        path += url.slice(last, i) + String.fromCodePoint(codePoint)
        last = i + escapedLength(codePoint)
        i = last - 1
      } else if (KEPT_ENCODED[byte] === 1) {
        shouldDecodeParam = true
        i += 2
      } else {
        path += url.slice(last, i) + String.fromCharCode(byte)
        last = i + 3
        i += 2
      }
    } else if (code === 63 || code === 35 || (code === 59 && useSemicolonDelimiter)) {
      break
    }
  }
  return {
    path: path + url.slice(last, i),
    querystring: i < url.length ? url.slice(i + 1) : '',
    shouldDecodeParam
  }
}

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
//   stop at those delimiters too. Escapes are decoded in place, in
//   parameters, or checked, in a URL that did not match, as long as they
//   cannot change which route matches (see decodeFunction). Otherwise, when
//   an escape is malformed or decodes to a char of a static part, it gives
//   up and defers to the sanitized matcher, which is authoritative. The raw matcher is only generated when the router options
//   and the registered routes keep the raw URL and the sanitized path
//   char-for-char identical up to the first delimiter.
//
// The raw matcher comes in two targets: `find` returns the usual
// { handler, store, params, searchParams } object, `lookup` calls the route
// handler straight from the matched leaf, as Router#lookup would, without
// allocating that object first.
class TreeCompiler {
  constructor (router, raw, target = 'find') {
    this.router = router
    this.raw = raw
    this.lookup = target === 'lookup'
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
    this.emitNodeBody(root, null, root.prefix.length, 0, root.prefix)

    if (this.raw) {
      if (this.tracksMaxParamLength) {
        this.emit('if (maxParamLengthExceeded) break raw')
      }
      // A failed match may be due to a percent-encoded char in a static part
      // of the URL, which only the sanitized matcher can resolve.
      this.emit(`if (!needsSanitizedPath(path, pathLen)) return ${this.lookup ? `${this.routerConst}._defaultRoute(req, res, ctx)` : 'null'}`)
    } else {
      if (this.tracksMaxParamLength) {
        this.emit(`if (maxParamLengthExceeded) return ${this.routerConst}._onMaxParamLength(originPath)`)
      }
      this.emit('return null')
    }

    // Strict mode, so that a slip like assigning an undeclared local in the
    // generated code throws instead of creating a global.
    const source = ["'use strict'"]
    for (const fn of this.functions) {
      source.push(`function ${fn.name} (${this.subtreeArguments(fn.paramsCount, 'i')}) {`)
      source.push(`  let ${this.paramLocals(fn.paramsCount)}`)
      if (this.raw) {
        source.push('  let c')
      }
      if (this.tracksMaxParamLength) {
        source.push('  let maxParamLengthExceeded = false')
      }
      source.push(...fn.lines)
      if (this.tracksMaxParamLength) {
        // In raw mode a FLAG makes the caller retry through the sanitized
        // matcher, which reports the exceeded parameter length.
        source.push('  return maxParamLengthExceeded ? FLAG : NO_MATCH')
      } else {
        source.push('  return NO_MATCH')
      }
      source.push('}')
    }

    if (this.raw) {
      const delimiters = this.delimiterCharCodes()
      const staticChars = staticCharCodes(root)
      const asciiConst = this.addConst(staticChars.ascii, 'staticChars')
      const nonAsciiConst = staticChars.nonAscii === null ? null : this.addConst(staticChars.nonAscii, 'staticNonAscii')
      source.push(
        // Set by the decoders to the end of the value they decoded.
        'let decodedEnd = 0',
        this.scanFunction('scanSegment', [47].concat(delimiters), false),
        this.scanFunction('scanRest', delimiters, true),
        this.decodeFunction('decodeSegment', [47].concat(delimiters), asciiConst, nonAsciiConst),
        this.decodeFunction('decodeRest', delimiters, asciiConst, nonAsciiConst),
        // Whether a URL that did not match could match the sanitized path,
        // or be reported by onBadUrl: only when an escape in its path is
        // malformed or decodes to a char of a static part, which decodeRest
        // detects as it does in parameters (see decodeFunction). Escapes in
        // the querystring never matter. Kept out of line, as it only runs
        // for URLs that did not match.
        'function needsSanitizedPath (path, len) {',
        "  if (path.indexOf('%', 1) === -1) return false",
        '  const end = scanRest(path, 1, len)',
        '  return end < 0 && decodeRest(path, 1, ~end, len) === null',
        '}',
        this.lookup
          ? 'return function compiledLookup (path, derivedConstraints, req, res, ctx) {'
          : 'return function compiledFind (path, derivedConstraints) {',
        '  raw: {',
        '    if (path.charCodeAt(0) !== 47) break raw',
        '    const pathLen = path.length',
        '    let c',
        `    let ${this.paramLocals(0)}`
      )
      if (this.tracksMaxParamLength) {
        source.push('    let maxParamLengthExceeded = false')
      }
      source.push(
        ...this.lines.map(line => line.replaceAll(RETRY_PLACEHOLDER, 'break raw')),
        '  }',
        this.lookup
          ? `  return ${this.routerConst}.callHandler(slow(path, derivedConstraints), req, res, ctx)`
          : '  return slow(path, derivedConstraints)',
        '}'
      )
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
    const factory = new Function('NullObject', 'decodeParam', 'hexValue', 'decodeUtf8', 'escapedLength', 'slow', 'FLAG', 'NO_MATCH', ...this.constNames, code) // eslint-disable-line no-new-func
    const fn = factory(NullObject, safeDecodeURIComponent, hexValue, decodeUtf8, escapedLength, slow, FLAG, NO_MATCH, ...this.constValues)
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

  // Arguments of a subtree function; `position` is what the caller passes
  // for the path position argument `i`.
  subtreeArguments (paramsCount, position) {
    const args = this.raw
      ? ['path', 'pathLen', position, 'derivedConstraints']
      : ['path', 'originPath', 'pathLen', 'shouldDecodeParam', 'derivedConstraints', 'querystring', position]
    if (this.lookup) args.push('req', 'res', 'ctx')
    for (let i = 0; i < paramsCount; i++) args.push(`p${i}`)
    return args.join(', ')
  }

  delimiterCharCodes () {
    const delimiters = [63, 35] // '?' and '#'
    if (this.useSemicolonDelimiter) delimiters.push(59)
    return delimiters
  }

  // Emits a scanner returning the index of the first char among `stops` (or
  // the end of the path), or, as soon as a '%' is seen, the bitwise NOT of
  // its index (always negative), from which the matching decoder carries on.
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
      '  return path.charCodeAt(i) === 37 ? ~i : i',
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
      `    if (${checks}) return c === 37 ? ~i : i`,
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

  // Emits a decoder for a parameter value from `start` whose scan stopped at
  // a '%' at index `i`. It carries on to the next char among `stops` (or the
  // end of the path), stores that index in decodedEnd and returns the value
  // decoded as decodeURIComponent would, which is what the sanitized matcher
  // ends up with, so the raw matcher does not have to start over.
  //
  // Decoding in place must not change which route matches. The sanitized
  // path keeps the chars decodeURI leaves encoded (RESERVED_CHARS and '%')
  // as escapes, which compare against static parts just like the raw ones.
  // Any other escaped char is decoded there, though, and could match a
  // static part that the raw URL failed to match, as `/users/m%65` matches
  // `/users/me`. So the decoder gives up, returning null to retry through the
  // sanitized matcher, when an escape decodes to a char used by a static
  // part of the tree, or when the value is malformed. As every escape of a
  // matched URL lies in some parameter, a match is then the same as the
  // sanitized matcher's.
  //
  // The non-ASCII chars used by static parts are checked by their first
  // UTF-16 unit, as the radix tree may split a static part between the two
  // halves of a surrogate pair.
  decodeFunction (name, stops, asciiConst, nonAsciiConst) {
    const checks = stops.map(code => `c === ${code}`).join(' || ')
    const lines = [
      `function ${name} (path, start, i, len) {`,
      "  let value = ''",
      '  let last = start',
      '  for (; i < len; i++) {',
      '    const c = path.charCodeAt(i)',
      '    if (c === 37) {',
      '      const high = hexValue(path.charCodeAt(i + 1))',
      '      const low = hexValue(path.charCodeAt(i + 2))',
      '      if (high === -1 || low === -1) return null',
      '      const byte = (high << 4) | low',
      '      if (byte > 127) {',
      '        const codePoint = decodeUtf8(path, i, byte)',
      '        if (codePoint === -1) return null'
    ]
    if (nonAsciiConst !== null) {
      lines.push(`        if (${nonAsciiConst}.has(codePoint > 0xffff ? 0xd7c0 + (codePoint >> 10) : codePoint)) return null`)
    }
    lines.push(
      '        value += path.slice(last, i) + String.fromCodePoint(codePoint)',
      '        last = i + escapedLength(codePoint)',
      '        i = last - 1',
      '      } else {',
      `        if (${asciiConst}[byte] === 1) return null`,
      '        value += path.slice(last, i) + String.fromCharCode(byte)',
      '        last = i + 3',
      '        i += 2',
      '      }',
      `    } else if (${checks}) {`,
      '      break',
      '    }',
      '  }',
      '  decodedEnd = i',
      '  return value + path.slice(last, i)',
      '}'
    )
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
  // `staticPath` is the full static path from the root to this node, or null
  // once a parameter has been consumed on the way.
  emitNodeBody (node, base, offset, paramsCount, staticPath) {
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

    this.emitStaticChildren(node, base, offset, paramsCount, staticPath)
    this.emitParametricChildren(node, base, offset, paramsCount)
    this.emitWildcardChild(node, base, offset, paramsCount)
  }

  // Like emitNodeBody, but a body too large to stay in the current function
  // is moved to a function of its own and replaced by a call. The body is
  // generated once against a position placeholder, which is then replaced
  // by the real position expression or by the function's own argument.
  emitSubtree (node, base, offset, paramsCount, staticPath) {
    const outerLines = this.lines
    const outerIndent = this.indent
    this.lines = []
    this.indent = 0
    this.emitNodeBody(node, POSITION_PLACEHOLDER, 0, paramsCount, staticPath)
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

    const result = `r${this.uid++}`
    this.emit(`const ${result} = ${name}(${this.subtreeArguments(paramsCount, this.position(base, offset))})`)
    this.emit(`if (${result} !== NO_MATCH) {`)
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

    const searchParams = `${this.routerConst}.querystringParser(${this.querystringExpression(pos)})`
    if (this.lookup) {
      // Call the route handler directly, as Router#callHandler would.
      this.emit(`const q${this.uid} = ${searchParams}`)
      this.emit('return ctx === undefined')
      this.emit(`  ? ${handle}.handler(req, res, ${paramsExpr}, ${handle}.store, q${this.uid})`)
      this.emit(`  : ${handle}.handler.call(ctx, req, res, ${paramsExpr}, ${handle}.store, q${this.uid})`)
      this.uid++
    } else {
      this.emit('return {')
      this.emit(`  handler: ${handle}.handler,`)
      this.emit(`  store: ${handle}.store,`)
      this.emit(`  params: ${paramsExpr},`)
      this.emit(`  searchParams: ${searchParams}`)
      this.emit('}')
    }

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

  emitStaticChildren (node, base, offset, paramsCount, staticPath) {
    const children = node.staticChildrenNodes
    if (children.length === 0) return

    if (children.length === 1) {
      this.emitStaticChild(children[0], base, offset, paramsCount, staticPath, false)
      return
    }

    this.emit(`switch (path.charCodeAt(${this.position(base, offset)})) {`)
    this.indent++
    for (let i = 0; i < children.length; i++) {
      this.emit(`case ${node.staticChildrenCharCodes[i]}: {`)
      this.indent++
      this.emitStaticChild(children[i], base, offset, paramsCount, staticPath, true)
      this.emit('break')
      this.indent--
      this.emit('}')
    }
    this.indent--
    this.emit('}')
  }

  emitStaticChild (child, base, offset, paramsCount, staticPath, skipFirstChar) {
    const childStaticPath = staticPath === null ? null : staticPath + child.prefix
    const condition = this.prefixCondition(child, base, offset, skipFirstChar)
    const end = offset + child.prefix.length

    // A static leaf without children on an all-static path is, in the common
    // case, the whole URL: one string comparison settles it. The prefix chain
    // is only needed when a querystring follows.
    const isWholePathLeaf = this.raw && childStaticPath !== null && child.isLeafNode &&
      child.staticChildrenNodes.length === 0 && child.parametricChildren.length === 0 && child.wildcardChild === null
    if (isWholePathLeaf) {
      const pos = this.position(base, end)
      const suffix = condition === null ? this.endCondition(pos) : `${condition} && (${this.endCondition(pos)})`
      this.emit(`if (path === ${JSON.stringify(childStaticPath)} || (${suffix})) {`)
      this.indent++
      this.emitLeaf(child, paramsCount, pos)
      this.indent--
      this.emit('}')
      return
    }

    if (condition !== null) {
      this.emit(`if (${condition}) {`)
      this.indent++
    }
    this.emitSubtree(child, base, end, paramsCount, childStaticPath)
    if (condition !== null) {
      this.indent--
      this.emit('}')
    }
  }

  // Emits the raw matcher's extraction of a parameter value from `pos` into
  // the locals `e${id}` (its end) and `value`, decoding it when the scan hits
  // a '%'. The end is a const read as an int32 from decodedEnd, which keeps
  // the common case without escapes as fast as a plain slice.
  emitRawValue (scan, decode, pos, id, value) {
    const scanned = `s${id}`
    this.emit(`const ${scanned} = ${scan}(path, ${pos}, pathLen)`)
    this.emit(`const ${value} = ${scanned} >= 0 ? path.slice(${pos}, ${scanned}) : ${decode}(path, ${pos}, ~${scanned}, pathLen)`)
    this.emit(`if (${value} === null) ${this.retry()}`)
    this.emit(`const e${id} = ${scanned} >= 0 ? ${scanned} : decodedEnd | 0`)
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
      this.emitRawValue('scanSegment', 'decodeSegment', pos, id, value)
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
        this.emitSubtree(child, end, 0, paramsCount + 1, null)
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
    this.emitSubtree(child, end, 0, paramsCount + groups.length, null)
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
      this.emitRawValue('scanRest', 'decodeRest', pos, id, value)
      this.emit(`p${paramsCount} = ${value}`)
      this.emitNodeBody(child, `e${id}`, 0, paramsCount + 1, null)
    } else {
      this.emit(`let ${value} = originPath.slice(${pos})`)
      this.emit(`if (shouldDecodeParam) ${value} = decodeParam(${value})`)
      this.emit(`p${paramsCount} = ${value}`)
      this.emitNodeBody(child, 'pathLen', 0, paramsCount + 1, null)
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

// The char codes used by the static parts of the routes, which an escape
// the raw matcher decodes in place must not decode to, but for the ones
// that stay encoded in the sanitized path: a table of the ASCII ones and a
// set of the others, or null when there are none.
function staticCharCodes (root) {
  const ascii = new Uint8Array(128)
  let nonAscii = null
  const stack = [root]
  while (stack.length > 0) {
    const node = stack.pop()
    for (let i = 0; i < node.prefix.length; i++) {
      const code = node.prefix.charCodeAt(i)
      if (code > 127) {
        if (nonAscii === null) nonAscii = new Set()
        nonAscii.add(code)
      } else if (KEPT_ENCODED[code] === 0) {
        ascii[code] = 1
      }
    }
    stack.push(...node.staticChildrenNodes, ...node.parametricChildren)
    if (node.wildcardChild !== null) stack.push(node.wildcardChild)
  }
  return { ascii, nonAscii }
}

// Returns the compiled find(path, derivedConstraints) and
// lookup(path, derivedConstraints, req, res, ctx) for a method tree.
function compileTree (router, root) {
  const sanitized = new TreeCompiler(router, false).compile(root, null)
  const slow = function findSanitized (path, derivedConstraints) {
    return router._findSanitized(sanitized, path, derivedConstraints)
  }
  if (!supportsRawMatching(router, root)) {
    return {
      find: slow,
      lookup: function lookupSanitized (path, derivedConstraints, req, res, ctx) {
        return router.callHandler(slow(path, derivedConstraints), req, res, ctx)
      }
    }
  }
  // The raw matcher defers to this when the URL needs the sanitized path.
  // Raw matching rules out the router options that _findSanitized handles
  // besides sanitizing, so a URL starting with '/' can go straight to the
  // sanitized matcher once sanitizeRawUrl has decoded it.
  const fallback = function findEncoded (path, derivedConstraints) {
    if (path.charCodeAt(0) === 47) {
      const url = sanitizeRawUrl(path, router.useSemicolonDelimiter)
      if (url !== null) {
        return sanitized(url.path, url.path, url.shouldDecodeParam, derivedConstraints, url.querystring)
      }
    }
    return slow(path, derivedConstraints)
  }
  return {
    find: new TreeCompiler(router, true, 'find').compile(root, fallback),
    lookup: new TreeCompiler(router, true, 'lookup').compile(root, fallback)
  }
}

module.exports = { compileTree, sanitizeRawUrl }
