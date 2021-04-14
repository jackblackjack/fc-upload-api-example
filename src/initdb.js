'use strict'
const Path = require('path')
    , { connect } = require('mongoose')

module.exports = async () => {
  // Invoke config.
  require('dotenv').config({ path: Path.join(Path.dirname(__dirname), 'config', '.env') })

  // Checking if database connection vars are exists in env.
  Array('DB_URI', 'DB_NAME').map(key => {
    if (-1 === Object.keys(process.env).indexOf(key)) {
      throw new Error(`Variable ${key} not found into env!`)
    }
  })

  // Try to create connection to database.
  return connect(process.env.DB_URI, {
        dbName: process.env.DB_NAME,
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
        useCreateIndex: true
    })
    .catch(error => {
      throw new Error(`Cannot establish database connection: ${error}`)
    })
}
