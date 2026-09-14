'use strict'
const assert = require('node:assert')

const REGEX_CACHE_MAX_SIZE = 1000
const REGEX_CACHE_EVICTION_SIZE = REGEX_CACHE_MAX_SIZE / 2

function HostStorage () {
  const hosts = new Map()
  const regexHosts = []
  const regexCache = new Map()

  function cacheRegexResult (host, value) {
    if (regexCache.size >= REGEX_CACHE_MAX_SIZE) {
      const keys = regexCache.keys()
      for (let i = 0; i < REGEX_CACHE_EVICTION_SIZE; i++) {
        regexCache.delete(keys.next().value)
      }
    }
    regexCache.set(host, value)
  }
  return {
    get: (host) => {
      const exact = hosts.get(host)
      if (exact) {
        return exact
      }
      if (regexHosts.length === 0) return undefined
      if (regexCache.has(host)) return regexCache.get(host)
      for (const regex of regexHosts) {
        if (regex.host.test(host)) {
          cacheRegexResult(host, regex.value)
          return regex.value
        }
      }
      cacheRegexResult(host, undefined)
    },
    set: (host, value) => {
      if (host instanceof RegExp) {
        const safeRegex = new RegExp(host.source, host.flags.replace(/[gy]/g, ''))
        regexHosts.push({ host: safeRegex, value })
        regexCache.clear()
      } else {
        hosts.set(host, value)
      }
    }
  }
}

module.exports = {
  name: 'host',
  mustMatchWhenDerived: false,
  storage: HostStorage,
  validate (value) {
    assert(typeof value === 'string' || Object.prototype.toString.call(value) === '[object RegExp]', 'Host should be a string or a RegExp')
  }
}
