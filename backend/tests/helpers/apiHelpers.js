const request = require('supertest')

class APITestHelper {
  constructor(baseURL) {
    this.baseURL = baseURL
    this.tokens = {}
  }

  // Authentication helpers
  async loginUser(credentials) {
    const response = await request(this.baseURL)
      .post('/login')
      .send(credentials)

    if (response.status === 200) {
      this.tokens.user = response.body.token
      return response.body
    }
    throw new Error('User login failed')
  }

  async loginAdmin(credentials) {
    const response = await request(this.baseURL)
      .post('/admin/login')
      .send(credentials)

    if (response.status === 200) {
      this.tokens.admin = response.body.token
      return response.body
    }
    throw new Error('Admin login failed')
  }

  async loginDispatch(credentials) {
    const response = await request(this.baseURL)
      .post('/dispatch/login')
      .send(credentials)

    if (response.status === 200) {
      this.tokens.dispatch = response.body.token
      return response.body
    }
    throw new Error('Dispatch login failed')
  }

  // Request helpers with authentication
  async authenticatedRequest(
    method,
    endpoint,
    data = null,
    tokenType = 'user'
  ) {
    const token = this.tokens[tokenType]
    if (!token) {
      throw new Error(`No ${tokenType} token available`)
    }

    let req = request(this.baseURL)
      [method](endpoint)
      .set('Authorization', `Bearer ${token}`)

    if (data) {
      req = req.send(data)
    }

    return req
  }

  async get(endpoint, tokenType = 'user') {
    return this.authenticatedRequest('get', endpoint, null, tokenType)
  }

  async post(endpoint, data, tokenType = 'user') {
    return this.authenticatedRequest('post', endpoint, data, tokenType)
  }

  async put(endpoint, data, tokenType = 'user') {
    return this.authenticatedRequest('put', endpoint, data, tokenType)
  }

  async delete(endpoint, tokenType = 'user') {
    return this.authenticatedRequest('delete', endpoint, null, tokenType)
  }

  // Cleanup
  clearTokens() {
    this.tokens = {}
  }
}

module.exports = { APITestHelper }
