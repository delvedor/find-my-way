# find-my-way

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)  [![Build Status](https://travis-ci.org/delvedor/find-my-way.svg?branch=master)](https://travis-ci.org/delvedor/find-my-way) [![Coverage Status](https://coveralls.io/repos/github/delvedor/find-my-way/badge.svg?branch=master)](https://coveralls.io/github/delvedor/find-my-way?branch=master) [![NPM downloads](https://img.shields.io/npm/dm/find-my-way.svg?style=flat)](https://www.npmjs.com/package/find-my-way)

A crazy fast HTTP router, internally uses an highly performant [Radix Tree](https://en.wikipedia.org/wiki/Radix_tree) (aka compact [Prefix Tree](https://en.wikipedia.org/wiki/Trie)), supports route params, wildcards, and it's framework independent.

If you want to see a benchmark comparison with the most commonly used routers, see [here](https://github.com/delvedor/router-benchmark).  
Do you need a real-world example that uses this router? Check out [Fastify](https://github.com/fastify/fastify).

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
*Remember that static routes are always inserted before parametric and wildcard.*
```js
// parametric
router.on('GET', '/example/:name', () => {}))
// wildcard
router.on('GET', '/other-example/*', () => {}))
```

Regex routes are supported as well, but pay attention, regex are very expensive!
```js
// parametric with regex
router.on('GET', '/test/:file(^\\d+).png', () => {}))
```

You can also pass an array of methods if you need to declare multiple routes with the same handler but different method.
```js
router.on(['GET', 'POST'], '/', (req, res, params) => {
  // your code
})
```

<a name="shorthand-methods"></a>
##### Shorthand methods
If you want an even nicer api, you can also use the shorthand methods to declare your routes.
```js
router.get(path, handler [, store])
router.delete(path, handler [, store])
router.head(path, handler [, store])
router.patch(path, handler [, store])
router.post(path, handler [, store])
router.put(path, handler [, store])
router.options(path, handler [, store])
router.trace(path, handler [, store])
router.connect(path, handler [, store])
```

If you need a route that supports *all* methods you can use the `all` api.
```js
router.all(path, handler [, store])
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

<a name="pretty-print"></a>
#### prettyPrint()
Prints the representation of the internal radix tree, useful for debugging.
```js
findMyWay.on('GET', '/test', () => {})
findMyWay.on('GET', '/test/hello', () => {})
findMyWay.on('GET', '/hello/world', () => {})

console.log(findMyWay.prettyPrint())
// └── /
//   ├── test (GET)
//   │   └── /hello (GET)
//   └── hello/world (GET)
```

<a name="acknowledgements"></a>
## Acknowledgements

This project is kindly sponsored by [LetzDoIt](http://www.letzdoitapp.com/).  
It is inspired by the [echo](https://github.com/labstack/echo) router, some parts have been extracted from [trekjs](https://github.com/trekjs) router.

<a name="license"></a>
## License
**[find-my-way - MIT](https://github.com/delvedor/find-my-way/blob/master/LICENSE)**  
**[trekjs/router - MIT](https://github.com/trekjs/router/blob/master/LICENSE)**

Copyright © 2017 Tomas Della Vedova
