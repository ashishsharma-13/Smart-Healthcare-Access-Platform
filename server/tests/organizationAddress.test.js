import { jest } from '@jest/globals';
import { Organization } from '../src/models/Organization.js';
import { User } from '../src/models/User.js';
import { Doctor } from '../src/models/Doctor.js';
import { DoctorAffiliation } from '../src/models/DoctorAffiliation.js';
import { organizationController } from '../src/controllers/OrganizationController.js';
import { organizationRepository } from '../src/repositories/OrganizationRepository.js';
import { resourceRepository } from '../src/repositories/ResourceRepository.js';
import { emergencyMatchingService } from '../src/services/EmergencyMatchingService.js';
import { authService } from '../src/services/AuthService.js';
import { userRepository } from '../src/repositories/UserRepository.js';

describe('Organization Address & Operating GPS Module Test Suite', () => {
  const mockOrgUserId = '673000000000000000000002';
  const mockOrgId = '673222222222222222222222';

  const validRegisteredAddress = {
    buildingNumber: 'Plot 100, Block A',
    streetName: 'Medical Enclave Road',
    locality: 'Connaught Place',
    landmark: 'Near Metro Gate 4',
    city: 'Central City',
    district: 'Central District',
    state: 'State Capital',
    pinCode: '110001',
    country: 'India',
  };

  const validDifferentOperatingAddress = {
    buildingNumber: 'Building 4B, Emergency Wing',
    streetName: 'Ring Road Outer Bypass',
    locality: 'Sector 62',
    landmark: 'Opposite Trauma Flyover',
    city: 'North Suburb',
    district: 'North District',
    state: 'State Capital',
    pinCode: '110062',
    country: 'India',
    isSameAsRegistered: false,
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Test 1: Registration with identical registered and operating addresses
  test('Test 1: Registration with identical registered and operating addresses (isSameAsRegistered: true)', async () => {
    const mockUser = {
      _id: mockOrgUserId,
      name: 'Apex Metro Trauma Hospital',
      email: 'apex@hospital.com',
      role: 'organization',
    };

    jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);
    jest.spyOn(userRepository, 'create').mockResolvedValue(mockUser);

    let savedOrgData = null;
    jest.spyOn(organizationRepository, 'create').mockImplementation((data) => {
      savedOrgData = data;
      return Promise.resolve({
        _id: mockOrgId,
        ...data,
      });
    });

    const result = await authService.registerUser({
      name: 'Apex Metro Trauma Hospital',
      email: 'apex@hospital.com',
      password: 'password123',
      role: 'organization',
      orgDetails: {
        name: 'Apex Metro Trauma Hospital',
        orgType: 'hospital',
        registrationNumber: 'HOSP-APEX-0988',
        registeredAddress: validRegisteredAddress,
        operatingAddress: { ...validRegisteredAddress, isSameAsRegistered: true },
        location: {
          type: 'Point',
          coordinates: [77.215, 28.62],
        },
      },
    });

    expect(savedOrgData).toBeDefined();
    expect(savedOrgData.registeredAddress.buildingNumber).toBe('Plot 100, Block A');
    expect(savedOrgData.registeredAddress.pinCode).toBe('110001');
    expect(savedOrgData.operatingAddress.isSameAsRegistered).toBe(true);
    expect(savedOrgData.operatingAddress.buildingNumber).toBe('Plot 100, Block A');
    expect(savedOrgData.location.coordinates).toEqual([77.215, 28.62]);
  });

  // Test 2: Registration with different registered and operating addresses
  test('Test 2: Registration with different registered and operating addresses (isSameAsRegistered: false)', async () => {
    const mockUser = {
      _id: mockOrgUserId,
      name: 'Satellite Emergency Hospital',
      email: 'satellite@hospital.com',
      role: 'organization',
    };

    jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);
    jest.spyOn(userRepository, 'create').mockResolvedValue(mockUser);

    let savedOrgData = null;
    jest.spyOn(organizationRepository, 'create').mockImplementation((data) => {
      savedOrgData = data;
      return Promise.resolve({
        _id: mockOrgId,
        ...data,
      });
    });

    await authService.registerUser({
      name: 'Satellite Emergency Hospital',
      email: 'satellite@hospital.com',
      password: 'password123',
      role: 'organization',
      orgDetails: {
        name: 'Satellite Emergency Hospital',
        orgType: 'hospital',
        registrationNumber: 'HOSP-SAT-5544',
        registeredAddress: validRegisteredAddress,
        operatingAddress: validDifferentOperatingAddress,
        location: {
          type: 'Point',
          coordinates: [77.35, 28.58], // Operating branch physical coordinates
        },
      },
    });

    expect(savedOrgData).toBeDefined();
    // Registered Address (Legal headquarters)
    expect(savedOrgData.registeredAddress.city).toBe('Central City');
    expect(savedOrgData.registeredAddress.pinCode).toBe('110001');

    // Operating Address (Physical hospital location where patients are treated)
    expect(savedOrgData.operatingAddress.isSameAsRegistered).toBe(false);
    expect(savedOrgData.operatingAddress.buildingNumber).toBe('Building 4B, Emergency Wing');
    expect(savedOrgData.operatingAddress.locality).toBe('Sector 62');
    expect(savedOrgData.operatingAddress.city).toBe('North Suburb');
    expect(savedOrgData.operatingAddress.pinCode).toBe('110062');
    expect(savedOrgData.location.coordinates).toEqual([77.35, 28.58]);
  });

  // Test 3: Validation fails when registered PIN code is not 6 digits
  test('Test 3: Validation fails when registered PIN code is not 6 digits', async () => {
    jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);

    await expect(
      authService.registerUser({
        name: 'Invalid Hospital',
        email: 'invalid@hospital.com',
        password: 'password123',
        role: 'organization',
        orgDetails: {
          name: 'Invalid Hospital',
          registrationNumber: 'REG-1234',
          registeredAddress: {
            ...validRegisteredAddress,
            pinCode: '1100', // Invalid 4 digits
          },
        },
      })
    ).rejects.toThrow('Registered address PIN code must be exactly 6 digits.');
  });

  // Test 4: Validation fails when operating PIN code is not 6 digits
  test('Test 4: Validation fails when operating PIN code is not 6 digits', async () => {
    jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);

    await expect(
      authService.registerUser({
        name: 'Invalid Hospital',
        email: 'invalid@hospital.com',
        password: 'password123',
        role: 'organization',
        orgDetails: {
          name: 'Invalid Hospital',
          registrationNumber: 'REG-1234',
          registeredAddress: validRegisteredAddress,
          operatingAddress: {
            ...validDifferentOperatingAddress,
            pinCode: '12345678', // Invalid 8 digits
          },
        },
      })
    ).rejects.toThrow('Operating address PIN code must be exactly 6 digits.');
  });

  // Test 5: Validation fails when latitude is out of bounds
  test('Test 5: Validation fails when latitude is out of bounds (> 90 or < -90)', async () => {
    jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);

    await expect(
      authService.registerUser({
        name: 'Invalid Coordinates',
        email: 'invalid-coords@hospital.com',
        password: 'password123',
        role: 'organization',
        orgDetails: {
          name: 'Invalid Coordinates',
          registrationNumber: 'REG-1234',
          registeredAddress: validRegisteredAddress,
          operatingAddress: { ...validRegisteredAddress, isSameAsRegistered: true },
          location: {
            type: 'Point',
            coordinates: [77.209, 120.5], // Latitude 120.5 > 90
          },
        },
      })
    ).rejects.toThrow('Latitude must be between -90 and 90');
  });

  // Test 6: Validation fails when longitude is out of bounds
  test('Test 6: Validation fails when longitude is out of bounds (> 180 or < -180)', async () => {
    jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);

    await expect(
      authService.registerUser({
        name: 'Invalid Longitude',
        email: 'invalid-lon@hospital.com',
        password: 'password123',
        role: 'organization',
        orgDetails: {
          name: 'Invalid Longitude',
          registrationNumber: 'REG-1234',
          registeredAddress: validRegisteredAddress,
          operatingAddress: { ...validRegisteredAddress, isSameAsRegistered: true },
          location: {
            type: 'Point',
            coordinates: [-195.0, 28.6139], // Longitude -195 < -180
          },
        },
      })
    ).rejects.toThrow('longitude between -180 and 180');
  });

  // Test 7: Emergency Beep distance queries matching the operating physical location
  test('Test 7: Emergency Beep distance calculates using physical operatingAddress coordinates', async () => {
    // Patient located at Connaught Place [77.2090, 28.6139]
    const patientCoords = [77.2090, 28.6139];

    // Hospital has registered address at legal HQ (100km away: [76.5, 27.5])
    // but operating hospital facility located nearby at [77.2150, 28.6200]
    const mockHospital = {
      _id: mockOrgId,
      name: 'Apex Metro Hospital',
      emergencyCapable: true,
      verificationStatus: 'verified',
      isParticipating: true,
      registeredAddress: {
        city: 'Faraway Corporate Park',
        state: 'Remote State',
        pinCode: '302001',
      },
      operatingAddress: {
        buildingNumber: 'Plot 100',
        streetName: 'Central Healthcare Road',
        city: 'Central City',
        pinCode: '110001',
        isSameAsRegistered: false,
      },
      location: {
        type: 'Point',
        coordinates: [77.2150, 28.6200], // Physical operating site (~0.89 km away)
      },
    };

    jest.spyOn(organizationRepository, 'listAll').mockResolvedValue([mockHospital]);
    jest.spyOn(resourceRepository, 'findByOrg').mockResolvedValue([
      { resourceType: 'icu_bed', availableCapacity: 5 },
      { resourceType: 'er_bay', availableCapacity: 8 },
    ]);
    jest.spyOn(Doctor, 'find').mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    });
    jest.spyOn(DoctorAffiliation, 'find').mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    });

    const results = await emergencyMatchingService.findSuitableOrganizations(patientCoords, 'cardiac');

    expect(results).toHaveLength(1);
    const matched = results[0];
    expect(matched.organization.name).toBe('Apex Metro Hospital');
    // Distance should be measured to operating coordinates [77.2150, 28.6200] (~0.89 km), not remote legal HQ
    expect(matched.distanceKm).toBeLessThan(2.0);
    expect(matched.distanceKm).toBeGreaterThan(0.5);
    expect(matched.estimatedTravelMinutes).toBe(5); // Minimum 5 min safe buffer
  });

  // Test 8: Authorized organization owner can update address & GPS coordinates
  test('Test 8: Authorized organization owner updates address & GPS coordinates', async () => {
    const existingOrg = {
      _id: mockOrgId,
      userId: mockOrgUserId,
      name: 'Apex Metro Hospital',
      registeredAddress: validRegisteredAddress,
      operatingAddress: { ...validRegisteredAddress, isSameAsRegistered: true },
      location: { type: 'Point', coordinates: [77.215, 28.62] },
      save: jest.fn().mockImplementation(function () {
        return Promise.resolve(this);
      }),
    };

    jest.spyOn(organizationRepository, 'findByUserId').mockResolvedValue(existingOrg);

    const req = {
      user: { _id: mockOrgUserId, role: 'organization' },
      body: {
        operatingAddress: validDifferentOperatingAddress,
        latitude: 28.581234,
        longitude: 77.351234,
      },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await organizationController.updateOrganizationAddress(req, res, next);

    expect(existingOrg.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: expect.stringContaining('Organization address and operating GPS coordinates updated successfully'),
      })
    );
    expect(existingOrg.location.coordinates).toEqual([77.351234, 28.581234]);
    expect(existingOrg.operatingAddress.locality).toBe('Sector 62');
  });

  // Test 9: Public organization search excludes sensitive legal verification documents
  test('Test 9: Public hospital search excludes sensitive verification documents', async () => {
    const mockHospitals = [
      {
        _id: mockOrgId,
        name: 'Apex Metro Hospital',
        orgType: 'hospital',
        verificationStatus: 'verified',
        licenseDocumentUrl: 'https://internal-s3/confidential-license.pdf',
        registrationCertificateUrl: 'https://internal-s3/private-reg-cert.pdf',
        taxIdDocumentUrl: 'https://internal-s3/tax-return.pdf',
        verificationNotes: 'Internal audit comments',
        toObject: () => ({
          _id: mockOrgId,
          name: 'Apex Metro Hospital',
          orgType: 'hospital',
          verificationStatus: 'verified',
          licenseDocumentUrl: 'https://internal-s3/confidential-license.pdf',
          registrationCertificateUrl: 'https://internal-s3/private-reg-cert.pdf',
          taxIdDocumentUrl: 'https://internal-s3/tax-return.pdf',
          verificationNotes: 'Internal audit comments',
        }),
      },
    ];

    jest.spyOn(organizationRepository, 'listAll').mockResolvedValue(mockHospitals);

    const req = { query: {} };
    const res = {
      json: jest.fn(),
    };
    const next = jest.fn();

    await organizationController.searchOrganizations(req, res, next);

    expect(res.json).toHaveBeenCalled();
    const responseData = res.json.mock.calls[0][0];
    const hospitalItem = responseData.data[0];

    // Ensure sensitive documents are omitted from public search
    expect(hospitalItem.name).toBe('Apex Metro Hospital');
    expect(hospitalItem.licenseDocumentUrl).toBeUndefined();
    expect(hospitalItem.registrationCertificateUrl).toBeUndefined();
    expect(hospitalItem.taxIdDocumentUrl).toBeUndefined();
    expect(hospitalItem.verificationNotes).toBeUndefined();
  });
});
