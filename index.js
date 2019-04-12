const path = require('path')
const colors = require('chalk')
const terminate = require('terminate')
const {forEach, filter} = require('p-iteration')
const {exec} = require('child_process')
const findSkeletonRoot = require('organic-stem-skeleton-find-root')
const fsDir = require('util').promisify(require('fs').readdir)
const lstat = require('util').promisify(require('fs').lstat)

module.exports = function (angel) {
  angel.on(/repo cmodule (.*) -- (.*)/, function (angel, done) {
    let moduleName = angel.cmdData[1]
    let cmd = angel.cmdData[2]
    executeCommandOnModules(cmd, [moduleName]).then(() => done()).catch(done)
  })
  angel.on(/repo cmodules -- (.*)/, function (angel, done) {
    let cmd = angel.cmdData[1]
    executeCommandOnModules(cmd).then(() => done()).catch(done)
  })
}

const terminateAsync = async function (pid) {
  return new Promise((resolve, reject) => {
    terminate(pid, err => {
      if (err) return reject(err)
      resolve()
    })
  })
}

const formatModuleName = function (value) {
  return '[' + colors.blue(value) + ']'
}

const executeCommand = async function ({ moduleName, cmd, cwd, env, childHandler }) {
  return new Promise((resolve, reject) => {
    console.log(formatModuleName(moduleName), cmd, '@', cwd)
    let child = exec(cmd, {
      cwd: cwd,
      env: env
    })
    if (childHandler) {
      childHandler(child)
    }
    child.stdout.on('data', chunk => {
      console.log(formatModuleName(moduleName), chunk.toString())
    })
    child.stderr.on('data', chunk => {
      console.error(formatModuleName(moduleName), colors.red(chunk.toString()))
    })
    child.on('close', status => {
      if (status !== 0) return reject(new Error(moduleName + ' ' + cmd + ' returned ' + status))
      resolve()
    })
  })
}
const executeCommandOnModules = function (cmd, moduleNames) {
  return new Promise(async (resolve, reject) => {
    const fullRepoPath = await findSkeletonRoot()
    let cmodulesPath = path.join(fullRepoPath, 'cells/node_modules')
    let names = await fsDir(cmodulesPath)
    names = await filter(names, async (name) => {
      if (moduleNames && moduleNames.indexOf(name) === -1) return false
      let stat = await lstat(path.join(cmodulesPath, name))
      return stat.isDirectory()
    })
    let tasks = names.map((name) => {
      return {
        name: name,
        cwd: path.join(cmodulesPath, name)
      }
    })
    if (tasks.length === 0) {
      return reject(new Error('no common modules found'))
    }
    let runningChilds = []
    let childHandler = function (child) {
      runningChilds.push(child)
      child.on('close', () => {
        runningChilds.splice(runningChilds.indexOf(child), 1)
      })
    }
    forEach(tasks, async taskInfo => {
      return executeCommand({
        moduleName: taskInfo.name,
        cmd: cmd,
        cwd: taskInfo.cwd,
        env: process.env,
        childHandler: childHandler
      })
    }).then(resolve).catch(async err => {
      let pids = runningChilds.map(v => v.pid)
      await forEach(pids, terminateAsync)
      reject(err)
    })
  })
}
