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
    for (var i = 0; i < customStrategies.length; i++) {
      const strategy = new customStrategies[i]()
      if (DEFAULT_STRATEGIES_NAMES.indexOf(strategy.name) !== -1) {
        strategies[i] = strategy
      } else {
        strategies.push(strategy)
      }
    }
  }

  return {
    storage: function () {
      const stores = {}
      for (var i = 0; i < strategies.length; i++) {
        stores[strategies[i].name] = strategies[i].storage()
      }
      return ConstraintsStore(stores)
    },
    deriveConstraints: function (req, ctx) {
      const derivedConstraints = {}
      var value, hasConstraint = false
      for (var i = 0; i < strategies.length; i++) {
        value = strategies[i].deriveConstraint(req, ctx)
        if (value) {
          hasConstraint = true
          derivedConstraints[strategies[i].name] = value
        }
      }

      return hasConstraint ? derivedConstraints : null
    }
  }
}

function strategyObjectToPrototype(strategy) {
  const strategyPrototype = function() {}
  strategyPrototype.prototype.name = strategy.name
  strategyPrototype.prototype.storage = strategy.storage
  strategyPrototype.prototype.deriveConstraint = strategy.deriveConstraint
  return new strategyPrototype()
}
