'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('..')

test('Decode the URL before the routing', t => {
  t.plan(7)
  const findMyWay = FindMyWay()

  function space (req, res, params) {}
  function percentTwenty (req, res, params) {}
  function percentTwentyfive (req, res, params) {}

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
})

test('Special chars on path parameter', t => {
  t.plan(12)
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
  findMyWay.lookup(get('/reg%252F123 .png'), null, { expect: { pathParam: 'reg/123 .png' }, handler: pathParam })
  findMyWay.lookup(get('/reg/123 .png'), null, { expect: { regExeParam: '123' }, handler: regexPathParam })
  findMyWay.lookup(get('/reg%2F123 .png'), null, { expect: { regExeParam: '123' }, handler: regexPathParam })
  findMyWay.lookup(get('/reg/123%20.png'), null, { expect: { regExeParam: '123' }, handler: regexPathParam })

  function get (url) {
    return { method: 'GET', url, headers: {} }
  }
})
