'use strict'

const ConstraintsStore = require('./constraints-store')

const acceptVersionStrategy = require('./strategies/accept-version')
const acceptHostStrategy = require('./strategies/accept-host')

module.exports = (strats) => {
  const strategies = {
    version: acceptVersionStrategy,
    host: acceptHostStrategy,
    ...strats
  }

  return {
    storage: ConstraintsStore.bind(null, instanciateStorage()),
    getConstraintsExtractor: function (req, ctx) {
      return function (kConstraints) {
        const derivedConstraints = {}
        kConstraints.forEach(key => {
          var value = strategies[key].deriveConstraint(req, ctx)
          if (value) derivedConstraints[key] = value
        })
        return derivedConstraints
      }
    }
  }

  function instanciateStorage () {
    const result = {}
    Object.keys(strategies).forEach(strategy => {
      result[strategy] = strategies[strategy].storage()
    })
    return result
  }
}
