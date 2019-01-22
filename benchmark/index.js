'use strict'

// Data used in this benchmark is sourced from http://techslides.com/demos/country-capitals.json

process.env.NODE_ENV = 'production' // ensure full speed for express/pug

const Benchmark = require('benchmark')
const request = require('request')
const util = require('./util.js')
const suite = new Benchmark.Suite({
  onComplete: () => {
    process.exit(0)
  }
})

// opts passed for each test to benchmarkjs
const opts = { defer: true }

// These will randomly be used to query the server
const continents = [
  'Europe',
  'Africa',
  'South America',
  'North America',
  'Antarctica',
  'Asia',
  'Australia'
]

// Generates a test suite function that hits the passed route
function genTestFn (route) {
  return (deffered) => {
    const url = `http://localhost:8080${route}/${continents[util.getRandomInt(0, continents.length)]}`
    request.get({ url: url }, (err, res) => {
      if (err) {
        throw err
      } else if (res && res.statusCode !== 200) {
        throw new Error(`received non ${res.statusCode} from server and body "${res.body}" when getting ${url}`)
      } else {
        deffered.resolve()
      }
    })
  }
}

require('./server.js')
  .then(() => {
    console.log('starting benchmark\n')
    suite
      .add('/not-cached/db-json', genTestFn('/not-cached/db-json'), opts)
      .add('/not-cached/html', genTestFn('/not-cached/html'), opts)
      .add('/not-cached/file-json', genTestFn('/not-cached/file-json'), opts)
      .add('/not-cached/db-weather-json', genTestFn('/not-cached/db-weather-json'), opts)
      .add('/cached/db-json', genTestFn('/cached/db-json'), opts)
      .add('/cached/html', genTestFn('/cached/html'), opts)
      .add('/cached/file-json', genTestFn('/cached/file-json'), opts)
      .add('/cached/db-weather-json', genTestFn('/cached/db-weather-json'), opts)
      .on('cycle', function (event) {
        console.log(String(event.target))
      })
      .run()
  })
  .catch((err) => {
    console.log(err)
    process.exit(1)
  })
