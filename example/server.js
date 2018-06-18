'use strict'

const join = require('path').join
const request = require('request')

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

function delay (timeout) {
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
app.get('/', cache, delay(), (req, res) => {
  res.render('index')
})

// Simple endpoint that renders a "pong" page after a small delay
app.get(
  '/ping',
  cache,
  delay(),
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
  delay(),
  (req, res) => {
    request.get('http://www.facebook.com').pipe(res)
  }
)

// Demonstrates using res.sendFile
app.get(
  '/sendfile',
  cache,
  delay(),
  (req, res) => {
    res.sendFile(join(__dirname, 'server.js'))
  }
)

// Demonstrates using res.write to send chunks of data to a user
app.get(
  '/write',
  cache,
  delay(),
  (req, res) => {
    res.write('1')
    res.write('2-2')
    res.write('3-3-3')
    res.end()
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
app.use(cache, delay(), (req, res) => {
  res.status(404).render('not-found')
})

app.listen(8080, (err) => {
  if (err) {
    throw err
  } else {
    console.log('express-expeditious example server running at http://localhost:8080')
  }
})
