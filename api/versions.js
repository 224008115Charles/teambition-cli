const config = require('../config')
const chalk = require('chalk')
const axios = require('axios')

export async function getVersions(libName, registryUrl) {
  if (!libName) {
    console.error('缺少仓库名称')
    return await []
  }

  return await axios
    .get(`${ registryUrl || config.TAOBAO_REGISTRY }/${ libName }`)
    .map((response) => Object.keys(response.versions))
    .catch((err) => console.error(chalk.red(err)))
}

export async function getLatestStableVersion(libName) {
  if (!libName) {
    console.error('缺少仓库名称')
    return await []
  }

  const versionRegExp = new RegExp(/d\.d\.d\(\-(beta|rc)\.d)+/)

  return await getVersions().map((versions) => {
    if (!versions) return null
    return versions.find((version) => versionRegExp.test(version)) || versions[0]
  })
}
