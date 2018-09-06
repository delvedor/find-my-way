const gentree = require('generate-radix-tree')
const genfun = require('generate-function')

module.exports = genrouter

function genrouter (routes) {
  const group = {}
  const cache = {}

  for (var i = 0; i < routes.length; i++) {
    const m = routes[i].method
    const g = group[m] = group[m] || { match: m, routes: [] }
    g.routes.push({
      match: compile(routes[i].path),
      handler: routes[i].handler,
      store: routes[i].store
    })
  }

  const input = Object.keys(group).map(key => group[key])
  const gen = genfun()

  gen('function route (method, path) {')

  gentree(input, {
    name: 'method',
    gen,
    onvalue (gen, method) {
      gentree(method.routes, {
        name: 'path',
        gen,
        onvalue (gen, route) {
          const idx = gen.sym(method.match) + method.routes.indexOf(route)
          gen.scope[idx] = route
          if (typeof route.match === 'string') {
            gen(`return {
              handler: ${idx}.handler,
              store: ${idx}.store,
              params: {}
            }`)
          } else {
            gen(`return {
              handler: ${idx}.handler,
              store: ${idx}.store,
              params: {
            `)
            const params = route.match.filter(m => typeof m === 'function')
            for (var i = 0; i < params.length; i++) {
              const n = name(params[i])
              const sep = i < params.length - 1 ? ',' : ''
              gen(`${gen.property(params[i].sym)}: ${n}.value${sep}`)
            }
            gen('}')
            gen('}')
          }
        }
      })
    }
  })

  gen('return null')
  gen('}')

  return gen.toFunction()

  function name (fun) {
    for (const key of Object.keys(gen.scope)) {
      if (gen.scope[key] === fun) return key
    }
    return null
  }

  function compileFunction (pattern, i, all) {
    const next = (i < all.length - 1 && !/^[:*]/.test(all[i + 1]))
      ? all[i + 1][0]
      : ''

    const id = next + '@' + pattern

    if (cache[id]) return cache[id]

    if (pattern[0] === ':') {
      const regex = pattern.indexOf('(')
      const gen = genfun()
      gen.scope.duc = require('fast-decode-uri-component')
      gen('function match (s, ptr) {')
      if (regex > -1) {
        gen(`
          const m = s.slice(ptr).match(/^${pattern.slice(regex + 1, -1)}/g)
          if (!m) return false
          if ((match.value = duc(m[0])) === null) return false
          match.pointer = ptr + match.value.length
          return true
        `)
      } else if (next) {
        gen(`
          const i = s.indexOf(${JSON.stringify(next)}, ptr)
          if (i === -1) return false
          if ((match.value = duc(s.slice(ptr, i))) === null) return false
        `)
        if (next !== '/') {
          gen('if (match.value.indexOf("/") > -1) return false')
        }
        gen(`
          match.pointer = i
          return true
        `)
      } else {
        gen(`
          const i = s.indexOf("/", ptr)
          if (i > -1) return false
          if ((match.value = duc(s.slice(ptr))) === null) return false
          match.pointer = s.length
          return true
        `)
      }
      const fn = cache[id] = gen('}').toFunction()
      fn.pointer = 0
      fn.value = ''
      fn.sym = pattern.slice(1, regex === -1 ? pattern.length : regex)
      return fn
    }

    if (pattern[0] === '*') {
      const gen = genfun()
      gen.scope.duc = require('fast-decode-uri-component')
      gen('function wildcard (s, ptr) {')
      if (next) {
        gen(`
          const i = s.indexOf(${JSON.stringify(next)}, ptr)
          if (i === -1) return false
          if ((wildcard.value = duc(s.slice(ptr, i))) === null) return false
          wildcard.pointer = i
          return true
        `)
      } else {
        gen(`
          if ((wildcard.value = duc(s.slice(ptr))) === null) return false
          wildcard.pointer = s.length
          return true
        `)
      }
      const fn = cache[id] = gen('}').toFunction()
      fn.pointer = 0
      fn.value = ''
      fn.sym = '*'
      return fn
    }

    return pattern
  }

  function compile (pattern) {
    const res = []
    var offset = 0
    for (var i = 0; i < pattern.length; i++) {
      if (pattern[i] === '*') {
        res.push(pattern.slice(offset, i))
        res.push('*')
        offset = i + 1
        continue
      }
      if (pattern[i] === ':') {
        var inc = 0
        res.push(pattern.slice(offset, i))
        offset = i++
        for (; i < pattern.length; i++) {
          if (pattern[i] === '(') inc++
          else if (inc && pattern[i] === ')') inc--
          else if (!inc && (!/[$_a-z0-9]/i.test(pattern[i]) || pattern[i - 1] === ')')) break
        }
        if (inc) throw new Error('Invalid regexp expression in "' + pattern + '"')
        res.push(pattern.slice(offset, i))
        offset = i
        continue
      }
    }

    if (!res.length) return pattern
    if (offset < pattern.length) res.push(pattern.slice(offset))
    return res.map(compileFunction)
  }
}
