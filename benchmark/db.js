'use strict';

const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb://localhost:27017/expeditious-benchmark';

module.exports = MongoClient.connect(url)
  .then((db) => db.collection('expeditious-benchmark'));
