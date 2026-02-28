const dotenv = require('dotenv')
const path = require('path')
const bcrypt = require('bcryptjs')

// ============================================================
// ENVIRONMENT SETUP
// ============================================================
dotenv.config({ path: path.join(__dirname, '..', '.env.test') })

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-secret-key-for-testing-only'
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters-long!'
process.env.PORT = '8000'

// ============================================================
// GLOBAL MOCK STORE - ADD ALL REQUIRED TABLES
// ============================================================
const mockStore = {
  users: [],
  admins: [],
  dispatchers: [],
  dispatch_units: [],
  emergencies: [],
  dispatch_requests: [],
  dispatchRequests: [],
  emergency_contacts: [],
  messages: [],
  services: [],
}

// ============================================================
// SUPABASE MOCK
// ============================================================
class EnhancedSupabaseMock {
  constructor() {
    this.currentTable = null
    this.currentOperation = null
    this.filters = {}
    this.isSingle = false
  }

  from(table) {
    this.currentTable = table
    this.filters = {}
    this.isSingle = false
    return this
  }

  select(columns = '*') {
    this.currentOperation = 'select'
    return this
  }

  insert(data) {
    this.currentOperation = 'insert'
    this.insertData = Array.isArray(data) ? data : [data]
    return this
  }

  update(data) {
    this.currentOperation = 'update'
    this.updateData = data
    return this
  }

  delete() {
    this.currentOperation = 'delete'
    return this
  }

  eq(column, value) {
    this.filters[column] = value
    return this
  }

  single() {
    this.isSingle = true
    return this.execute()
  }

  async execute() {
    try {
      const tableName = this.currentTable

      if (!mockStore[tableName]) {
        mockStore[tableName] = []
      }

      const data = mockStore[tableName]

      switch (this.currentOperation) {
        case 'select': {
          let results = [...data]
          Object.entries(this.filters).forEach(([key, value]) => {
            results = results.filter((item) => item[key] === value)
          })
          return {
            data: this.isSingle ? results[0] || null : results,
            error: null,
          }
        }

        case 'insert': {
          const insertedData = this.insertData.map((item, idx) => ({
            ...item,
            id: item.id || Date.now() + idx,
            created_at: new Date().toISOString(),
          }))
          mockStore[tableName].push(...insertedData)
          return { data: insertedData, error: null }
        }

        case 'update': {
          const updated = []
          mockStore[tableName] = data.map((item) => {
            let match = true
            Object.entries(this.filters).forEach(([key, value]) => {
              if (item[key] !== value) match = false
            })
            if (match) {
              const newItem = { ...item, ...this.updateData }
              updated.push(newItem)
              return newItem
            }
            return item
          })
          return { data: updated, error: null }
        }

        case 'delete': {
          Object.entries(this.filters).forEach(([key, value]) => {
            mockStore[tableName] = data.filter((item) => item[key] !== value)
          })
          return { data: null, error: null }
        }

        default:
          return { data: null, error: null }
      }
    } catch (error) {
      return { data: null, error: { message: error.message } }
    }
  }

  then(resolve) {
    return this.execute().then(resolve)
  }
}

// ============================================================
// TWILIO MOCK
// ============================================================
class EnhancedTwilioMock {
  constructor() {
    this.sentMessages = []
    this.madeCalls = []
    this.shouldFail = false
  }

  get messages() {
    return {
      create: async (options) => {
        if (this.shouldFail) throw new Error('Twilio mock error')
        const message = {
          sid: `SM${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
          to: options.to,
          from: options.from || process.env.TWILIO_PHONE_NUMBER,
          body: options.body,
          status: 'sent',
          dateCreated: new Date(),
        }
        this.sentMessages.push(message)
        return message
      },
    }
  }

  get calls() {
    return {
      create: async (options) => {
        if (this.shouldFail) throw new Error('Twilio mock error')
        const call = {
          sid: `CA${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
          to: options.to,
          from: options.from || process.env.TWILIO_PHONE_NUMBER,
          twiml: options.twiml || options.url,
          status: 'in-progress',
          dateCreated: new Date(),
        }
        this.madeCalls.push(call)
        return call
      },
    }
  }

  reset() {
    this.sentMessages = []
    this.madeCalls = []
    this.shouldFail = false
  }
}

// ============================================================
// GLOBAL HELPERS - DEFINE BEFORE JEST MOCKS
// ============================================================
function resetAllMocks() {
  // Reset all known tables
  Object.keys(mockStore).forEach((key) => {
    mockStore[key] = []
  })

  // Reset Twilio mock
  mockTwilioInstance.reset()

  console.log('✅ All mocks reset')
}

function seedTestData(tableName, data) {
  if (!mockStore[tableName]) {
    mockStore[tableName] = []
  }

  const processedData = Array.isArray(data) ? data : [data]
  mockStore[tableName] = processedData.map((item) => {
    // Hash passwords if they're not already hashed
    if (
      item.password &&
      !item.password.startsWith('$2a$') &&
      !item.password.startsWith('$2b$')
    ) {
      item.password = bcrypt.hashSync(item.password, 10)
    }
    return item
  })

  console.log(`✅ Seeded ${processedData.length} records to ${tableName}`)
}

// ============================================================
// ASSIGN TO GLOBAL IMMEDIATELY
// ============================================================
const mockSupabaseInstance = new EnhancedSupabaseMock()
const mockTwilioInstance = new EnhancedTwilioMock()

global.mockStore = mockStore
global.resetAllMocks = resetAllMocks
global.seedTestData = seedTestData
global.supabaseMock = mockSupabaseInstance
global.twilioMock = mockTwilioInstance

// ============================================================
// JEST MOCKS - AFTER GLOBAL ASSIGNMENT
// ============================================================
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => global.supabaseMock),
}))

jest.mock('twilio', () => jest.fn(() => global.twilioMock))

console.log('✅ Global test utilities initialized')
console.log('   - global.mockStore')
console.log('   - global.seedTestData()')
console.log('   - global.resetAllMocks()')
console.log('   - global.supabaseMock')
console.log('   - global.twilioMock')

// ============================================================
// ERROR HANDLERS
// ============================================================
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err)
})
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err)
})

// ============================================================
// SERVER SETUP & TEARDOWN
// ============================================================
let server
let app

beforeAll(async () => {
  console.log('🧪 Starting integration test suite...')

  try {
    const appModule = require('../../index')
    app = appModule.app || appModule

    if (app && app.use) {
      app.use((req, res, next) => {
        res.unauthorized = () => res.status(401).json({ error: 'Unauthorized' })
        next()
      })
    }

    await new Promise((resolve, reject) => {
      server = app.listen(process.env.PORT, (err) => {
        if (err) return reject(err)
        console.log(
          `⚡ Test server running on http://localhost:${process.env.PORT}`
        )
        resolve()
      })
      setTimeout(() => reject(new Error('Server start timeout')), 10000)
    })

    global.server = server
    global.app = app
  } catch (error) {
    console.error('❌ Setup failed:', error)
  }
})

afterAll(async () => {
  console.log('🧹 Cleaning up...')

  if (server) {
    await new Promise((resolve) => {
      server.close(() => {
        console.log('✅ Server closed')
        resolve()
      })
    })
  }

  resetAllMocks()
  jest.clearAllTimers()
  console.log('🧪 Integration test suite completed')
}, 10000)

beforeEach(() => {
  resetAllMocks()
})

jest.setTimeout(30000)
