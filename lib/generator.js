const Metalsmith = require('metalsmith')
const Handlebars = require('handlebars')
const rm = require('rimraf').sync

module.exports = function(metadata = {}, src, dest = '.'){
  if (!src) {
    return Promise.reject(new Error(`invalid source: ${src}`))
  }
  return new Promise((resolve, reject) => {
    const metalsmith = Metalsmith(process.cwd())
      .metadata(metadata)
      .clean(false)
      .source(src)
      .destination(dest)

    // 移除无用文件
    metalsmith.use((files, metalsmith, done) => {
      const meta = metalsmith.metadata()
      if (meta.management === 'None') {
        Object.keys(files).forEach(fileName => {
          if (/entries|mobx\-store|redux\-reducer/.test(fileName)) {
            delete files[fileName]
          }
        })
      }
      if (!meta.router && meta.management === 'Redux') {
        files['src/index.tsx'] = files['src/entries/index.redux.tsx']
        files['src/app.tsx'] = files['src/entries/app.redux.tsx']
        Object.keys(files).forEach(fileName => {
          if (/entries|mobx\-store/.test(fileName)) {
            delete files[fileName]
          }
        })
      }
      if (!meta.router && meta.management === 'Mobx') {
        files['src/index.tsx'] = files['src/entries/index.mobx.tsx']
        files['src/app.tsx'] = files['src/entries/app.mobx.tsx']
        Object.keys(files).forEach(fileName => {
          if (/entries|redux\-reducer/.test(fileName)) {
            delete files[fileName]
          }
        })
      }
      if (meta.router && meta.management === 'Redux') {
        files['src/index.tsx'] = files['src/entries/index.redux-router.tsx']
        files['src/app.tsx'] = files['src/entries/app.redux.tsx']
        Object.keys(files).forEach(fileName => {
          if (/entries|mobx\-store/.test(fileName)) {
            delete files[fileName]
          }
        })
      }
      if (meta.router && meta.management === 'Mobx') {
        files['src/index.tsx'] = files['src/entries/index.mobx-router.tsx']
        files['src/app.tsx'] = files['src/entries/app.mobx.tsx']
        Object.keys(files).forEach(fileName => {
          if (/entries|redux\-reducer/.test(fileName)) {
            delete files[fileName]
          }
        })
      }
      console.log(meta.webpack)
      if (meta.webpack === '4') {
        delete files['webpack3.config.js']
      }
      done()
    })

    // 替换模板内的内容，name, description, version等
    metalsmith.use((files, metalsmith, done) => {
      const meta = metalsmith.metadata()
      Object.keys(files).forEach(fileName => {
        const t = files[fileName].contents.toString()
        files[fileName].contents = new Buffer(Handlebars.compile(t)(meta))
      })
      done()
    }).build(err => {
      rm(src)
      err ? reject(err) : resolve({ dest })
    })
  })
}
