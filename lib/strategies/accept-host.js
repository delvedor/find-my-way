'use strict'

// TODO: Add regex support
module.exports = {
  storage: function () {
    let hosts = {}
    return {
      get: (host) => { return hosts[host] || null },
      set: (host, store) => { hosts[host] = store },
      del: (host) => { delete hosts[host] },
      empty: () => { hosts = {} }
    }
  },
  deriveConstraint: function (req, ctx) {
    return req.headers.host
  }
}
