describe('Emergency Management Unit Tests', () => {
  describe('Distance Calculation (Haversine)', () => {
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371 // Earth's radius in km
      const dLat = deg2rad(lat2 - lat1)
      const dLon = deg2rad(lon2 - lon1)
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) *
          Math.cos(deg2rad(lat2)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      return Math.round(R * c * 100) / 100
    }

    const deg2rad = (deg) => deg * (Math.PI / 180)

    it('should calculate distance between two coordinates', () => {
      // Mumbai to Delhi approximately 1150 km
      const mumbai = { lat: 19.076, lng: 72.8777 }
      const delhi = { lat: 28.7041, lng: 77.1025 }

      const distance = calculateDistance(
        mumbai.lat,
        mumbai.lng,
        delhi.lat,
        delhi.lng
      )

      expect(distance).toBeGreaterThan(1100)
      expect(distance).toBeLessThan(1200)
    })

    it('should return 0 for same coordinates', () => {
      const distance = calculateDistance(28.7041, 77.1025, 28.7041, 77.1025)
      expect(distance).toBe(0)
    })

    it('should calculate small distances accurately', () => {
      // Two points in same city (~5km apart)
      const point1 = { lat: 28.7041, lng: 77.1025 }
      const point2 = { lat: 28.75, lng: 77.15 }

      const distance = calculateDistance(
        point1.lat,
        point1.lng,
        point2.lat,
        point2.lng
      )

      expect(distance).toBeGreaterThan(3)
      expect(distance).toBeLessThan(10)
    })
  })

  describe('Emergency Type Classification', () => {
    const classifyEmergencyType = (message) => {
      const messageText = message.toLowerCase()

      if (
        messageText.includes('police') ||
        messageText.includes('crime') ||
        messageText.includes('theft')
      ) {
        return 'Police Emergency'
      } else if (
        messageText.includes('medical') ||
        messageText.includes('hospital') ||
        messageText.includes('ambulance')
      ) {
        return 'Medical Emergency'
      } else if (messageText.includes('fire') || messageText.includes('burn')) {
        return 'Fire Emergency'
      } else if (
        messageText.includes('accident') ||
        messageText.includes('crash')
      ) {
        return 'Accident Emergency'
      }

      return 'General Emergency'
    }

    it('should classify police emergencies', () => {
      expect(classifyEmergencyType('theft in progress')).toBe(
        'Police Emergency'
      )
      expect(classifyEmergencyType('I need police help')).toBe(
        'Police Emergency'
      )
      expect(classifyEmergencyType('crime scene')).toBe('Police Emergency')
    })

    it('should classify medical emergencies', () => {
      expect(classifyEmergencyType('need ambulance')).toBe('Medical Emergency')
      expect(classifyEmergencyType('medical emergency')).toBe(
        'Medical Emergency'
      )
      expect(classifyEmergencyType('hospital needed')).toBe('Medical Emergency')
    })

    it('should classify fire emergencies', () => {
      expect(classifyEmergencyType('building on fire')).toBe('Fire Emergency')
      expect(classifyEmergencyType('burn injury')).toBe('Fire Emergency')
    })

    it('should classify accident emergencies', () => {
      expect(classifyEmergencyType('car accident')).toBe('Accident Emergency')
      expect(classifyEmergencyType('vehicle crash')).toBe('Accident Emergency')
    })

    it('should default to general emergency', () => {
      expect(classifyEmergencyType('help needed')).toBe('General Emergency')
      expect(classifyEmergencyType('emergency')).toBe('General Emergency')
    })
  })

  describe('Service Type Mapping', () => {
    const getRequiredServiceTypes = (emergencyType) => {
      const type = emergencyType.toLowerCase()

      if (type.includes('fire')) {
        return ['fire', 'hospital', 'police']
      }
      if (type.includes('accident')) {
        return ['police', 'medical']
      }
      if (type.includes('police') || type.includes('crime')) {
        return ['police']
      }
      if (type.includes('medical') || type.includes('health')) {
        return ['medical']
      }
      return ['medical', 'police', 'fire']
    }

    it('should require all services for fire emergencies', () => {
      const services = getRequiredServiceTypes('Fire Emergency')
      expect(services).toEqual(['fire', 'hospital', 'police'])
    })

    it('should require police and medical for accidents', () => {
      const services = getRequiredServiceTypes('Accident Emergency')
      expect(services).toEqual(['police', 'medical'])
    })

    it('should require only police for crime', () => {
      const services = getRequiredServiceTypes('Police Emergency')
      expect(services).toEqual(['police'])
    })

    it('should require all services for general emergencies', () => {
      const services = getRequiredServiceTypes('General Emergency')
      expect(services).toEqual(['medical', 'police', 'fire'])
    })
  })

  describe('Priority Level Assignment', () => {
    const assignPriority = (emergencyType, description) => {
      const urgentKeywords = [
        'life-threatening',
        'critical',
        'severe',
        'unconscious',
        'bleeding',
        'not breathing',
      ]

      const desc = description?.toLowerCase() || ''
      const isUrgent = urgentKeywords.some((keyword) => desc.includes(keyword))

      if (isUrgent || emergencyType === 'Medical Emergency') {
        return 'Critical'
      }
      if (emergencyType === 'Fire Emergency') {
        return 'High'
      }
      return 'Medium'
    }

    it('should assign Critical priority for urgent keywords', () => {
      expect(assignPriority('General', 'person not breathing')).toBe('Critical')
      expect(assignPriority('Police', 'severe bleeding')).toBe('Critical')
    })

    it('should assign Critical priority for medical emergencies', () => {
      expect(assignPriority('Medical Emergency', 'chest pain')).toBe('Critical')
    })

    it('should assign High priority for fire emergencies', () => {
      expect(assignPriority('Fire Emergency', 'building fire')).toBe('High')
    })

    it('should assign Medium priority by default', () => {
      expect(assignPriority('Police Emergency', 'theft reported')).toBe(
        'Medium'
      )
    })
  })

  describe('Location Coordinate Parsing', () => {
    const parseCoordinates = (locationString) => {
      const coordPattern = /(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/
      const match = locationString.match(coordPattern)

      if (match) {
        const lat = parseFloat(match[1])
        const lng = parseFloat(match[2])

        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          return { latitude: lat, longitude: lng }
        }
      }
      return null
    }

    it('should parse valid coordinate strings', () => {
      const coords1 = parseCoordinates('28.7041, 77.1025')
      expect(coords1).toEqual({ latitude: 28.7041, longitude: 77.1025 })

      const coords2 = parseCoordinates('19.0760,72.8777')
      expect(coords2).toEqual({ latitude: 19.076, longitude: 72.8777 })
    })

    it('should handle negative coordinates', () => {
      const coords = parseCoordinates('-34.9285, 138.6007')
      expect(coords).toEqual({ latitude: -34.9285, longitude: 138.6007 })
    })

    it('should reject invalid coordinate ranges', () => {
      expect(parseCoordinates('91.0, 77.0')).toBeNull() // lat > 90
      expect(parseCoordinates('28.0, 181.0')).toBeNull() // lng > 180
    })

    it('should return null for non-coordinate strings', () => {
      expect(parseCoordinates('New Delhi, India')).toBeNull()
      expect(parseCoordinates('invalid')).toBeNull()
    })
  })

  describe('Emergency Status Validation', () => {
    const validStatuses = [
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

    const isValidStatus = (status) => {
      return validStatuses.includes(status)
    }

    it('should validate correct statuses', () => {
      validStatuses.forEach((status) => {
        expect(isValidStatus(status)).toBe(true)
      })
    })

    it('should reject invalid statuses', () => {
      expect(isValidStatus('Pending')).toBe(false)
      expect(isValidStatus('Invalid')).toBe(false)
      expect(isValidStatus('')).toBe(false)
    })
  })

  describe('Emergency Data Validation', () => {
    const validateEmergencyData = (data) => {
      const errors = []

      if (!data.type || data.type.trim() === '') {
        errors.push({ field: 'type', message: 'Emergency type is required' })
      }

      if (!data.location || data.location.trim() === '') {
        errors.push({ field: 'location', message: 'Location is required' })
      }

      if (data.latitude) {
        const lat = parseFloat(data.latitude)
        if (lat < -90 || lat > 90) {
          errors.push({ field: 'latitude', message: 'Invalid latitude' })
        }
      }

      if (data.longitude) {
        const lng = parseFloat(data.longitude)
        if (lng < -180 || lng > 180) {
          errors.push({ field: 'longitude', message: 'Invalid longitude' })
        }
      }

      return { isValid: errors.length === 0, errors }
    }

    it('should accept valid emergency data', () => {
      const data = {
        type: 'Medical Emergency',
        location: 'Mumbai',
        latitude: 19.076,
        longitude: 72.8777,
      }

      const result = validateEmergencyData(data)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject missing type', () => {
      const data = {
        location: 'Mumbai',
      }

      const result = validateEmergencyData(data)
      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.field === 'type')).toBe(true)
    })

    it('should reject invalid coordinates', () => {
      const data = {
        type: 'Medical Emergency',
        location: 'Mumbai',
        latitude: 91, // Invalid
        longitude: 181, // Invalid
      }

      const result = validateEmergencyData(data)
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Dispatch Service Record Formatting', () => {
    const createDispatchRecord = (dispatchUnit, emergencyId) => {
      return {
        service_name: dispatchUnit.department_name,
        service_type: dispatchUnit.unit_type,
        service_id: dispatchUnit.id,
        dispatched_at: new Date().toISOString(),
        dispatched_by: dispatchUnit.officer_in_charge,
        phone: dispatchUnit.contact_number,
        place: dispatchUnit.place,
        district: dispatchUnit.district,
        status: 'Accepted',
        unit_id: dispatchUnit.id,
        emergency_id: emergencyId,
      }
    }

    it('should create valid dispatch record', () => {
      const unit = {
        id: 'unit-123',
        department_name: 'Central Hospital',
        unit_type: 'Medical',
        officer_in_charge: 'Dr. Smith',
        contact_number: '+919876543210',
        place: 'Mumbai',
        district: 'Mumbai City',
      }

      const record = createDispatchRecord(unit, 'emergency-456')

      expect(record.service_name).toBe('Central Hospital')
      expect(record.service_type).toBe('Medical')
      expect(record.status).toBe('Accepted')
      expect(record.emergency_id).toBe('emergency-456')
    })
  })
})
