'use strict';

const join = require('path').join;

// express middleware that will use an expeditious instance for caching
const cache = require('../lib/cache')({
  namespace: 'expressCache',
  // Store cache entries for 1 minute
  defaultTtl: 60000
});

// Our express application
const app = require('express')();

// configure view engine
app.set('views', join(__dirname, './views'));
app.set('view engine', 'pug');

// render the home page
app.get('/', (req, res) => {
  res.render('index');
});

// express request handler that returns a pong for a ping
function pingHandler (req, res) {
  setTimeout(() => {
    res.render('pong', {
      url: req.originalUrl
    });
  }, 2500);
}

// the initial call to this will take 2.5 seconds, but any subsequent calls
// will receive a response instantaneously for the next 60 seconds thanks
// to our expeditious cache
app.get('/sometimes-slow-ping', cache, pingHandler);

// no caching applied here so it will always take 2.5 seconds to respond
app.get('/always-slow-ping', pingHandler);

app.get('/flush-cache', (req, res) => {
  cache.expeditious.flush(null,() => {
    res.end('cache flushed');
  });
})

app.listen(8080, (err) => {
  if (err) {
    throw err;
  } else {
    console.log('express-expeditious example server running at http://localhost:8080');
  }
});
