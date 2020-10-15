'use strict'

function HostStore() {
  var hosts = {}
  var regexHosts = []
  return {
    get: (host) => {
      var exact = hosts[host]
      if (exact) {
        return exact
      }
      var item
      for (let i = 0; i < regexHosts.length; i++) {
        item = regexHosts[i]
        if (item.host.match(host)) {
          return item.store
        }
      }
    },
    set: (host, store) => {
      if (typeof host === RegExp) {
        regexHosts.push({ host, store })
      } else {
        hosts[host] = store
      }
    },
    del: (host) => { delete hosts[host] },
    empty: () => { hosts = {} }
  }
}

module.exports = {
  name: 'host',
  storage: HostStore,
}