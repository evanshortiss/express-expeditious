'use strict'

const Promise = require('bluebird')
const express = require('express')
const app = express()
const pug = require('pug')
const db = require('./db')
const util = require('./util')
const join = require('path').join
const readFile = require('fs').readFile
const readFileSync = require('fs').readFileSync

const cache = require('../lib/middleware')({
  defaultTtl: 60000,
  namespace: 'cacher'
})

const countries = JSON.parse(
  readFileSync(join(__dirname, './countries.json'), 'utf8')
)

module.exports = (function () {
  console.log('removing old entries from mongodb')

  // remove old data, insert fresh data, add an index and start
  return db.then((collection) => {
    return collection.remove({})
      .then(() => collection.insert(countries))
      .then(() => collection.ensureIndex({ContinentName: 1}))
      .then(() => startApp(collection))
  })
})()

function startApp (collection) {
  console.log('starting express application')

  function getContinents (req) {
    return collection.find({
      ContinentName: req.params.continent
    })
      .toArray()
  }

  function jsonHandler (req, res, next) {
    getContinents(req)
      .then((data) => {
        if (data) {
          res.json(data)
        } else {
          res.status(404).end('looks like that\'s not a valid continent you passed')
        }
      })
      .catch(next)
  }

  function htmlHandler (req, res, next) {
    getContinents(req)
      .then((data) => {
        if (data) {
          const html = pug.renderFile(join(__dirname, './continents.pug'), {
            continent: req.params.continent,
            countries: data
          })

          res.end(html)
        } else {
          res.status(404).end('looks like that\'s not a valid continent you passed')
        }
      })
      .catch(next)
  }

  function fileHandler (req, res, next) {
    readFile(join(__dirname, 'countries.json'), (err, data) => {
      if (err) {
        next(err)
      } else {
        res.json(
          JSON.parse(data.toString('utf8')).filter((c) => {
            return c.ContinentName === req.params.continent
          })
        )
      }
    })
  }

  function weatherHandler (req, res, next) {
    getContinents(req)
      .then((countries) => Promise.map(countries, attachWeather, {concurrency: 10}))
      .then((data) => res.json(data))
      .catch(next)
  }

  function attachWeather (country) {
    // Simulate an HTTP API call delay to a weather service (100-200ms)
    return Promise.delay(util.getRandomInt(100, 200))
      .thenReturn(
        Object.assign(
          {
            summary: 'Sunshine',
            lat: country.CapitalLatitude,
            lon: country.CapitalLongitude
          },
          country
        )
      )
  }

  const router = express.Router()

  router.get('/db-json/:continent', jsonHandler)
  router.get('/html/:continent', htmlHandler)
  router.get('/file-json/:continent', fileHandler)
  router.get('/db-weather-json/:continent', weatherHandler)

  app.use('/not-cached', router)
  app.use('/cached', cache, router)

  return new Promise((resolve) => {
    app.listen(8080, (err) => {
      if (err) {
        throw err
      }

      console.log('app listening on http://localhost:8080')
      resolve()
    })
  })
}
