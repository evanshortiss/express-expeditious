
import * as express from 'express';
import * as expeditious from '../';

const app = express();

const cacheoptions: expeditious.ExpeditiousOptions = {
  namespace: 'tsexamplecache',
  defaultTtl: '1 minute'
};

const cache = expeditious(cacheoptions);

app.get('/sometimes-slow-ping', cache, (req, res) => {
  setTimeout(() => {
    res.end('pong');
  }, 1500);
});

// This cache has an example of a condition being used, but it will never be true 'GET' != 'POST'.
// This means this route will always be slow since it never gets cached - not something you'd actually do!
app.get(
  '/always-slow-ping',
  cache.withCondition((req) => req.method.toLowerCase() === 'post'),
  (req, res) => {
    res.end('pong');
  }
);

app.listen(8080, (err) => {
  if (err) {
    throw err;
  }

  console.log('ts-example listening on localhost:8080');
  console.log('try hitting http://localhost:8080/sometimes-slow-ping or http://localhost:8080/always-slow-ping')
})
