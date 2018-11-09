const Metalsmith = require('metalsmith')
const Handlebars = require('handlebars')
const rm = require('rimraf').sync
const fs = require('fs')

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
        files['src/components/hello.tsx'] = files['src/components/hello.disable.tsx']
        if (meta.router) {
          files['src/vendor.ts'] = files['src/entries/vendor.router.ts']
        }
        Object.keys(files).forEach(fileName => {
          if (/entries|mobx\-store|redux\-reducer/.test(fileName)) {
            delete files[fileName]
          }
        })
      }
      if (!meta.router && meta.management === 'Redux') {
        files['src/index.tsx'] = files['src/entries/index.redux.tsx']
        files['src/app.tsx'] = files['src/entries/app.redux.tsx']
        files['src/vendor.ts'] = files['src/entries/vendor.redux.ts']
        files['src/redux-reducer/index.ts'] = files['src/redux-reducer/index.no-router.ts']
        Object.keys(files).forEach(fileName => {
          if (/entries|router|mobx\-store/.test(fileName)) {
            delete files[fileName]
          }
        })
      }
      if (!meta.router && meta.management === 'Mobx') {
        files['src/index.tsx'] = files['src/entries/index.mobx.tsx']
        files['src/app.tsx'] = files['src/entries/app.mobx.tsx']
        files['src/vendor.ts'] = files['src/entries/vendor.mobx.ts']
        files['src/mobx-store/index.ts'] = files['src/mobx-store/index.no-router.ts']
        files['src/mobx-store/store.d.ts'] = files['src/mobx-store/store.no-router.d.ts']

        Object.keys(files).forEach(fileName => {
          if (/entries|router|redux\-reducer/.test(fileName)) {
            delete files[fileName]
          }
        })
      }
      if (meta.router && meta.management === 'Redux') {
        files['src/index.tsx'] = files['src/entries/index.redux-router.tsx']
        files['src/app.tsx'] = files['src/entries/app.redux.tsx']
        files['src/vendor.ts'] = files['src/entries/vendor.redux-router.ts']
        Object.keys(files).forEach(fileName => {
          if (/entries|mobx\-store/.test(fileName)) {
            delete files[fileName]
          }
        })
      }
      if (meta.router && meta.management === 'Mobx') {
        files['src/index.tsx'] = files['src/entries/index.mobx-router.tsx']
        files['src/app.tsx'] = files['src/entries/app.mobx.tsx']
        files['src/vendor.ts'] = files['src/entries/vendor.redux-router.ts']
        Object.keys(files).forEach(fileName => {
          if (/entries|redux\-reducer/.test(fileName)) {
            delete files[fileName]
          }
        })
      }
      // 用 dls 必须支持 stylus
      // if (!meta.stylus) {
      //   files['webpack/style-rules.js'] = files['webpack/style-rules.no-stylus.js']
      //   delete files['src/global.d.ts']
      //   Object.keys(files).forEach(fileName => {
      //     if (/.styl$/.test(fileName)) {
      //       delete files[fileName]
      //     }
      //   })
      //   // 移除入口文件对 main.styl 的引用
      //   let indexFile = files['src/index.tsx'].contents.toString()
      //   const position = indexFile.toString().indexOf('\n'); // find position of new line element
      //   if (position != -1) {
      //     indexFile = indexFile.substr(position + 1)
      //     files['src/index.tsx'].contents = Buffer.from(indexFile)
      //   }
      // }
      delete files['webpack/style-rules.no-stylus.js']
      delete files['src/components/hello.disable.tsx']
      delete files['src/redux-reducer/index.no-router.ts']
      delete files['src/mobx-store/index.no-router.ts']
      delete files['src/mobx-store/store.no-router.d.ts']
      done()
    }).build(err => {
      rm(src)
      err ? reject(err) : resolve({ dest })
    })

    metalsmith.use((files, metalsmith, done) => {
      const meta = metalsmith.metadata()
      const pkgFile = files['package.json']
      // 替换模板内的内容，name, description, version等
      const pkg = {
        ...JSON.parse(pkgFile.contents.toString()),
        name: meta.projectName,
        version: meta.projectVersion,
        description: meta.projectDescription,
        author: meta.projectAuthor,
      }

      // 删除无用的依赖
      const devDependencies = pkg.devDependencies
      if (!meta.router) {
        delete devDependencies['react-router']
        delete devDependencies['react-router-dom']
        delete devDependencies['history']
        delete devDependencies['mobx-react-router']
        delete devDependencies['react-router-redux']
        delete devDependencies['@types/history']
        delete devDependencies['@types/react-router']
        delete devDependencies['@types/react-router-dom']
        delete devDependencies['@types/react-router-redux']
      }
      if (meta.management === 'Redux') {
        delete devDependencies['mobx']
        delete devDependencies['mobx-react']
        delete devDependencies['mobx-react-router']
      }
      if (meta.management === 'Mobx') {
        delete devDependencies['react-redux']
        delete devDependencies['react-router-redux']
        delete devDependencies['redux']
        delete devDependencies['redux-actions']
        delete devDependencies['@types/react-redux']
        delete devDependencies['@types/react-router-redux']
        delete devDependencies['@types/redux']
        delete devDependencies['@types/redux-actions']
      }
      if (meta.management === 'None') {
        delete devDependencies['react-redux']
        delete devDependencies['react-router-redux']
        delete devDependencies['redux']
        delete devDependencies['redux-actions']
        delete devDependencies['@types/react-redux']
        delete devDependencies['@types/react-router-redux']
        delete devDependencies['@types/redux']
        delete devDependencies['@types/redux-actions']
        delete devDependencies['mobx']
        delete devDependencies['mobx-react']
        delete devDependencies['mobx-react-router']
      }
      // if (!meta.stylus) {
      //   delete devDependencies['stylus']
      //   delete devDependencies['stylus-loader']
      // }

      files['package.json'].contents = Buffer.from(JSON.stringify(pkg, null, 2))
      delete files['yarn.lock']
      done()
    }).build(err => {
      rm(src)
      err ? reject(err) : resolve({ dest })
    })
  })
}
