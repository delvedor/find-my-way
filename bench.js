'use strict'

const path = require('path')
const { Worker } = require('worker_threads')

const BENCH_THREAD_PATH = path.join(__dirname, 'bench-thread.js')

const testCases = [
  {
    name: 'lookup root "/" route',
    setupURLs: [{ method: 'GET', url: '/' }],
    testingMethodName: 'lookup',
    args: [
      { method: 'GET', url: '/', headers: { host: 'fastify.io' } },
      null
    ]
  },
  {
    name: 'lookup static route',
    setupURLs: [{ method: 'GET', url: '/a' }],
    testingMethodName: 'lookup',
    args: [
      { method: 'GET', url: '/a', headers: { host: 'fastify.io' } },
      null
    ]
  },
  {
    name: 'lookup dynamic route',
    setupURLs: [{ method: 'GET', url: '/user/:id' }],
    testingMethodName: 'lookup',
    args: [
      { method: 'GET', url: '/user/tomas', headers: { host: 'fastify.io' } },
      null
    ]
  },
  {
    name: 'lookup dynamic multi-parametric route',
    setupURLs: [{ method: 'GET', url: '/customer/:name-:surname' }],
    testingMethodName: 'lookup',
    args: [
      { method: 'GET', url: '/customer/john-doe', headers: { host: 'fastify.io' } },
      null
    ]
  },
  {
    name: 'lookup dynamic multi-parametric route with regex',
    setupURLs: [{ method: 'GET', url: '/at/:hour(^\\d+)h:minute(^\\d+)m' }],
    testingMethodName: 'lookup',
    args: [
      { method: 'GET', url: '/at/12h00m', headers: { host: 'fastify.io' } },
      null
    ]
  },
  {
    name: 'lookup long static route',
    setupURLs: [{ method: 'GET', url: '/abc/def/ghi/lmn/opq/rst/uvz' }],
    testingMethodName: 'lookup',
    args: [
      { method: 'GET', url: '/abc/def/ghi/lmn/opq/rst/uvz', headers: { host: 'fastify.io' } },
      null
    ]
  },
  {
    name: 'lookup long dynamic route',
    setupURLs: [{ method: 'GET', url: '/user/:id/static' }],
    testingMethodName: 'lookup',
    args: [
      {
        method: 'GET',
        url: '/user/qwertyuiopasdfghjklzxcvbnm/static',
        headers: { host: 'fastify.io' }
      },
      null
    ]
  },
  {
    name: 'lookup static route on constrained router',
    setupURLs: [
      { method: 'GET', url: '/' },
      { method: 'GET', url: '/versioned', opts: { constraints: { version: '1.2.0' } } },
      { method: 'GET', url: '/versioned', opts: { constraints: { version: '2.0.0', host: 'example.com' } } },
      { method: 'GET', url: '/versioned', opts: { constraints: { version: '2.0.0', host: 'fastify.io' } } }
    ],
    testingMethodName: 'lookup',
    args: [
      {
        method: 'GET',
        url: '/',
        headers: { host: 'fastify.io' }
      },
      null
    ]
  },
  {
    name: 'lookup static versioned route',
    setupURLs: [
      { method: 'GET', url: '/' },
      { method: 'GET', url: '/versioned', opts: { constraints: { version: '1.2.0' } } },
      { method: 'GET', url: '/versioned', opts: { constraints: { version: '2.0.0', host: 'example.com' } } },
      { method: 'GET', url: '/versioned', opts: { constraints: { version: '2.0.0', host: 'fastify.io' } } }
    ],
    testingMethodName: 'lookup',
    args: [
      {
        method: 'GET',
        url: '/versioned',
        headers: { 'accept-version': '1.x', host: 'fastify.io' }
      },
      null
    ]
  },
  {
    name: 'lookup static constrained (version & host) route',
    setupURLs: [
      { method: 'GET', url: '/' },
      { method: 'GET', url: '/versioned', opts: { constraints: { version: '1.2.0' } } },
      { method: 'GET', url: '/versioned', opts: { constraints: { version: '2.0.0', host: 'example.com' } } },
      { method: 'GET', url: '/versioned', opts: { constraints: { version: '2.0.0', host: 'fastify.io' } } }
    ],
    testingMethodName: 'lookup',
    args: [
      {
        method: 'GET',
        url: '/versioned',
        headers: { 'accept-version': '2.x', host: 'fastify.io' }
      },
      null
    ]
  },
  {
    name: 'find root "/" route',
    setupURLs: [{ method: 'GET', url: '/' }],
    testingMethodName: 'find',
    args: ['GET', '/']
  },
  {
    name: 'find static route',
    setupURLs: [{ method: 'GET', url: '/a' }],
    testingMethodName: 'find',
    args: ['GET', '/a']
  },
  {
    name: 'find dynamic route',
    setupURLs: [{ method: 'GET', url: '/user/:id' }],
    testingMethodName: 'find',
    args: ['GET', '/user/tomas']
  },
  {
    name: 'find dynamic route with encoded parameter unoptimized',
    setupURLs: [{ method: 'GET', url: '/user/:id' }],
    testingMethodName: 'find',
    args: ['GET', '/user/maintainer%2Btomas']
  },
  {
    name: 'find dynamic route with encoded parameter optimized',
    setupURLs: [{ method: 'GET', url: '/user/:id' }],
    testingMethodName: 'find',
    args: ['GET', '/user/maintainer%20tomas']
  },
  {
    name: 'find dynamic multi-parametric route',
    setupURLs: [{ method: 'GET', url: '/customer/:name-:surname' }],
    testingMethodName: 'find',
    args: ['GET', '/customer/john-doe']
  },
  {
    name: 'find dynamic multi-parametric route with regex',
    setupURLs: [{ method: 'GET', url: '/at/:hour(^\\d+)h:minute(^\\d+)m' }],
    testingMethodName: 'find',
    args: ['GET', '/at/12h00m']
  },
  {
    name: 'find long static route',
    setupURLs: [{ method: 'GET', url: '/abc/def/ghi/lmn/opq/rst/uvz' }],
    testingMethodName: 'find',
    args: ['GET', '/abc/def/ghi/lmn/opq/rst/uvz']
  },
  {
    name: 'find long dynamic route',
    setupURLs: [{ method: 'GET', url: '/user/:id/static' }],
    testingMethodName: 'find',
    args: ['GET', '/user/qwertyuiopasdfghjklzxcvbnm/static']
  },
  {
    name: 'find long nested dynamic route',
    setupURLs: [{ method: 'GET', url: '/posts/:id/comments/:id/author' }],
    testingMethodName: 'find',
    args: ['GET', '/posts/10/comments/42/author']
  },
  {
    name: 'find long nested dynamic route with encoded parameter unoptimized',
    setupURLs: [{ method: 'GET', url: '/posts/:id/comments/:id/author' }],
    testingMethodName: 'find',
    args: ['GET', '/posts/10%2C10/comments/42%2C42/author']
  },
  {
    name: 'find long nested dynamic route with encoded parameter optimized',
    setupURLs: [{ method: 'GET', url: '/posts/:id/comments/:id/author' }],
    testingMethodName: 'find',
    args: ['GET', '/posts/10%2510/comments/42%2542/author']
  },
  {
    name: 'find long nested dynamic route with other method',
    setupURLs: [{ method: 'POST', url: '/posts/:id/comments' }],
    testingMethodName: 'find',
    args: ['POST', '/posts/10/comments']
  }
]

async function runBenchmark (testCase) {
  const worker = new Worker(BENCH_THREAD_PATH, {
    workerData: testCase
  })

  return new Promise((resolve, reject) => {
    let result = null
    worker.on('error', reject)
    worker.on('message', (benchResult) => {
      result = benchResult
    })
    worker.on('exit', (code) => {
      if (code === 0) {
        resolve(result)
      } else {
        reject(new Error(`Worker stopped with exit code ${code}`))
      }
    })
  })
}

async function runBenchmarks () {
  for (const testCase of testCases) {
    const resultMessage = await runBenchmark(testCase)
    console.log(resultMessage)
  }
}

runBenchmarks()
