'use strict'
/**
 * Example upload.
 * @version 2021-04-12
 */
const Path = require('path')
      , Cluster = require('cluster')
      , Fs = require('fs')
      , CronJobManager = require('cron-job-manager')
try {
  // Invoke config.
  require('dotenv').config({ path: Path.join(Path.dirname(__dirname), 'config', '.env') })

  if (Cluster.isMaster) {

    //
    // Set up cron jobs.
    //
    // Init application listen port.
    const app_schedule_file_path = Path.join(Path.dirname(__dirname), 'config',
                                        (-1 !== Object.keys(process.env).indexOf('APP_SCHEDULE_FILE') ? process.env.APP_SCHEDULE_FILE : 'schedule.js'))

    // Checking schedule file is exists.
    if (Fs.existsSync(app_schedule_file_path)) {
      const schedule = require(app_schedule_file_path)
      const jm = new CronJobManager()
      Object.keys(schedule).forEach(async (jobfile) => {
        if (!jm.exists(jobfile)) {
          console.info(`Set up job ${jobfile} for execute by period ${schedule[jobfile]}`)
          jm.add(jobfile, schedule[jobfile], () => (require(Path.join(__dirname, jobfile)))() )
          jm.start(jobfile)
        }
      })
    }

    // Init limit of clusters.
    const workers_limit = (-1 !== Object.keys(process.env).indexOf('WORKERS_LIMIT') ? process.env.WORKERS_LIMIT : 1)

    // Entry log about count of runs workers.
    console.log(`Try to run ${workers_limit} instances`)

    // Run workers.
    for (let i = 0; i < workers_limit; i++) {
      Cluster.fork()
    }

    // Console out about workers
    //console.dir(Cluster.workers, {depth: 0})

    // Register handler for worker exit.
    Cluster.on('exit', (worker, code) => {
      if (code !== 0 && !worker.exitedAfterDisconnect) {
        console.log(`Worker ${worker.process.pid} crashed.\nStarting a new worker...`)
        const nw = Cluster.fork()
        console.log(`Worker ${nw.process.pid} will replace him`)
      }
    })

    // Output master PID.
    console.log(`Master PID: ${process.pid}`)

  } else if (Cluster.isWorker) {
    // Fork.
    const app = require(Path.join(__dirname, 'app.js'))

    // Set worker id for app.
    app.locals.worker_id = Cluster.worker.id
  }
}
catch(error) {
  console.trace(`An error occured while cluster run: ${error}`)
  process.exit(1)
}
