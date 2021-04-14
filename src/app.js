'use strict'
/**
 * Example upload.
 * @version 2021-04-14
 */
const Path = require('path')
    , Express = require('express')
    , Multer = require('multer')
    , Bunyan = require("bunyan")
    , Thing = require(Path.join(__dirname,'models', 'thing.js'))

try {
  // Invoke config.
  require('dotenv').config({ path: Path.join(Path.dirname(__dirname), 'config', '.env') })

  // Init logs dir.
  const logs_dir = Path.join(Path.dirname(__dirname),
                    (-1 !== Object.keys(process.env).indexOf('APP_LOGS_DIR') ? process.env.APP_LOGS_DIR : './../logs')
  )

  // Init log file name.
  const log_file_name = (-1 !== Object.keys(process.env).indexOf('APP_LOG_FILE_NAME') ? process.env.APP_LOG_FILE_NAME : 'app.log')

  // Init log level.
  const log_level = (-1 !== Object.keys(process.env).indexOf('APP_LOG_LEVEL') ? process.env.APP_LOG_LEVEL : 'trace')

  // Init logfile.
  const logger = Bunyan.createLogger({
                    "name": log_file_name,
                    "streams": [{
                      "level": log_level,
                      "type": "rotating-file",
                      "startNewFile": true,
                      "path": Path.join(logs_dir, log_file_name),
                      "period": "1d",
                      "totalFiles": 1,
                      "rotateExisting": true,
                      "threshold": "10m",
                      "totalSize": "100m",
                      "gzip": true
                    }]
                  })

  // Init database connection
  const initdb = require(Path.join(__dirname, 'initdb.js'))
  initdb().catch(error => {
    console.error(`An error occured while establish database connection: ${error}`)
    process.exit(1)
  })

  // Init upload dir.
  const upload_dir = (-1 !== Object.keys(process.env).indexOf('UPLOAD_DIR') ? process.env.UPLOAD_DIR : './public/uploads/')

  // Set multer storage engine.
  const storage = Multer.diskStorage({
    destination: upload_dir,
    filename: function(req, file, cb) {
      cb(null, file.fieldname + '-' + Date.now() + Path.extname(file.originalname))
    }
  })

  // Init upload limit size.
  const upload_limit_size = (-1 !== Object.keys(process.env).indexOf('UPLOAD_LIMIT_BYTES') ? process.env.UPLOAD_LIMIT_BYTES : 5242880)

  // Init container id.
  const upload_container_id = (-1 !== Object.keys(process.env).indexOf('UPLOAD_CONTAINER_ID') ? process.env.UPLOAD_CONTAINER_ID : 'myFile')

  // Init Upload
  const multer_upload = Multer({
    storage: storage,
    limits:{ fileSize: upload_limit_size },
    fileFilter: function(req, file, cb) {
      // Set allowed extensions.
      const filetypes = /jpeg|jpg|png|xlsx/

      // Check extensions.
      const extname = filetypes.test(Path.extname(file.originalname).toLowerCase())

      // Check mime
      const mimetype = filetypes.test(file.mimetype)

      if(mimetype && extname) {
        return cb(null, true)
      } else {
        cb('Error: jpeg, jpg, png, xlsx')
      }
    }
  }).single(upload_container_id)

  // Init app.
  const app = Express()

  // Init app root dir.
  const app_root_dir = Path.join(__dirname, (-1 !== Object.keys(process.env).indexOf('APP_ROOT_DIR') ? process.env.APP_ROOT_DIR : './public'))

  // Set public folder for app.
  app.use(Express.static(app_root_dir))

  // Configure cors.
  app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Methods", "GET, PUT, DELETE")
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
    next()
  })

  // Set the root route.
  app.get('/:page?', (req, res) => {
    try {
    // Init per page limit.
    const per_page_limit = (-1 !== Object.keys(process.env).indexOf('FETCH_PER_PAGE') ? parseInt(process.env.FETCH_PER_PAGE) : 5)

    // Init current page.
    const page = req.params.page || 1

    // Init list of allowed attributes.
    const allowed_attrs = ['filename', 'size']

    // Fetch early uploaded.
    Thing.find({})
         .skip((per_page_limit * page) - per_page_limit)
         .limit(per_page_limit)
         .sort({ createdAt: -1 })
         .exec(function(err, files) {
          if (err) {
            res.json({ status: 'error', message: `An error occured while fetch: ${err}` })
          }
          else {
           // Filter attribs of files.
           files = files.map(file => {
             file = file.toObject()

             // Filter attributes by allow list.
             file.attrs = file.attrs.filter(attr => allowed_attrs.some(key => (-1 !== Object.keys(attr).indexOf(key))))

             // Replace properties.
             const props = file.attrs.reduce((r, i) => {
               r = { ...r, ...{ [Object.keys(i).shift()]: Object.values(i).shift() } }
               return r
             }, {})

             delete file.attrs
             file = { ...file, ...props }
             return file
           })

           res.json({ status: 'ok', files: files })
          }
        })
    }
    catch(error) {
      res.json({ status: 'error', message: `${error}` })
    }
  })

  // Set the upload route.
  app.put('/', (req, res) => {
    try {
      multer_upload(req, res, (err) => {
        if (err) {
          res.json({ status: 'error', message: `${err}` })
        }
        else {
          if (req.file == undefined) {
            res.json({ status: 'error', message: 'Cannot recognize data' })
          }
          else {
            // Init thing.
            const thing = new Thing()

            // Build thing.
            const file_attrs = Object.keys(req.file)
            for (let i in file_attrs) {
              thing.attrs.push({[file_attrs[i]]: req.file[file_attrs[i]]})
            }

            // Save thing.
            thing.save(function (err, file) {
              if (err) {
                res.json({ status: 'error', message: `Error while save: ${err}` })
              }
              else {
                // Entry log about file action.
                logger.info(`File with ID #${file.id} successfully created on worker id #${app.locals.worker_id}`)
              }
            })
          }
        }
        res.redirect('/')
      })
    }
    catch(error) {
      res.json({ status: 'error', message: `${err}` })
    }
  })

  // Set the delete for uploads route.
  app.delete('/:id', (req, res) => {
    try {
    // Fetch one by id.
    Thing.findOne({ _id: req.params.id, is_deleted: false })
         .exec(function(err, target) {
          if (err) {
            res.json({ status: 'error', message: `Error while find with ID #${req.params.id}: ${err}` })
          }
          else {
            target.is_deleted = true
            target.save(function (err, file) {
              if (err) {
                res.json({ status: 'error', message: `Error while update: ${err}` })
              }
              else {
                // Entry log about file action.
                logger.info(`File with ID #${file.id} successfully set as deleted on worker id #${app.locals.worker_id}`)
              }
              res.redirect('/')
            })
          }
        })
    }
    catch(error) {
      res.json({ status: 'error', message: `${error}` })
    }
  })

  // Init application listen host.
  const app_listen_host = (-1 !== Object.keys(process.env).indexOf('APP_HOST') ? process.env.APP_HOST : 'localhost')

  // Init application listen port.
  const app_listen_port = (-1 !== Object.keys(process.env).indexOf('APP_PORT') ? process.env.APP_PORT : 3000)

  // Init application listen
  app.listen(app_listen_port, app_listen_host, () => console.log(`Server as worker ${app.locals.worker_id} started on ${app_listen_host}:${app_listen_port}`))

  // Export app.
  module.exports = app
}
catch(error) {
  console.trace(`An error occured while run app: ${error}`)
  process.exit(1)
}
