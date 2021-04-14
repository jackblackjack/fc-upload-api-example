'use strict'
/**
 * Clean up database.
 * @version 2021-04-12
 */
const Path = require('path')
    , Fs = require('fs')
    , { unlink } = require("fs").promises
    , Thing = require(Path.join(__dirname,'models', 'thing.js'))

module.exports = async () => {
  try {
    // Invoke config.
    require('dotenv').config({ path: Path.join(Path.dirname(__dirname), 'config', '.env') })

    // Init database connection
    const initdb = require(Path.join(__dirname, 'initdb.js'))
    await initdb().catch(error => {
      console.error(`An error occured while establish database connection: ${error}`)
      process.exit(1)
    })

    // Delete files.
    Thing.find({ is_deleted: true })
        .exec(async function (err, files) {
            if (err) {
              throw new Error(`An error occured while clean up database: ${err}`)
            }
            else {
              if (!files.length) {
                console.info('Nothing to do')
              }

              // Build list of promises.
              const fn = files.map(async (file) => {
                const attr_path = file.attrs.filter(attr => Array('path').some(key => (-1 !== Object.keys(attr).indexOf(key))))
                const file_path = Object.values(attr_path.shift()).shift()
                const full_path = Path.join(Path.dirname(__dirname), file_path)

                if (!Fs.existsSync(full_path)) {
                  console.error(`File ${full_path} not found`)

                  // Delete record?
                  return Thing.deleteOne({ _id: file.id })
                              .catch(error => console.error(`An error occured while remove record for file with ID #${file.id}: ${error}`))
                }

                console.info(`Found file ${full_path}`)

                // Delete file.
                return new Promise(async (resolve, reject) => {
                  await unlink(full_path)
                          .catch(error => reject(`An error occured while remove file '${full_path}': ${error}`))

                  // Delete record.
                  await Thing.deleteOne({ _id: file.id })
                              .catch(error => reject(`An error occured while remove record for file with ID #${file.id}: ${error}`))

                  resolve()
                })
              })

              // Waiting while clean up.
              const result = await Promise.all(fn)

              // Entry log and bye!
              console.info('End clean up')
            }
          })
  }
  catch(error) {
    console.trace(`An error occured while clean up: ${error}`)
    process.exit(1)
  }
}
