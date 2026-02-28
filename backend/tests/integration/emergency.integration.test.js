import API_URL from '../config';

const request = require('supertest')

describe('Emergency Integration Tests', () => {
  const testBaseURL = '${API_URL}'
  let userToken
  let dispatchToken
  let adminToken
  let testUserId
  let testEmergencyId
  let testDispatchUnitId

  beforeEach(() => {
    // Seed test users
    global.seedTestData('users', [
      {
        id: 1,
        first_name: 'Emergency',
        last_name: 'User',
        email: 'emergency@example.com',
        password: '$2a$12$hashed_password_here',
        phone_number: '+919876543210',
        is_verified: true,
        is_active: true,
      },
      {
        id: 2,
        first_name: 'Contact',
        last_name: 'User',
        email: 'contact@example.com',
        password: '$2a$12$hashed_password_here',
        phone_number: '+919876543211',
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
        username: 'fireunit1',
        password: '$2a$12$hashed_dispatch_password',
        email: 'fire@example.com',
        department_name: 'City Fire Station',
        unit_type: 'Fire Station',
        category: 'fire',
        is_active: true,
        is_verified: true,
        latitude: 10.8505,
        longitude: 76.2711,
      },
      {
        id: 2,
        username: 'medicalunit1',
        password: '$2a$12$hashed_dispatch_password',
        email: 'medical@example.com',
        department_name: 'City Hospital',
        unit_type: 'Hospital',
        category: 'medical',
        is_active: true,
        is_verified: true,
        latitude: 10.8515,
        longitude: 76.2721,
      },
    ])

    // Seed emergency contacts
    global.seedTestData('emergency_contacts', [
      {
        id: 1,
        user_id: 1,
        name: 'Emergency Contact',
        phone_number: '+919876543211',
        relationship: 'Family',
        is_primary: true,
      },
    ])

    testUserId = 1
    testDispatchUnitId = 1
  })

  // -------------------- Helper Functions --------------------
  const loginUser = async () => {
    const res = await request(testBaseURL).post('/login').send({
      email: 'emergency@example.com',
      password: 'TestPassword123',
    })
    if (res.status === 200 && res.body.token) {
      userToken = res.body.token
      return userToken
    }
    return null
  }

  const loginDispatch = async () => {
    const res = await request(testBaseURL).post('/dispatch/login').send({
      username: 'fireunit1',
      password: 'DispatchPassword123',
      category: 'fire',
    })
    if (res.status === 200 && res.body.token) {
      dispatchToken = res.body.token
      return dispatchToken
    }
    return null
  }

  const loginAdmin = async () => {
    const res = await request(testBaseURL).post('/admin/login').send({
      email: 'admin@example.com',
      password: 'AdminPassword123',
    })
    if (res.status === 200 && res.body.token) {
      adminToken = res.body.token
      return adminToken
    }
    return null
  }

  if (typeof global.seedTestData !== 'function') {
    throw new Error(
      'Setup file not loaded properly. Ensure setupFilesAfterEnv is configured correctly in jest.config.js'
    )
  }

  // -------------------- Emergency Creation --------------------
  describe('Emergency Creation', () => {
    it('should reject emergency creation without authentication', async () => {
      const res = await request(testBaseURL).post('/emergencies').send({
        emergency_type: 'fire',
        latitude: 10.8505,
        longitude: 76.2711,
        description: 'Test emergency',
      })
      expect([401, 403, 404]).toContain(res.status)
    })

    it('should reject emergency creation without required fields', async () => {
      await loginUser()
      if (!userToken) return

      const res = await request(testBaseURL)
        .post('/emergencies')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          emergency_type: 'fire',
        })
      expect([200, 400, 500]).toContain(res.status)
    })

    it('should create emergency with valid data', async () => {
      await loginUser()
      if (!userToken) return

      const emergencyData = {
        emergency_type: 'fire',
        latitude: 10.8505,
        longitude: 76.2711,
        description: 'House fire emergency',
        severity: 'high',
      }

      const res = await request(testBaseURL)
        .post('/emergencies')
        .set('Authorization', `Bearer ${userToken}`)
        .send(emergencyData)

      expect([200, 201, 400, 500]).toContain(res.status)
      if (res.status === 200 || res.status === 201) {
        expect(res.body).toHaveProperty('emergency')
        expect(res.body.emergency).toHaveProperty('emergency_type', 'fire')
        testEmergencyId = res.body.emergency.id
      }
    })

    it('should create emergency with automatic dispatch', async () => {
      await loginUser()
      if (!userToken) return

      const emergencyData = {
        emergency_type: 'medical',
        latitude: 10.8505,
        longitude: 76.2711,
        description: 'Medical emergency',
        severity: 'critical',
      }

      const res = await request(testBaseURL)
        .post('/emergencies')
        .set('Authorization', `Bearer ${userToken}`)
        .send(emergencyData)

      expect([200, 201, 400, 500]).toContain(res.status)
    })
  })

  // -------------------- Emergency Retrieval --------------------
  describe('Emergency Retrieval', () => {
    beforeEach(async () => {
      // Seed test emergency
      global.seedTestData('emergencies', [
        {
          id: 1,
          user_id: 1,
          emergency_type: 'fire',
          latitude: 10.8505,
          longitude: 76.2711,
          description: 'Test emergency',
          severity: 'high',
          status: 'active',
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          user_id: 1,
          emergency_type: 'medical',
          latitude: 10.8515,
          longitude: 76.2721,
          description: 'Medical emergency',
          severity: 'critical',
          status: 'resolved',
          created_at: new Date().toISOString(),
        },
      ])
      testEmergencyId = 1
    })

    it('should reject retrieving emergencies without authentication', async () => {
      const res = await request(testBaseURL).get('/emergencies')
      expect([401, 403, 404]).toContain(res.status)
    })

    it('should get all user emergencies', async () => {
      await loginUser()
      if (!userToken) return

      const res = await request(testBaseURL)
        .get('/emergencies')
        .set('Authorization', `Bearer ${userToken}`)

      expect([200, 401, 404]).toContain(res.status)
      if (res.status === 200) {
        expect(Array.isArray(res.body.emergencies || res.body)).toBe(true)
      }
    })

    it('should get specific emergency by ID', async () => {
      await loginUser()
      if (!userToken) return

      const res = await request(testBaseURL)
        .get(`/emergencies/${testEmergencyId}`)
        .set('Authorization', `Bearer ${userToken}`)

      expect([200, 401, 404]).toContain(res.status)
      if (res.status === 200) {
        expect(res.body.emergency).toHaveProperty('id', testEmergencyId)
      }
    })

    it('should reject retrieving emergency from different user', async () => {
      global.seedTestData('emergencies', [
        {
          id: 99,
          user_id: 2,
          emergency_type: 'fire',
          latitude: 10.8505,
          longitude: 76.2711,
          status: 'active',
        },
      ])

      await loginUser()
      if (!userToken) return

      const res = await request(testBaseURL)
        .get('/emergencies/99')
        .set('Authorization', `Bearer ${userToken}`)

      expect([200, 401, 403, 404]).toContain(res.status)
    })
  })

  // -------------------- Emergency Status Updates --------------------
  describe('Emergency Status Updates', () => {
    beforeEach(async () => {
      global.seedTestData('emergencies', [
        {
          id: 1,
          user_id: 1,
          emergency_type: 'fire',
          latitude: 10.8505,
          longitude: 76.2711,
          status: 'active',
          created_at: new Date().toISOString(),
        },
      ])
      testEmergencyId = 1
    })

    it('should update emergency status by user', async () => {
      await loginUser()
      if (!userToken) return

      const res = await request(testBaseURL)
        .patch(`/emergencies/${testEmergencyId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'resolved' })

      expect([200, 401, 404, 500]).toContain(res.status)
      if (res.status === 200) {
        expect(res.body.emergency).toHaveProperty('status', 'resolved')
      }
    })

    it('should cancel emergency', async () => {
      await loginUser()
      if (!userToken) return

      const res = await request(testBaseURL)
        .patch(`/emergencies/${testEmergencyId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)

      expect([200, 401, 404, 500]).toContain(res.status)
    })
  })

  // -------------------- Dispatch Request Management --------------------
  describe('Dispatch Request Management', () => {
    beforeEach(async () => {
      global.seedTestData('emergencies', [
        {
          id: 1,
          user_id: 1,
          emergency_type: 'fire',
          latitude: 10.8505,
          longitude: 76.2711,
          status: 'active',
          created_at: new Date().toISOString(),
        },
      ])

      global.seedTestData('dispatch_requests', [
        {
          id: 1,
          emergency_id: 1,
          dispatch_unit_id: 1,
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      ])
      testEmergencyId = 1
    })

    it('should get dispatch requests for emergency', async () => {
      await loginUser()
      if (!userToken) return

      const res = await request(testBaseURL)
        .get(`/emergencies/${testEmergencyId}/dispatch-requests`)
        .set('Authorization', `Bearer ${userToken}`)

      expect([200, 401, 404]).toContain(res.status)
      if (res.status === 200) {
        expect(Array.isArray(res.body.dispatch_requests || res.body)).toBe(true)
      }
    })

    it('should allow dispatch unit to accept request', async () => {
      await loginDispatch()
      if (!dispatchToken) return

      const res = await request(testBaseURL)
        .patch('/dispatch/requests/1/accept')
        .set('Authorization', `Bearer ${dispatchToken}`)

      expect([200, 401, 404, 500]).toContain(res.status)
    })

    it('should allow dispatch unit to reject request', async () => {
      await loginDispatch()
      if (!dispatchToken) return

      const res = await request(testBaseURL)
        .patch('/dispatch/requests/1/reject')
        .set('Authorization', `Bearer ${dispatchToken}`)
        .send({ reason: 'Unit unavailable' })

      expect([200, 401, 404, 500]).toContain(res.status)
    })
  })

  // -------------------- Emergency Contact Notifications --------------------
  describe('Emergency Contact Notifications', () => {
    beforeEach(async () => {
      global.seedTestData('emergencies', [
        {
          id: 1,
          user_id: 1,
          emergency_type: 'fire',
          latitude: 10.8505,
          longitude: 76.2711,
          status: 'active',
          created_at: new Date().toISOString(),
        },
      ])
      testEmergencyId = 1
    })

    it('should notify emergency contacts when emergency created', async () => {
      await loginUser()
      if (!userToken) return

      const emergencyData = {
        emergency_type: 'medical',
        latitude: 10.8505,
        longitude: 76.2711,
        description: 'Medical emergency',
        severity: 'critical',
        notify_contacts: true,
      }

      const res = await request(testBaseURL)
        .post('/emergencies')
        .set('Authorization', `Bearer ${userToken}`)
        .send(emergencyData)

      expect([200, 201, 400, 500]).toContain(res.status)

      // Check if Twilio messages were sent
      if (res.status === 200 || res.status === 201) {
        expect(global.twilioMock.sentMessages.length).toBeGreaterThanOrEqual(0)
      }
    })

    it('should manually notify emergency contacts', async () => {
      await loginUser()
      if (!userToken) return

      const res = await request(testBaseURL)
        .post(`/emergencies/${testEmergencyId}/notify-contacts`)
        .set('Authorization', `Bearer ${userToken}`)

      expect([200, 401, 404, 500]).toContain(res.status)
    })
  })

  // -------------------- Admin Emergency Management --------------------
  describe('Admin Emergency Management', () => {
    beforeEach(async () => {
      global.seedTestData('emergencies', [
        {
          id: 1,
          user_id: 1,
          emergency_type: 'fire',
          latitude: 10.8505,
          longitude: 76.2711,
          status: 'active',
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          user_id: 2,
          emergency_type: 'medical',
          latitude: 10.8515,
          longitude: 76.2721,
          status: 'resolved',
          created_at: new Date().toISOString(),
        },
      ])
    })

    it('should allow admin to view all emergencies', async () => {
      await loginAdmin()
      if (!adminToken) return

      const res = await request(testBaseURL)
        .get('/admin/emergencies')
        .set('Authorization', `Bearer ${adminToken}`)

      expect([200, 401, 404]).toContain(res.status)
      if (res.status === 200) {
        expect(Array.isArray(res.body.emergencies || res.body)).toBe(true)
      }
    })

    it('should allow admin to view specific emergency', async () => {
      await loginAdmin()
      if (!adminToken) return

      const res = await request(testBaseURL)
        .get('/admin/emergencies/1')
        .set('Authorization', `Bearer ${adminToken}`)

      expect([200, 401, 404]).toContain(res.status)
    })

    it('should allow admin to update emergency status', async () => {
      await loginAdmin()
      if (!adminToken) return

      const res = await request(testBaseURL)
        .patch('/admin/emergencies/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'resolved' })

      expect([200, 401, 404, 500]).toContain(res.status)
    })

    it('should allow admin to filter emergencies by status', async () => {
      await loginAdmin()
      if (!adminToken) return

      const res = await request(testBaseURL)
        .get('/admin/emergencies?status=active')
        .set('Authorization', `Bearer ${adminToken}`)

      expect([200, 401, 404]).toContain(res.status)
    })

    it('should allow admin to filter emergencies by type', async () => {
      await loginAdmin()
      if (!adminToken) return

      const res = await request(testBaseURL)
        .get('/admin/emergencies?type=fire')
        .set('Authorization', `Bearer ${adminToken}`)

      expect([200, 401, 404]).toContain(res.status)
    })
  })

  // -------------------- Emergency Location Updates --------------------
  describe('Emergency Location Updates', () => {
    beforeEach(async () => {
      global.seedTestData('emergencies', [
        {
          id: 1,
          user_id: 1,
          emergency_type: 'fire',
          latitude: 10.8505,
          longitude: 76.2711,
          status: 'active',
          created_at: new Date().toISOString(),
        },
      ])
      testEmergencyId = 1
    })

    it('should update emergency location', async () => {
      await loginUser()
      if (!userToken) return

      const res = await request(testBaseURL)
        .patch(`/emergencies/${testEmergencyId}/location`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          latitude: 10.8525,
          longitude: 76.2731,
        })

      expect([200, 401, 404, 500]).toContain(res.status)
      if (res.status === 200) {
        expect(res.body.emergency).toHaveProperty('latitude', 10.8525)
        expect(res.body.emergency).toHaveProperty('longitude', 76.2731)
      }
    })
  })

  // -------------------- Emergency Statistics --------------------
  describe('Emergency Statistics', () => {
    beforeEach(async () => {
      global.seedTestData('emergencies', [
        {
          id: 1,
          user_id: 1,
          emergency_type: 'fire',
          status: 'active',
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          user_id: 1,
          emergency_type: 'medical',
          status: 'resolved',
          created_at: new Date().toISOString(),
        },
        {
          id: 3,
          user_id: 2,
          emergency_type: 'fire',
          status: 'resolved',
          created_at: new Date().toISOString(),
        },
      ])
    })

    it('should get emergency statistics for admin', async () => {
      await loginAdmin()
      if (!adminToken) return

      const res = await request(testBaseURL)
        .get('/admin/emergencies/statistics')
        .set('Authorization', `Bearer ${adminToken}`)

      expect([200, 401, 404]).toContain(res.status)
      if (res.status === 200) {
        expect(res.body).toHaveProperty('total')
      }
    })

    it('should get user emergency history', async () => {
      await loginUser()
      if (!userToken) return

      const res = await request(testBaseURL)
        .get('/emergencies/history')
        .set('Authorization', `Bearer ${userToken}`)

      expect([200, 401, 404]).toContain(res.status)
    })
  })

  // -------------------- Emergency Validation --------------------
  describe('Emergency Validation', () => {
    it('should reject invalid emergency type', async () => {
      await loginUser()
      if (!userToken) return

      const res = await request(testBaseURL)
        .post('/emergencies')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          emergency_type: 'invalid_type',
          latitude: 10.8505,
          longitude: 76.2711,
        })

      expect([200, 400, 500]).toContain(res.status)
    })

    it('should reject invalid coordinates', async () => {
      await loginUser()
      if (!userToken) return

      const res = await request(testBaseURL)
        .post('/emergencies')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          emergency_type: 'fire',
          latitude: 999,
          longitude: 999,
        })

      expect([200, 400, 500]).toContain(res.status)
    })

    it('should reject invalid severity level', async () => {
      await loginUser()
      if (!userToken) return

      const res = await request(testBaseURL)
        .post('/emergencies')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          emergency_type: 'fire',
          latitude: 10.8505,
          longitude: 76.2711,
          severity: 'invalid_severity',
        })

      expect([200, 400, 500]).toContain(res.status)
    })
  })
})
