// tests/unit/auth.test.js
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

describe('Authentication Unit Tests', () => {
  let mockSupabase
  let mockTwilioClient

  beforeEach(() => {
    // Mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    }

    // Mock Twilio client
    mockTwilioClient = {
      messages: {
        create: jest.fn().mockResolvedValue({ sid: 'test-sid' }),
      },
    }

    // Clear JWT secret for testing
    process.env.JWT_SECRET = 'test-secret-key'
  })

  describe('Password Hashing', () => {
    it('should hash passwords correctly', async () => {
      const password = 'TestPassword123'
      const hashedPassword = await bcrypt.hash(password, 10)

      expect(hashedPassword).toBeDefined()
      expect(hashedPassword).not.toBe(password)
      expect(hashedPassword.length).toBeGreaterThan(50)
    })

    it('should verify correct passwords', async () => {
      const password = 'TestPassword123'
      const hashedPassword = await bcrypt.hash(password, 10)

      const isValid = await bcrypt.compare(password, hashedPassword)
      expect(isValid).toBe(true)
    })

    it('should reject incorrect passwords', async () => {
      const password = 'TestPassword123'
      const wrongPassword = 'WrongPassword456'
      const hashedPassword = await bcrypt.hash(password, 10)

      const isValid = await bcrypt.compare(wrongPassword, hashedPassword)
      expect(isValid).toBe(false)
    })
  })

  describe('JWT Token Generation', () => {
    it('should generate valid JWT tokens', () => {
      const payload = {
        user_id: '123',
        email: 'test@example.com',
      }

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '7d',
      })

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3)
    })

    it('should decode JWT tokens correctly', () => {
      const payload = {
        user_id: '123',
        email: 'test@example.com',
      }

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '7d',
      })

      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      expect(decoded.user_id).toBe(payload.user_id)
      expect(decoded.email).toBe(payload.email)
    })

    it('should reject expired tokens', (done) => {
      const payload = { user_id: '123' }

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '1ms',
      })

      setTimeout(() => {
        try {
          jwt.verify(token, process.env.JWT_SECRET)
          done(new Error('Should have thrown an error'))
        } catch (error) {
          expect(error.name).toBe('TokenExpiredError')
          done()
        }
      }, 10)
    })

    it('should reject tokens with wrong secret', () => {
      const payload = { user_id: '123' }
      const token = jwt.sign(payload, 'wrong-secret')

      expect(() => {
        jwt.verify(token, process.env.JWT_SECRET)
      }).toThrow()
    })
  })

  describe('OTP Generation', () => {
    it('should generate 6-digit OTP', () => {
      const otp = Math.floor(100000 + Math.random() * 900000).toString()

      expect(otp).toHaveLength(6)
      expect(parseInt(otp)).toBeGreaterThanOrEqual(100000)
      expect(parseInt(otp)).toBeLessThanOrEqual(999999)
    })

    it('should generate unique OTPs', () => {
      const otps = new Set()

      for (let i = 0; i < 1000; i++) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString()
        otps.add(otp)
      }

      // At least 95% should be unique
      expect(otps.size).toBeGreaterThan(950)
    })
  })

  describe('Phone Number Validation', () => {
    it('should validate Indian phone numbers', () => {
      const validNumbers = ['+919876543210', '919876543210', '9876543210']

      validNumbers.forEach((number) => {
        const cleaned = number.replace(/\D/g, '')
        let formatted

        if (cleaned.startsWith('91') && cleaned.length === 12) {
          formatted = '+' + cleaned
        } else if (cleaned.length === 10) {
          formatted = '+91' + cleaned
        }

        expect(formatted).toBeDefined()
        expect(formatted).toMatch(/^\+91\d{10}$/)
      })
    })

    it('should reject invalid phone numbers', () => {
      const invalidNumbers = ['123456', '+1234567890', 'abcdefghij', '']

      invalidNumbers.forEach((number) => {
        const cleaned = number.replace(/\D/g, '')
        const isValid = /^(\+91|91)?[6-9]\d{9}$/.test(number)
        expect(isValid).toBe(false)
      })
    })
  })

  describe('Email Validation', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.in',
        'admin123@company.org',
      ]

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

      validEmails.forEach((email) => {
        expect(emailRegex.test(email)).toBe(true)
      })
    })

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid.email',
        '@example.com',
        'user@',
        'user @example.com',
        '',
      ]

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

      invalidEmails.forEach((email) => {
        expect(emailRegex.test(email)).toBe(false)
      })
    })
  })

  describe('Username Validation (Dispatch)', () => {
    const validateUsername = (username) => {
      const regex = /^(?=.*[a-zA-Z])[a-zA-Z0-9_-]{8,50}$/
      return regex.test(username) && username.length <= 50
    }

    it('should accept valid usernames', () => {
      const validUsernames = [
        'dispatch123',
        'police_station_1',
        'fire-dept-mumbai',
        'hospital_emergency',
      ]

      validUsernames.forEach((username) => {
        expect(validateUsername(username)).toBe(true)
      })
    })

    it('should reject invalid usernames', () => {
      const invalidUsernames = [
        'short', // Too short
        '12345678', // No letters
        'a'.repeat(51), // Too long
        'invalid username', // Contains space
        'user@name', // Invalid character
      ]

      invalidUsernames.forEach((username) => {
        expect(validateUsername(username)).toBe(false)
      })
    })
  })

  describe('Pincode Validation', () => {
    const validatePincode = (pincode) => {
      const regex = /^\d{6}$/
      return regex.test(pincode)
    }

    it('should validate Indian pincodes', () => {
      const validPincodes = ['110001', '400001', '560001']

      validPincodes.forEach((pincode) => {
        expect(validatePincode(pincode)).toBe(true)
      })
    })

    it('should reject invalid pincodes', () => {
      const invalidPincodes = ['12345', '1234567', 'abcdef', '']

      invalidPincodes.forEach((pincode) => {
        expect(validatePincode(pincode)).toBe(false)
      })
    })
  })

  describe('Token Expiry Management', () => {
    it('should set correct expiry for user tokens', () => {
      const payload = { user_id: '123' }
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '30d',
      })

      const decoded = jwt.decode(token)
      const expiryDate = new Date(decoded.exp * 1000)
      const now = new Date()
      const daysDiff = (expiryDate - now) / (1000 * 60 * 60 * 24)

      expect(daysDiff).toBeGreaterThan(29)
      expect(daysDiff).toBeLessThan(31)
    })

    it('should set correct expiry for admin tokens', () => {
      const payload = { user_id: '123', userType: 'admin' }
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '8h',
      })

      const decoded = jwt.decode(token)
      const expiryDate = new Date(decoded.exp * 1000)
      const now = new Date()
      const hoursDiff = (expiryDate - now) / (1000 * 60 * 60)

      expect(hoursDiff).toBeGreaterThan(7.9)
      expect(hoursDiff).toBeLessThan(8.1)
    })
  })
})
