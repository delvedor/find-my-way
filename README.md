# find-my-way

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)  [![Build Status](https://travis-ci.org/delvedor/find-my-way.svg?branch=master)](https://travis-ci.org/delvedor/find-my-way)

A crazy fast HTTP router, internally uses an highly performant [Radix Tree](https://en.wikipedia.com/wiki/Radix_tree) (aka compact [Prefix Tree](https://en.wikipedia.com/wiki/Trie)), supports route params, wildcards, and it's framework independent.  
It is inspired by the [echo](https://github.com/labstack/echo) router, some parts have been extracted from [trekjs](https://github.com/trekjs) router.

<a name="install"></a>
## Install
```
npm i find-my-way --save
```

<a name="usage"></a>
## Usage
```js
const http = require('http')
const router = require('find-my-way')()

router.on('GET', '/', (req, res, params) => {
  res.end('{"hello":"world"}')
})

const server = http.createServer((req, res) => {
  router.lookup(req, res)
})

server.listen(3000, err => {
  if (err) throw err
  console.log('Server listening on: http://localost:3000')
})
```

<a name="api"></a>
## API
<a name="constructor"></a>
#### FindMyway([options])
Instance a new router.  
You can pass a default route with the option `defaultRoute`.
```js
const router = require('find-my-way')({
  defaultRoute: (req, res) => {
    res.statusCode = 404
    res.end()
  }
})
```

<a name="on"></a>
#### on(method, path, handler, [store])
Register a new route, `store` is an object that you can access later inside the handler function.  
```js
router.on('GET', '/', (req, res, params) => {
  // your code
})

// with store
router.on('GET', '/store', (req, res, params, store) => {
  // the store can be updated
  assert.equal(store, { hello: 'world' })
}, { hello: 'world' })
```
If you want to register a **parametric** path, just use the *colon* before the parameter name, if you need a **wildcard** use the *star*.
```js
// parametric
router.on('GET', '/example/:name', () => {}))
// wildcard
router.on('GET', '/other-example/*', () => {}))
```
<a name="lookup"></a>
#### lookup(request, response)
Start a new search, `request` and `response` are the server req/res objects.  
If a route is found it will automatically called the handler, otherwise the default route will be called.  
The url is sanitized internally, all the parameters and wildcards are decoded automatically.
```js
router.lookup(req, res)
```

<a name="find"></a>
#### find(method, path)
Return (if present) the route registered in *method:path*.  
The path must be sanitized, all the parameters and wildcards are decoded automatically.
```js
router.find('GET', '/example')
// => { handler: Function, params: Object, store: Object}
// => null
```

<a name="acknowledgements"></a>
## Acknowledgements

This project is kindly sponsored by [LetzDoIt](http://www.letzdoitapp.com/).

<a name="license"></a>
## License
**[find-my-way - MIT](https://github.com/delvedor/find-my-way/blob/master/LICENSE)**  
**[trekjs/router - MIT](https://github.com/trekjs/router/blob/master/LICENSE)**

*The software is provided "as is", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose and non infringement. In no event shall the authors or copyright holders be liable for any claim, damages or other liability, whether in an action of contract, tort or otherwise, arising from, out of or in connection with the software or the use or other dealings in the software.*

Copyright © 2017 Tomas Della Vedova
