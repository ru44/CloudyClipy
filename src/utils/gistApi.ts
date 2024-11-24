import axios from "axios"

export class GistError extends Error {
  code: any
  constructor(code: any, message: any) {
    super(message)
    this.code = code
  }
}

export class GistApi {
  token: any
  baseUrl: string
  headers: { Authorization: string; "Content-Type": string }
  constructor(token: any) {
    this.token = token
    this.baseUrl = "https://api.github.com"
    this.headers = {
      Authorization: `token ${token}`,
      "Content-Type": "application/json",
    }
  }

  async request(method: any, endpoint: any, params = {}, data: any = null) {
    try {
      const url = `${this.baseUrl}${endpoint}`
      const options = { method, headers: this.headers, params, data }
      const response = await axios(url, options)
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new GistError(error.response.status, error.response.data.message)
      }
      throw new GistError(-1, (error as Error).message)
    }
  }

  listGists() {
    return this.request("GET", "/gists")
  }

  getGist(id: any) {
    return this.request("GET", `/gists/${id}`)
  }

  createGist(description: string, files: { "<clipboard>": { content: string } }, isPublic = false) {
    const data = { description, public: isPublic, files }
    return this.request("POST", "/gists", {}, data)
  }

  editGist(id: any, description: string, files: { [x: number]: { content: any } }) {
    const data = { description, files }
    return this.request("PATCH", `/gists/${id}`, {}, data)
  }

  deleteGist(id: any) {
    return this.request("DELETE", `/gists/${id}`)
  }
}