'use strict'
const assert = require('assert')

function HostStorage () {
  var hosts = {}
  var regexHosts = []
  return {
    get: (host) => {
      var exact = hosts[host]
      if (exact) {
        return exact
      }
      var item
      for (var i = 0; i < regexHosts.length; i++) {
        item = regexHosts[i]
        if (item.host.test(host)) {
          return item.value
        }
      }
    },
    set: (host, value) => {
      if (host instanceof RegExp) {
        regexHosts.push({ host, value })
      } else {
        hosts[host] = value
      }
    },
    del: (host) => {
      delete hosts[host]
      regexHosts = regexHosts.filter((obj) => String(obj.host) !== String(host))
    },
    empty: () => {
      hosts = {}
      regexHosts = []
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
