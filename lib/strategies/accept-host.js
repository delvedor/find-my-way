'use strict'

// TODO: Add regex support
function acceptHost() {}

function HostStore() {
  let hosts = {}
  return {
    get: (host) => { return hosts[host] || null },
    set: (host, store) => { hosts[host] = store },
    del: (host) => { delete hosts[host] },
    empty: () => { hosts = {} }
  }
}

acceptHost.prototype.name = 'host'
acceptHost.prototype.storage = HostStore
acceptHost.prototype.deriveConstraint = function (req, ctx) {
  return req.headers['host']
}

module.exports = acceptHost