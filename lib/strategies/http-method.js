'use strict'

module.exports = {
  name: '__fmw_internal_strategy_merged_tree_http_method__',
  storage: function () {
    const handlers = {}
    return {
      get: (type) => { return handlers[type] || null },
      set: (type, store) => { handlers[type] = store }
    }
  },
  deriveConstraint: (req) => {
    /* istanbul ignore next */
    return req.method
  },
  mustMatchWhenDerived: true
}
