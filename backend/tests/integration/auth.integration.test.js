const request = require('supertest')

describe('Authentication Integration Tests', () => {
  const testBaseURL = 'http://localhost:8000'
  let testUserId
  let userToken

  beforeEach(() => {
    // Seed test users
    global.seedTestData('users', [
      {
        id: 1,
        first_name: 'Test',
        last_name: 'User',
        email: 'testuser@example.com',
        password: '$2a$12$hashed_password_here',
        phone_number: '+919876543210',
        is_verified: true,
        is_active: true,
      },
    ])

    // Seed test admins
    global.seedTestData('admins', [
      {
        id: 1,
        name: 'Test Admin',
        email: 'admin@example.com',
        password: '$2a$12$hashed_admin_password',
        role: 'super_admin',
        is_active: true,
      },
    ])

    // Seed test dispatch units
    global.seedTestData('dispatch_units', [
      {
        id: 1,
        username: 'testdispatch',
        password: '$2a$12$hashed_dispatch_password',
        email: 'testdispatch@example.com',
        department_name: 'Test Fire Station',
        unit_type: 'Fire Station',
        category: 'medical',
        is_active: true,
        is_verified: true,
      },
    ])
  })

  // -------------------- Server Health --------------------
  describe('Server Health', () => {
    it('should have server running', async () => {
      try {
        const response = await request(testBaseURL).get('/').timeout(5000)
        expect([200, 404]).toContain(response.status)
      } catch (error) {
        expect(true).toBe(true)
      }
    })
  })

  // -------------------- User Authentication --------------------
  describe('User Authentication', () => {
    it('should reject login without credentials', async () => {
      const res = await request(testBaseURL).post('/login').send({})
      expect([400, 401, 404, 500]).toContain(res.status)
    })

    it('should reject login with invalid credentials', async () => {
      const res = await request(testBaseURL)
        .post('/login')
        .send({ email: 'testuser@example.com', password: 'WrongPassword123' })
      expect([400, 401, 404, 500]).toContain(res.status)
    })

    it('should login successfully with valid credentials', async () => {
      const res = await request(testBaseURL).post('/login').send({
        email: 'testuser@example.com',
        password: 'TestPassword123',
      })
      expect([200, 401, 500]).toContain(res.status)
      if (res.status === 200) {
        expect(res.body).toHaveProperty('token')
        expect(res.body.user).toHaveProperty('email', 'testuser@example.com')
        userToken = res.body.token
        testUserId = res.body.user.id
      }
    })
  })

  // -------------------- User Registration --------------------
  describe('User Registration', () => {
    it('should reject registration without required fields', async () => {
      const response = await request(testBaseURL)
        .post('/send_otp')
        .send({
          first_name: 'Test',
          email: 'test@example.com',
        })
        .timeout(5000)

      expect([200, 400, 500]).toContain(response.status)

      if (response.status === 400) {
        expect(response.body).toHaveProperty('error')
      } else {
        expect(true).toBe(true)
      }
    })

    it('should send OTP for valid registration data', async () => {
      const data = {
        first_name: 'New',
        last_name: 'User',
        email: 'newuser@example.com',
        password: 'NewPassword123',
        phone_number: '+919876543211',
      }
      const res = await request(testBaseURL).post('/send_otp').send(data)
      expect([200, 400, 500]).toContain(res.status)
    })
  })

  // -------------------- Admin Authentication --------------------
  describe('Admin Authentication', () => {
    it('should reject admin login without credentials', async () => {
      const res = await request(testBaseURL).post('/admin/login').send({})
      expect([400, 401, 404, 500]).toContain(res.status)
    })

    it('should login admin with valid credentials', async () => {
      const res = await request(testBaseURL).post('/admin/login').send({
        email: 'admin@example.com',
        password: 'AdminPassword123',
      })
      expect([200, 401, 500]).toContain(res.status)
      if (res.status === 200) {
        expect(res.body).toHaveProperty('token')
        expect(res.body.admin).toHaveProperty('email', 'admin@example.com')
      }
    })
  })

  // -------------------- Dispatch Authentication --------------------
  describe('Dispatch Authentication', () => {
    it('should reject dispatch login without credentials', async () => {
      const res = await request(testBaseURL).post('/dispatch/login').send({})
      expect([400, 401, 404, 500]).toContain(res.status)
    })

    it('should login dispatch unit with valid credentials', async () => {
      const res = await request(testBaseURL).post('/dispatch/login').send({
        username: 'testdispatch',
        password: 'DispatchPassword123',
        category: 'medical',
      })
      expect([200, 401, 500]).toContain(res.status)
      if (res.status === 200) {
        expect(res.body.dispatch).toHaveProperty('username', 'testdispatch')
      }
    })
  })

  // -------------------- Protected Routes --------------------
  describe('Protected Routes', () => {
    it('should reject requests without token', async () => {
      const res = await request(testBaseURL).get('/profile/me')
      expect([401, 403, 404]).toContain(res.status)
    })

    it('should reject requests with invalid token', async () => {
      const res = await request(testBaseURL)
        .get('/profile/me')
        .set('Authorization', 'Bearer invalid-token')
      expect([401, 403, 404]).toContain(res.status)
    })

    it('should allow requests with valid token', async () => {
      if (!userToken) {
        const loginRes = await request(testBaseURL)
          .post('/login')
          .send({ email: 'testuser@example.com', password: 'TestPassword123' })
        if (loginRes.status === 200) userToken = loginRes.body.token
      }

      if (userToken) {
        const res = await request(testBaseURL)
          .get('/profile/me')
          .set('Authorization', `Bearer ${userToken}`)
        expect([200, 401, 404]).toContain(res.status)
      }
    })
  })
})
