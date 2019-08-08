'use strict'

const join = require('path').join
const request = require('request')
const delay = require('delay')

// express middleware that will use an expeditious instance for caching
const cache = require('../lib/middleware')({
  namespace: 'expressCache',
  // Store cache entries for 1 minute
  defaultTtl: 60000,

  // By default only 200 responses are cached. We also want to cache 404s
  statusCodeExpires: {
    404: 90000
  }
})

const compress = require('compression')({
  threshold: 2 // anything larger than 2 bytes is compressed
})

// Our express application
const app = require('express')()

function delayMiddleware (timeout) {
  return (req, res, next) => {
    setTimeout(() => {
      next()
    }, timeout || 2000)
  }
}

// configure view engine
app.set('views', join(__dirname, './views'))
app.set('view engine', 'pug')

// render the home page
app.get('/', cache, delayMiddleware(), (req, res) => {
  res.render('index')
})

// Simple endpoint that renders a "pong" page after a small delay
app.get(
  '/ping',
  cache,
  delayMiddleware(5000),
  (req, res) => {
    res.render('pong', {
      url: req.originalUrl
    })
  }
)

// Try calling this via curl http://localhost:8080/pipe?noCache=true a few
// times. Notice that it's not cached? Now try http://localhost:8080/pipe
// and you'll see it responds instantly after the first call
app.get(
  '/pipe',
  cache.withCondition((req) => !req.query.noCache).withTtl('1 hour'),
  delayMiddleware(),
  (req, res) => {
    request.get('http://www.facebook.com').pipe(res)
  }
)

// Demonstrates using res.sendFile
app.get(
  '/sendfile',
  cache,
  delayMiddleware(),
  (req, res) => {
    res.sendFile(join(__dirname, 'server.js'))
  }
)

// Demonstrates using res.write to send chunks of data to a user
app.get(
  '/write',
  cache,
  (req, res) => {
    delay(1000)
      .then(() => {
        res.write('1')
        console.log('wrote chunk 1')
      })
      .then(() => delay(1000))
      .then(() => {
        res.write('2')
        console.log('wrote chunk 2')
      })
      .then(() => delay(1000))
      .then(() => {
        res.write('3')
        console.log('wrote chunk 3')
      })
      .then(() => delay(1000))
      .then(() => res.end())
      .then(() => console.log('request complete'))
  }
)

// Example of compressed responses being cached
app.get('/compressed', compress, cache, (req, res) => {
  res.json({
    0: 'hello',
    1: 'hello',
    2: 'hello',
    3: 'hello',
    4: 'hello'
  })
})

// facilitates flushing of caches
app.get('/flush-cache', (req, res) => {
  cache.expeditious.flush(null, () => {
    res.end('cache flushed')
  })
})

// 404 page, also has a deliberate delay
app.use(cache, delayMiddleware(), (req, res) => {
  res.status(404).render('not-found')
})

app.listen(8080, (err) => {
  if (err) {
    throw err
  } else {
    console.log('express-expeditious example server running at http://localhost:8080')
  }
})
