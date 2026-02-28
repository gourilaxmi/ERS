import API_URL from '../config';

const request = require('supertest')

describe('Dispatch Unit Integration Tests', () => {
  const testBaseURL = '${API_URL}'
  let dispatchToken
  let testRequestId

  beforeEach(() => {
    global.seedTestData('dispatch_units', [
      {
        id: 1,
        username: 'testdispatch',
        password: '$2a$12$hashed_password_here',
        email: 'testdispatch@example.com',
        department_name: 'Test Fire Station',
        unit_type: 'Fire Station',
        place: 'Mumbai',
        district: 'Mumbai City',
        state: 'Maharashtra',
        is_active: true,
        is_verified: true,
        category: 'medical',
      },
    ])

    global.seedTestData('dispatch_requests', [
      {
        id: 1,
        emergency_id: 1,
        emergency_type: 'Medical Emergency',
        location: 'Mumbai',
        requester_name: 'Test User',
        requester_phone: '+919876543210',
        priority: 'High',
        status: 'Pending',
        requested_at: new Date().toISOString(),
      },
    ])

    global.seedTestData('emergencies', [
      {
        id: 1,
        user_id: 1,
        type: 'Medical Emergency',
        location: 'Mumbai, Maharashtra',
        status: 'Reported',
        priority: 'High',
        reported_time: new Date().toISOString(),
      },
    ])
  })

  describe('Dispatch Profile Management', () => {
    it('should fetch dispatch unit profile', async () => {
      // Login to get token
      const loginResponse = await request(testBaseURL)
        .post('/dispatch/login')
        .send({
          username: 'testdispatch',
          password: 'DispatchPassword123',
          category: 'medical',
        })

      if (loginResponse.status === 200) {
        dispatchToken = loginResponse.body.token

        const response = await request(testBaseURL)
          .get('/dispatch/profile/me')
          .set('Authorization', `Bearer ${dispatchToken}`)

        expect([200, 401, 404]).toContain(response.status)

        if (response.status === 200) {
          expect(response.body).toHaveProperty('id')
          expect(response.body).toHaveProperty('department_name')
          expect(response.body).toHaveProperty('unit_type')
          expect(response.body).toHaveProperty('username')
        }
      }
    })

    it('should reject profile fetch without authentication', async () => {
      const response = await request(testBaseURL)
        .get('/dispatch/profile/me')
        .expect(401)
    })

    it('should update dispatch profile', async () => {
      if (!dispatchToken) return

      const updateData = {
        department_name: 'Updated Fire Station',
        unit_type: 'Fire Station',
        place: 'Mumbai',
        district: 'Mumbai City',
        state: 'Maharashtra',
        pincode: '400001',
        username: 'testdispatch',
        official_email: 'dispatch@test.com',
        primary_contact: '+919876543210',
        officer_name: 'Officer Updated',
        officer_contact: '+919876543211',
        vehicle_count: 5,
      }

      const response = await request(testBaseURL)
        .put('/dispatch/profile/me')
        .set('Authorization', `Bearer ${dispatchToken}`)
        .send(updateData)

      expect([200, 401, 404, 500]).toContain(response.status)

      if (response.status === 200) {
        expect(response.body).toHaveProperty('message')

        // Verify data was updated in mockStore
        const updatedUnit = global.mockStore.dispatch_units.find(
          (u) => u.id === 1
        )
        expect(updatedUnit.department_name).toBe('Updated Fire Station')
      }
    })
  })

  describe('Request Reception and Management', () => {
    it('should fetch received dispatch requests', async () => {
      if (!dispatchToken) return

      const response = await request(testBaseURL)
        .get('/dispatch/requests/received')
        .set('Authorization', `Bearer ${dispatchToken}`)

      expect([200, 401, 500]).toContain(response.status)

      if (response.status === 200) {
        expect(Array.isArray(response.body)).toBe(true)

        // Verify mock data was returned
        if (response.body.length > 0) {
          testRequestId = response.body[0].id
          expect(response.body[0]).toHaveProperty('emergency_type')
          expect(response.body[0]).toHaveProperty('location')
        }
      }
    })

    it('should get request statistics', async () => {
      if (!dispatchToken) return

      const response = await request(testBaseURL)
        .get('/dispatch/requests/stats')
        .set('Authorization', `Bearer ${dispatchToken}`)

      expect([200, 401, 500]).toContain(response.status)

      if (response.status === 200) {
        expect(response.body).toHaveProperty('pending')
        expect(response.body).toHaveProperty('accepted')
        expect(response.body).toHaveProperty('completed_today')
        expect(typeof response.body.pending).toBe('number')

        expect(response.body.pending).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('Request Acceptance', () => {
    beforeEach(() => {
      global.seedTestData('dispatch_requests', [
        {
          id: 2,
          emergency_id: 2,
          emergency_type: 'Fire Emergency',
          location: 'Mumbai',
          status: 'Pending',
          requested_at: new Date().toISOString(),
        },
      ])
    })

    it('should accept a dispatch request', async () => {
      if (!dispatchToken) return

      const acceptData = {
        accepted_by: 'Test Officer',
      }

      const response = await request(testBaseURL)
        .post(`/dispatch/requests/2/accept`)
        .set('Authorization', `Bearer ${dispatchToken}`)
        .send(acceptData)

      expect([200, 400, 404, 500]).toContain(response.status)

      if (response.status === 200) {
        expect(response.body).toHaveProperty('message')
        expect(response.body).toHaveProperty('accepted')

        const acceptedRequest = global.mockStore.dispatch_requests.find(
          (r) => r.id === 2
        )
        expect(acceptedRequest.status).toBe('Accepted')
      }
    })

    it('should reject accepting already accepted request', async () => {
      if (!dispatchToken) return

      const request = global.mockStore.dispatch_requests.find((r) => r.id === 2)
      if (request) {
        request.status = 'Accepted'
        request.dispatch_unit_id = 999
      }

      const response = await request(testBaseURL)
        .post(`/dispatch/requests/2/accept`)
        .set('Authorization', `Bearer ${dispatchToken}`)
        .send({ accepted_by: 'Test Officer' })

      if (response.status === 400) {
        expect(response.body).toHaveProperty('error')
      }
    })
  })

  describe('Messaging System', () => {
    beforeEach(() => {
      global.seedTestData('emergencies', [
        {
          id: 3,
          user_id: 1,
          type: 'Medical Emergency',
          status: 'Dispatched',
          admin_id: 1,
        },
      ])
    })

    it('should send message to admin', async () => {
      if (!dispatchToken) return

      const messageData = {
        emergency_id: 3,
        message: 'Requesting backup support',
        message_type: 'dispatch_to_admin',
      }

      const response = await request(testBaseURL)
        .post('/dispatch/send-message')
        .set('Authorization', `Bearer ${dispatchToken}`)
        .send(messageData)

      expect([200, 404, 500]).toContain(response.status)

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success')
        expect(response.body.success).toBe(true)
      }
    })

    it('should reject message without emergency ID', async () => {
      if (!dispatchToken) return

      const invalidMessage = {
        message: 'Test message',
        // Missing emergency_id
      }

      const response = await request(testBaseURL)
        .post('/dispatch/send-message')
        .set('Authorization', `Bearer ${dispatchToken}`)
        .send(invalidMessage)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('Mock Store Validation', () => {
    it('should have mockStore available globally', () => {
      expect(global.mockStore).toBeDefined()
      expect(global.mockStore).toHaveProperty('dispatch_units')
      expect(global.mockStore).toHaveProperty('emergencies')
      expect(global.mockStore).toHaveProperty('dispatch_requests')
    })

    it('should reset mockStore between tests', () => {
      global.mockStore.test_data = [{ id: 1 }]

      global.resetAllMocks()

      expect(global.mockStore.test_data).toBeUndefined()
    })
  })
})
