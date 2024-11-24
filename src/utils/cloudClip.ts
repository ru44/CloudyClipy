import { resolve as _resolve } from "path"
import { existsSync, readFileSync, writeFileSync } from "fs"
import clipboardy from "clipboardy"
import { GistApi } from "./gistApi"

export class CloudClip {
  configFile: string
  config: any
  api: GistApi
  constructor(configFile: string) {
    this.configFile = _resolve(configFile)
    this.config = this.readConfig()
    this.api = new GistApi(this.config.token)
  }

  readConfig() {
    if (!existsSync(this.configFile)) {
      return {}
    }
    return JSON.parse(readFileSync(this.configFile, "utf-8"))
  }

  saveConfig(config: any) {
    writeFileSync(this.configFile, JSON.stringify(config, null, 2))
  }

  setToken(token: any) {
    this.config.token = token
    this.api = new GistApi(token)
    this.saveConfig(this.config)
  }

  setGistId(gistId: null) {
    this.config.gistId = gistId
    this.saveConfig(this.config)
  }

  async init(token: any, gistId = null) {
    this.setToken(token)
    if (!gistId) {
      const placeholder = {
        "<clipboard>": { content: "Your clipboard in the cloud." },
      }
      const gist = await this.api.createGist("<Clipboard>", placeholder)
      gistId = gist.id
      console.log(`New Gist created with ID: ${gistId}`)
    }
    this.setGistId(gistId)
    console.log(`Configuration saved in: ${this.configFile}`)
  }

  async list() {
    if (!this.config.gistId) {
      throw new Error("Gist ID is not configured. Use `--init` first.")
    }
    const gist = await this.api.getGist(this.config.gistId)
    console.log(`Gist ID: ${gist.id}`)
    console.log(`Description: ${gist.description}`)
    Object.entries(gist.files).forEach(([name, details]) => {
      const fileDetails = details as { size: number }
      console.log(`- ${name} (${fileDetails.size} bytes)`)
    })
  }

  async copy(name: any, content: unknown) {
    if (!this.config.gistId) {
      throw new Error("Gist ID is not configured. Use `--init` first.")
    }
    const files = { [name]: { content } }
    await this.api.editGist(this.config.gistId, "<Clipboard>", files)
    console.log("Content copied to cloud clipboard.")
  }

  async paste(name: string | number) {
    if (!this.config.gistId) {
      throw new Error("Gist ID is not configured. Use `--init` first.")
    }
    const gist = await this.api.getGist(this.config.gistId)
    const file = gist.files[name]
    if (!file) {
      throw new Error(`File "${name}" not found in the Gist.`)
    }
    clipboardy.writeSync(file.content)
    console.log("Content pasted to clipboard.")
  }

  async clear() {
    if (!this.config.gistId) {
      throw new Error("Gist ID is not configured. Use `--init` first.")
    }
    const gist = await this.api.getGist(this.config.gistId)
    const files = Object.keys(gist.files).reduce((acc: { [key: string]: any }, name) => {
      acc[name] = null
      return acc
    }, {})
    await this.api.editGist(this.config.gistId, "<Clipboard>", files)
    console.log("Cloud clipboard cleared.")
  }
}