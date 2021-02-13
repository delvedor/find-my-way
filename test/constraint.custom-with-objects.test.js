'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('..')
const alpha = () => { }
const beta = () => { }
const gamma = () => { }
const delta = () => { }

// Very simple content negotiation
const contentNegotiationConstraint = {
  name: 'contentNegotiation',
  storage: function () {
    let storage = {}
    return {
      get: (acceptAndContentType) => {
        return storage[acceptAndContentType.accept + acceptAndContentType.contentType] || null
      },
      set: (acceptAndContentType, store) => {
        storage[acceptAndContentType.accept + acceptAndContentType.contentType] = store
      },
      del: (acceptAndContentType) => {
        delete storage[acceptAndContentType.accept + acceptAndContentType.contentType]
      },
      empty: () => { storage = {} }
    }
  },
  deriveConstraint: (req, ctx) => {
    return {
      accept: req.headers.accept,
      contentType: req.headers['content-type']
    }
  }
}

test('A route could support a custom constraint strategy with an object as value', t => {
  t.plan(3)

  const findMyWay = FindMyWay({ constraints: { contentNegotiation: contentNegotiationConstraint } })

  findMyWay.on('GET', '/', {
    constraints: {
      contentNegotiation: {
        accept: 'application/json',
        contentType: 'application/json'
      }
    }
  }, alpha)
  findMyWay.on('GET', '/', {
    constraints: {
      contentNegotiation: {
        accept: 'application/xml',
        contentType: 'application/xml'
      }
    }
  }, beta)

  t.strictEqual(findMyWay.find('GET', '/', {
    contentNegotiation: {
      accept: 'application/json',
      contentType: 'application/json'
    }
  }).handler, alpha)
  t.strictEqual(findMyWay.find('GET', '/', {
    contentNegotiation: {
      accept: 'application/xml',
      contentType: 'application/xml'
    }
  }).handler, beta)
  t.notOk(findMyWay.find('GET', '/', {
    contentNegotiation: {
      accept: 'application/javascript',
      contentType: 'application/javascript'
    }
  }))
})

test('A route could support a custom constraint strategy with an object as value while versioned', t => {
  t.plan(6)

  const findMyWay = FindMyWay({ constraints: { contentNegotiation: contentNegotiationConstraint } })

  findMyWay.on('GET', '/api', {
    constraints: {
      contentNegotiation: {
        accept: 'application/json',
        contentType: 'application/json'
      },
      version: '2.0.0'
    }
  }, alpha)

  findMyWay.on('GET', '/api', {
    constraints: {
      contentNegotiation: {
        accept: 'application/json',
        contentType: 'application/json'
      },
      version: '3.0.0'
    }
  }, beta)

  findMyWay.on('GET', '/api', {
    constraints: {
      contentNegotiation: {
        accept: 'application/vnd.custom+json',
        contentType: 'application/vnd.custom+json'
      },
      version: '4.0.0'
    }
  }, gamma)

  findMyWay.on('GET', '/api', {
    constraints: {
      contentNegotiation: {
        accept: 'application/vnd.custom+json',
        contentType: 'application/vnd.custom+json'
      },
      version: '5.0.0'
    }
  }, delta)

  t.strictEqual(findMyWay.find('GET', '/api', {
    contentNegotiation: {
      accept: 'application/json',
      contentType: 'application/json'
    },
    version: '2.0.x'
  }).handler, alpha)

  t.strictEqual(findMyWay.find('GET', '/api', {
    contentNegotiation: {
      accept: 'application/json',
      contentType: 'application/json'
    },
    version: '3.x'
  }).handler, beta)

  t.strictEqual(findMyWay.find('GET', '/api', {
    contentNegotiation: {
      accept: 'application/vnd.custom+json',
      contentType: 'application/vnd.custom+json'
    },
    version: '4.x'
  }).handler, gamma)

  t.strictEqual(findMyWay.find('GET', '/api', {
    contentNegotiation: {
      accept: 'application/vnd.custom+json',
      contentType: 'application/vnd.custom+json'
    },
    version: '5.0.x'
  }).handler, delta)

  t.notOk(findMyWay.find('GET', '/api', {
    contentNegotiation: {
      accept: 'application/vnd.mymediatpye+json',
      contentType: 'application/vnd.mymediatpye+json'
    },
    version: '2.2.x'
  }))

  t.notOk(findMyWay.find('GET', '/api', {
    contentNegotiation: {
      accept: 'application/vnd.custom+json',
      contentType: 'application/vnd.custom+json'
    },
    version: '3.x'
  }))
})

test('A route could support a custom constraint strategy with an object as value while versioned and host constrained', t => {
  t.plan(9)

  const findMyWay = FindMyWay({ constraints: { contentNegotiation: contentNegotiationConstraint } })
  const contentNegotiation = {
    accept: 'application/x-www-form-urlencoded',
    contentType: 'application/json'
  }

  findMyWay.on('GET', '/', {
    constraints: {
      contentNegotiation,
      version: '2.0.0',
      host: 'fastify.io'
    }
  }, alpha)

  findMyWay.on('GET', '/', {
    constraints: {
      contentNegotiation,
      version: '3.0.0',
      host: 'fastify.io'
    }
  }, beta)

  findMyWay.on('GET', '/', {
    constraints: {
      contentNegotiation,
      version: '3.0.0',
      host: 'myhost.io'
    }
  }, gamma)

  t.strictEqual(findMyWay.find('GET', '/', {
    contentNegotiation,
    version: '2.0.x',
    host: 'fastify.io'
  }).handler, alpha)

  t.strictEqual(findMyWay.find('GET', '/', {
    contentNegotiation,
    version: '3.x',
    host: 'fastify.io'
  }).handler, beta)

  t.strictEqual(findMyWay.find('GET', '/', {
    contentNegotiation,
    version: '3.0.x',
    host: 'myhost.io'
  }).handler, gamma)

  t.notOk(findMyWay.find('GET', '/api', {
    contentNegotiation,
    version: '5.0.x',
    host: 'fastify.io'
  }))

  t.notOk(findMyWay.find('GET', '/api', {
    contentNegotiation,
    version: '1.x',
    host: 'myhost.io'
  }))

  t.notOk(findMyWay.find('GET', '/api', {
    contentNegotiation,
    version: '3.x'
  }))

  t.notOk(findMyWay.find('GET', '/api', {
    contentNegotiation,
    version: '2.0.x'
  }))

  t.notOk(findMyWay.find('GET', '/api', {
    contentNegotiation: {
      accept: 'application/xml',
      contentType: 'application/json'
    },
    version: '3.x',
    host: 'fastify.io'
  }))

  t.notOk(findMyWay.find('GET', '/api', {
    contentNegotiation: {
      accept: 'application/xml',
      contentType: 'application/json'
    },
    version: '3.x',
    host: 'myhost.io'
  }))
})

test('Custom deriveConstraint function can return an object', t => {
  t.plan(4)

  const findMyWay = FindMyWay({ constraints: { contentNegotiation: contentNegotiationConstraint } })

  findMyWay.on('GET', '/', {
    constraints: {
      contentNegotiation: {
        accept: 'application/json',
        contentType: 'application/xml'
      }
    }
  }, (req, res, params) => {
    t.strictEqual(req.headers.accept, 'application/json')
    t.strictEqual(req.headers['content-type'], 'application/xml')
  })

  findMyWay.on('GET', '/', {
    constraints: {
      contentNegotiation: {
        accept: 'application/x-www-form-urlencoded',
        contentType: 'application/vnd.example+json'
      }
    }
  }, (req, res, params) => {
    t.strictEqual(req.headers.accept, 'application/x-www-form-urlencoded')
    t.strictEqual(req.headers['content-type'], 'application/vnd.example+json')
  })

  findMyWay.lookup({
    method: 'GET',
    url: '/',
    headers: {
      accept: 'application/json',
      'content-type': 'application/xml'
    }
  })
  findMyWay.lookup({
    method: 'GET',
    url: '/',
    headers: {
      accept: 'application/x-www-form-urlencoded',
      'content-type': 'application/vnd.example+json'
    }
  })
})
