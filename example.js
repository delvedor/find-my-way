'use strict'

const http = require('http')
const router = require('./')()

router.on('GET', '/status', (req, res, params) => {
  res.end('{"hello":"world"}')
})

router.on('GET', '/test', (req, res, params) => {
  res.end('{"hello":"world"}')
})

const server = http.createServer((req, res) => {
  console.log(req.url)
  router.lookup(req, res)
})

server.listen(3000, err => {
  if (err) throw err
  console.log('Server listening on: http://localost:3000')
})
