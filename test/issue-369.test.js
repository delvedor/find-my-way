'use strict'

const { test } = require('node:test')
const FindMyWay = require('..')

test('routes differing only by a static part between parameters are distinct', t => {
  t.plan(2)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/h5/:cityName-:poiName/hotels-c:cityId-r:poiId', () => 'r')
  findMyWay.on('GET', '/h5/:cityName-:poiName/hotels-c:cityId-a:poiId', () => 'a')

  t.assert.equal(findMyWay.find('GET', '/h5/city-poi/hotels-cC1-rP1').handler(), 'r')
  t.assert.equal(findMyWay.find('GET', '/h5/city-poi/hotels-cC1-aP1').handler(), 'a')
})

test('parameters separated by different static parts do not collide', t => {
  t.plan(2)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/foo/:a-:b', () => 'dash')
  findMyWay.on('GET', '/foo/:a.:b', () => 'dot')

  t.assert.equal(findMyWay.find('GET', '/foo/x-y').handler(), 'dash')
  t.assert.equal(findMyWay.find('GET', '/foo/x.y').handler(), 'dot')
})

test('params are still parsed when a node ends with a parameter', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/h5/:cityName-:poiName/hotels-c:cityId-r:poiId', () => {})

  t.assert.deepEqual(findMyWay.find('GET', '/h5/city-poi/hotels-cC1-rP1').params, {
    cityName: 'city',
    poiName: 'poi',
    cityId: 'C1',
    poiId: 'P1'
  })
})

test('findRoute distinguishes routes differing only by an interior static part', t => {
  t.plan(3)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/h5/:cityName-:poiName/hotels-c:cityId-r:poiId', () => 'r')
  findMyWay.on('GET', '/h5/:cityName-:poiName/hotels-c:cityId-a:poiId', () => 'a')

  t.assert.equal(
    findMyWay.findRoute('GET', '/h5/:cityName-:poiName/hotels-c:cityId-r:poiId').handler(),
    'r'
  )
  t.assert.equal(
    findMyWay.findRoute('GET', '/h5/:cityName-:poiName/hotels-c:cityId-a:poiId').handler(),
    'a'
  )
  t.assert.equal(
    findMyWay.findRoute('GET', '/h5/:cityName-:poiName/hotels-c:cityId-z:poiId'),
    null
  )
})

test('duplicate routes ending with a parameter are still rejected', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/h5/hotels-c:cityId-r:poiId', () => {})

  t.assert.throws(
    () => findMyWay.on('GET', '/h5/hotels-c:cityId-r:poiId', () => {}),
    /already declared/
  )
})
