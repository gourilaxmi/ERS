const generateTestUser = (overrides = {}) => {
  return {
    first_name: 'Test',
    last_name: 'User',
    email: `testuser${Date.now()}@example.com`,
    phone: '+919876543210',
    password: 'TestPassword123',
    primary_emergency_contact: 'Emergency Contact',
    primary_emergency_phone: '+919876543211',
    primary_emergency_relation: 'Friend',
    street_address: '123 Test Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    zip_code: '400001',
    medical_conditions: 'None',
    agree_to_terms: true,
    agree_to_emergency_sharing: true,
    ...overrides,
  }
}

const generateTestAdmin = (overrides = {}) => {
  return {
    first_name: 'Admin',
    last_name: 'User',
    email: `admin${Date.now()}@example.com`,
    password: 'AdminPassword123',
    ...overrides,
  }
}

const generateTestDispatchUnit = (overrides = {}) => {
  return {
    department_name: 'Test Fire Station',
    unit_type: 'Fire Station',
    place: 'Mumbai',
    district: 'Mumbai City',
    state: 'Maharashtra',
    pincode: '400001',
    username: `testdispatch${Date.now()}`,
    contact_number: '+919876543210',
    alternate_contact_number: '+919876543211',
    email: `dispatch${Date.now()}@example.com`,
    password: 'DispatchPassword123',
    officer_in_charge: 'Officer Test',
    officer_contact: '+919876543212',
    vehicle_count: 5,
    ...overrides,
  }
}

const generateTestEmergency = (overrides = {}) => {
  return {
    type: 'Medical Emergency',
    location: 'Mumbai, Maharashtra',
    latitude: 19.076,
    longitude: 72.8777,
    priority: 'Critical',
    description: 'Test emergency description',
    ...overrides,
  }
}

const validCoordinates = {
  mumbai: { lat: 19.076, lng: 72.8777 },
  delhi: { lat: 28.7041, lng: 77.1025 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  chennai: { lat: 13.0827, lng: 80.2707 },
}

const emergencyTypes = [
  'Medical Emergency',
  'Fire Emergency',
  'Police Emergency',
  'Accident Emergency',
  'General Emergency',
]

const priorityLevels = ['Critical', 'High', 'Medium', 'Low']

const emergencyStatuses = [
  'Reported',
  'Accepted',
  'Dispatching',
  'Dispatched',
  'En Route',
  'On Scene',
  'Resolved',
  'Completed',
  'Cancelled',
]

module.exports = {
  generateTestUser,
  generateTestAdmin,
  generateTestDispatchUnit,
  generateTestEmergency,
  validCoordinates,
  emergencyTypes,
  priorityLevels,
  emergencyStatuses,
}
