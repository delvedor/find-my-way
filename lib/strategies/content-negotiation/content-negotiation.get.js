'use strict'
const assert = require('assert')
const Negotiator = require('negotiator')

function ContentNegotiationStore () {
  let store = {}
  let mediaTypes = []
  return {
    get: (mediaType) => {
      const negotiator = new Negotiator({ headers: { accept: mediaType } })

      const acceptedMediaType = negotiator.mediaType(mediaTypes)

      return store[acceptedMediaType] || store['406']
    },
    set: (mediaType, handler) => {
      store[mediaType] = handler
      mediaTypes.push(mediaType)
    },
    del: (mediaType) => {
      delete store[mediaType]
      mediaTypes = mediaTypes.filter(type => type !== mediaType)
    },
    empty: () => {
      store = {}
      mediaTypes = []
    }
  }
}

module.exports = {
  name: 'negotiationGet',
  mustMatchWhenDerived: true,
  storage: ContentNegotiationStore,
  validate (value) {
    assert(typeof value === 'string', 'Accepted Media Type should be a string.')
  },
  deriveConstraint: (req, ctx) => {
    return req.headers.accept
  }
}
