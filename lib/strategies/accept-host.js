'use strict'

function HostStore() {
  let hosts = {}
  return {
    get: (host) => { return hosts[host] || null },
    set: (host, store) => { hosts[host] = store },
    del: (host) => { delete hosts[host] },
    empty: () => { hosts = {} }
  }
}

module.exports = {
  name: 'host',
  storage: HostStore,
}