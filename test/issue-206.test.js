'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('..')

test('Set method property when splitting node', t => {
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
  t.equal(findMyWay.find('GET', '/%5B...%5D/a%252520.html').handler, percentTwenty, 'a%252520.html is a%2520')
  t.equal(findMyWay.find('GET', '/[...]/a  .html'), null, 'double space')
})
