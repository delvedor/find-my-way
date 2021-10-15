'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('..')

test('Decode the URL before the routing', t => {
  t.plan(8)
  const findMyWay = FindMyWay()

  function space (req, res, params) {}
  function percentTwenty (req, res, params) {}
  function percentTwentyfive (req, res, params) {}

  findMyWay.on('GET', '/static/:pathParam', () => {})
  findMyWay.on('GET', '/[...]/a .html', space)
  findMyWay.on('GET', '/[...]/a%20.html', percentTwenty)
  findMyWay.on('GET', '/[...]/a%2520.html', percentTwentyfive)

  t.equal(findMyWay.find('GET', '/[...]/a .html').handler, space)
  t.equal(findMyWay.find('GET', '/%5B...%5D/a .html').handler, space)
  t.equal(findMyWay.find('GET', '/[...]/a%20.html').handler, space, 'a%20 decode is a ')
  t.equal(findMyWay.find('GET', '/%5B...%5D/a%20.html').handler, space, 'a%20 decode is a ')
  t.equal(findMyWay.find('GET', '/[...]/a%2520.html').handler, percentTwenty, 'a%2520 decode is a%20')
  t.equal(findMyWay.find('GET', '/%5B...%5D/a%252520.html').handler, percentTwentyfive, 'a%252520.html is a%2520')
  t.equal(findMyWay.find('GET', '/[...]/a  .html'), null, 'double space')
  t.equal(findMyWay.find('GET', '/static/%25E0%A4%A'), null, 'invalid encoded path param')
})

test('double encoding', t => {
  t.plan(8)
  const findMyWay = FindMyWay()

  function pathParam (req, res, params) {
    t.same(params, this.expect, 'path param')
    t.same(pathParam, this.handler, 'match handler')
  }
  function regexPathParam (req, res, params) {
    t.same(params, this.expect, 'regex param')
    t.same(regexPathParam, this.handler, 'match handler')
  }
  function wildcard (req, res, params) {
    t.same(params, this.expect, 'wildcard param')
    t.same(wildcard, this.handler, 'match handler')
  }

  findMyWay.on('GET', '/:pathParam', pathParam)
  findMyWay.on('GET', '/reg/:regExeParam(^.*$)', regexPathParam)
  findMyWay.on('GET', '/wild/*', wildcard)

  findMyWay.lookup(get('/' + doubleEncode('reg/hash# .png')), null,
    { expect: { pathParam: singleEncode('reg/hash# .png') }, handler: pathParam }
  )
  findMyWay.lookup(get('/' + doubleEncode('special # $ & + , / : ; = ? @')), null,
    { expect: { pathParam: singleEncode('special # $ & + , / : ; = ? @') }, handler: pathParam }
  )
  findMyWay.lookup(get('/reg/' + doubleEncode('hash# .png')), null,
    { expect: { regExeParam: singleEncode('hash# .png') }, handler: regexPathParam }
  )
  findMyWay.lookup(get('/wild/' + doubleEncode('mail@mail.it')), null,
    { expect: { '*': singleEncode('mail@mail.it') }, handler: wildcard }
  )

  function doubleEncode (str) {
    return encodeURIComponent(encodeURIComponent(str))
  }
  function singleEncode (str) {
    return encodeURIComponent(str)
  }
})

test('Special chars on path parameter', t => {
  t.plan(10)
  const findMyWay = FindMyWay()

  function pathParam (req, res, params) {
    t.same(params, this.expect, 'path param')
    t.same(pathParam, this.handler, 'match handler')
  }
  function regexPathParam (req, res, params) {
    t.same(params, this.expect, 'regex param')
    t.same(regexPathParam, this.handler, 'match handler')
  }
  function staticEncoded (req, res, params) {
    t.same(params, this.expect, 'static match')
    t.same(staticEncoded, this.handler, 'match handler')
  }

  findMyWay.on('GET', '/:pathParam', pathParam)
  findMyWay.on('GET', '/reg/:regExeParam(^\\d+) .png', regexPathParam)
  findMyWay.on('GET', '/[...]/a%2520.html', staticEncoded)

  findMyWay.lookup(get('/%5B...%5D/a%252520.html'), null, { expect: {}, handler: staticEncoded })
  findMyWay.lookup(get('/[...].html'), null, { expect: { pathParam: '[...].html' }, handler: pathParam })
  findMyWay.lookup(get('/reg/123 .png'), null, { expect: { regExeParam: '123' }, handler: regexPathParam })
  findMyWay.lookup(get('/reg%2F123 .png'), null, { expect: { pathParam: 'reg/123 .png' }, handler: pathParam }) // en encoded / is considered a parameter
  findMyWay.lookup(get('/reg/123%20.png'), null, { expect: { regExeParam: '123' }, handler: regexPathParam })
})

function get (url) {
  return { method: 'GET', url, headers: {} }
}

// http://localhost:3000/parameter with / in it
// http://localhost:3000/parameter%20with%20%2F%20in%20it

// http://localhost:3000/parameter with %252F in it
