# find-my-way

The browser implementation of `find-my-way` is slightly different, the api remains the same, while changes the parameters.  
To make it work, you must require `'find-my-way/browser'`.

<a name="usage"></a>
## Usage
```js
const router = require('find-my-way/browser')()

router.on('/', (route) => {
  console.log(route)
})

router.lookup('/path')
```

<a name="api"></a>
## API
<a name="constructor"></a>
#### FindMyway([options])
Instance a new router.  
You can pass a default route with the option `defaultRoute`.
```js
const router = require('find-my-way/browser')({
  defaultRoute: (path) => {
    console.log(path)
  }
})
```

<a name="on"></a>
#### on(path, handler, [store])
Register a new route, `store` is an object that you can access later inside the handler function.  
`route` is an object containing, if present, the parameters, the query and the hashes; and it is formatted as the following:
```js
{
  query: Object,
  params: Object,
  hash: Object
}
```
Complete `on` example:
```js
router.on('/', (route) => {
  // your code
})

// with store
router.on('/store', (route, store) => {
  // the store can be updated
  assert.equal(store, { hello: 'world' })
}, { hello: 'world' })
```
If you want to register a **parametric** path, just use the *colon* before the parameter name, if you need a **wildcard** use the *star*.
```js
// parametric
router.on('/example/:name', () => {}))
// wildcard
router.on('/other-example/*', () => {}))
```
<a name="lookup"></a>
#### lookup(rpath)
Start a new search, path is a string.  
If a route is found it will automatically called the handler, otherwise the default route will be called.  
The url is sanitized internally, all the parameters and wildcards are decoded automatically.
```js
router.lookup('/path')
```

<a name="find"></a>
#### find(path)
Return (if present) the registered route.  
The path must be sanitized, all the parameters and wildcards are decoded automatically.
```js
router.find('/example')
// => { handler: Function, params: Object, store: Object}
// => null
```
