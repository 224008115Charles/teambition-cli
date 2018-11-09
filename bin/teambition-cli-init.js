#!/usr/bin/env node

const program = require('commander')
const path = require('path')
const fs = require('fs')
const glob = require('glob')
const download = require('../lib/download') // Download template
const inquirer = require('inquirer')
const latestVersion = require('latest-version') // get the package latest version
const generator = require('../lib/generator')
const chalk = require('chalk')
const logSymbols = require('log-symbols')

program.usage('<project-name>')
.option('-r, --repository [repository]', 'assign to repository')
.parse(process.argv)

// Get the project name based on input
let projectName = program.args[0]

if (!projectName) {
  // Project-name is empty, showing --help
  program.help()
  return
}

const list = glob.sync('*')  // Traversal of current directory
let rootName = path.basename(process.cwd())

let next = undefined

if (list.length) {
  // Determine whether there is an input projectName directory in the current directory
  if (list.filter(name => {
    const fileName = path.resolve(process.cwd(), path.join('.', name))
    const isDir = fs.statSync(fileName).isDirectory()
    return name.indexOf(projectName) !== -1 && isDir
  }).length !== 0) {
    console.log(`${projectName} directory is exist`)
    return
  }
  next = Promise.resolve(projectName)

} else if (rootName === projectName) {
  // input projectName and its root directory with the same name
  next = inquirer.prompt([
    {
      name: 'buildInCurrent',
      message: '当前目录为空，目录名称和项目名称相同，是否直接在当前目录下创建新项目？',
      type: 'confirm',
      default: true
    }
  ]).then(answer => {
    return Promise.resolve(answer.buildInCurrent ? projectName : '.')
  })

} else {
  next = Promise.resolve(projectName)
}

go()

function go() {
  next.then(projectName => {
    if(projectName !== '.'){
      fs.mkdirSync(projectName)
      const url = program.repository ? program.repository : 'teambition/teambition-cli-template'
      download(url, projectName)
      .then(target => {
        return {
          name: projectName,
          root: projectName,
          downloadTemp: target
        }
      })
      .then(context => {
        return inquirer.prompt([
          {
            name: 'projectName',
            message: 'name',
            default: context.name,
          },
          {
            name: 'projectVersion',
            message: 'version',
            default: '1.0.0',
          },
          {
            name: 'projectDescription',
            message: 'description',
            default: `A project named ${context.name}`,
          },
          {
            name: 'projectAuthor',
            message: 'author',
            default: `teambition`,
          },
          {
            name: 'router',
            message: 'Enable Router?',
            type: 'confirm',
            default: true,
          },
          {
            name: 'management',
            message: 'Redux or Mobx?',
            type: 'list',
            default: `None`,
            choices: ['None', 'Redux', 'Mobx'],
          },
          // {
          //   name: 'stylus',
          //   message: 'Enable Stylus?',
          //   type: 'confirm',
          //   default: true,
          // },
          {
            name: 'test',
            message: 'Enable Test?',
            type: 'list',
            default: 'None',
            choices: ['None', 'Mocha', 'Jest'],
          },
        ]).then(answers => {
          // return latestVersion('macaw-ui').then(version => {
          //   answers.supportUiVersion = version
            return {
              ...context,
              metadata: {
                ...answers
              }
            }
          // }).catch(err => {
          //   return Promise.reject(err)
          // })
        })
      })
      .then(context => {
        return generator(context.metadata, context.downloadTemp, path.parse(context.downloadTemp).dir);
      })
      .then(res => {
        console.log(logSymbols.success, chalk.green('found success:)'))
        console.log(chalk.green('cd ' + res.dest + '\nyarn install\nyarn start'))
      })
      .catch(error => {
        console.error(logSymbols.error, chalk.red(`found faild：${error.message}`))
      })
    }
  })

}
