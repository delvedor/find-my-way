'use strict'

const ConstraintsStore = require('./constraints-store')

const acceptVersionStrategy = require('./strategies/accept-version')
const acceptHostStrategy = require('./strategies/accept-host')

const DEFAULT_STRATEGIES_NAMES = ['version', 'host']

module.exports = (customStrategies) => {
  const strategies = [
    new acceptVersionStrategy(),
    new acceptHostStrategy()
  ]

  if (customStrategies) {
    for (let i = 0; i < customStrategies.length; i++) {
      const strategy = new customStrategies[i]()
      if (DEFAULT_STRATEGIES_NAMES.indexOf(strategy.name) !== -1) {
        strategies[i] = strategy
      } else {
        strategies.push(strategy)
      }
    }
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
