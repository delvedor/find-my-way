'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('..')

test('Double colon and parametric children', t => {
  t.plan(2)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/::articles', () => {})
  findMyWay.on('GET', '/:article_name', () => {})

  t.same(findMyWay.find('GET', '/:articles').params, {})
  t.same(findMyWay.find('GET', '/articles_param').params, { article_name: 'articles_param' })
})

test('Double colon and parametric children', t => {
  t.plan(2)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/::test::foo/:param/::articles', () => {})
  findMyWay.on('GET', '/::test::foo/:param/:article_name', () => {})

  t.same(
    findMyWay.find('GET', '/:test:foo/param_value1/:articles').params,
    { param: 'param_value1' }
  )
  t.same(
    findMyWay.find('GET', '/:test:foo/param_value2/articles_param').params,
    { param: 'param_value2', article_name: 'articles_param' }
  )
})
