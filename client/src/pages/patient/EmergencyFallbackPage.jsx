import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { LeafletMap } from '../../components/common/LeafletMap';
import { useLocationService } from '../../context/LocationContext';
import {
  getUserCurrentLocation,
  formatFacilityAddress,
  calculateDistanceKm,
  estimateTravelTimeMinutes,
} from '../../utils/geoUtils';
import {
  ShieldAlert,
  AlertOctagon,
  PhoneCall,
  Phone,
  Navigation,
  MapPin,
  Building2,
  ExternalLink,
  Clock,
  Compass,
  ArrowLeft,
  Ambulance,
  HeartHandshake,
  Activity,
  AlertTriangle,
  LocateFixed,
  RefreshCw,
  Search,
  CheckCircle2,
  Sparkles,
  Info,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

// Comprehensive baseline government hospitals for immediate offline and fallback display
const BASELINE_GOVERNMENT_HOSPITALS = [
  // --- Hyderabad (Around University of Hyderabad, Gachibowli, Serilingampally, Kondapur, Patancheru) ---
  {
    _id: 'ext_uphc_serilingampally',
    externalFacilityId: 'EXT-FAC-HYD-UPHC-SERILINGAMPALLY',
    facilityName: 'Urban Primary Health Center (UPHC) Serilingampally',
    name: 'Urban Primary Health Center (UPHC) Serilingampally',
    facilityType: 'Government Urban Primary Health Center',
    ownershipType: 'GOVERNMENT',
    specialties: ['24/7 Emergency First Aid', 'Trauma Triage', 'Ambulance Outpost', 'Primary Resuscitation'],
    coordinates: [78.3182, 17.4835],
    latitude: 17.4835,
    longitude: 78.3182,
    address: 'Tara Nagar, Serilingampally Main Road, Hyderabad, Telangana 500019',
    operatingAddress: {
      buildingNumber: 'UPHC Health Building',
      streetName: 'Tara Nagar, Serilingampally Main Road',
      area: 'Serilingampally',
      city: 'Hyderabad',
      pinCode: '500019',
      location: { type: 'Point', coordinates: [78.3182, 17.4835] },
    },
    emergencyContactPhone: '040-23030108',
    displayPhone: '040-23030108',
    contactNumber: '04023030108',
    distanceKm: 2.8,
    estimatedTravelMinutes: 8,
    isPartner: false,
    liveAvailabilityConfirmed: false,
    availabilityConfirmation: 'UNCONFIRMED_EXTERNAL',
  },
  {
    _id: 'ext_uphc_gachibowli',
    externalFacilityId: 'EXT-FAC-HYD-UPHC-GACHIBOWLI',
    facilityName: 'Urban Primary Health Center (UPHC) Gachibowli',
    name: 'Urban Primary Health Center (UPHC) Gachibowli',
    facilityType: 'Government Urban Health Center & Emergency Outpost',
    ownershipType: 'GOVERNMENT',
    specialties: ['Emergency Stabilization', 'Acute Clinical Care', '108 Ambulance Dispatch'],
    coordinates: [78.3489, 17.4401],
    latitude: 17.4401,
    longitude: 78.3489,
    address: 'Vinayak Nagar, Telecom Nagar, Gachibowli, Hyderabad, Telangana 500032',
    operatingAddress: {
      buildingNumber: 'Government UPHC Complex',
      streetName: 'Vinayak Nagar, Telecom Nagar',
      area: 'Gachibowli',
      city: 'Hyderabad',
      pinCode: '500032',
      location: { type: 'Point', coordinates: [78.3489, 17.4401] },
    },
    emergencyContactPhone: '040-29800108',
    displayPhone: '040-29800108',
    contactNumber: '04029800108',
    distanceKm: 2.7,
    estimatedTravelMinutes: 7,
    isPartner: false,
    liveAvailabilityConfirmed: false,
    availabilityConfirmation: 'UNCONFIRMED_EXTERNAL',
  },
  {
    _id: 'ext_hyd_kondapur',
    externalFacilityId: 'EXT-FAC-HYD-KONDAPUR',
    facilityName: 'Government Area Hospital Kondapur (Casualty & Trauma)',
    name: 'Government Area Hospital Kondapur (Casualty & Trauma)',
    facilityType: 'Government Area Hospital & Casualty Unit',
    ownershipType: 'GOVERNMENT',
    specialties: ['24/7 Casualty & Trauma', 'Primary Resuscitation', 'General Surgery', 'Ambulance Triage'],
    coordinates: [78.3610, 17.4682],
    latitude: 17.4682,
    longitude: 78.3610,
    address: 'Near RTO Office, Kondapur, Hyderabad, Telangana 500084',
    operatingAddress: {
      buildingNumber: 'Casualty Ward',
      streetName: 'Near RTO Office, Gachibowli-Miyapur Road',
      area: 'Kondapur / Hitec City',
      city: 'Hyderabad',
      pinCode: '500084',
      location: { type: 'Point', coordinates: [78.3610, 17.4682] },
    },
    emergencyContactPhone: '040-23112233',
    displayPhone: '040-23112233',
    contactNumber: '04023112233',
    distanceKm: 3.8,
    estimatedTravelMinutes: 11,
    isPartner: false,
    liveAvailabilityConfirmed: false,
    availabilityConfirmation: 'UNCONFIRMED_EXTERNAL',
  },
  {
    _id: 'ext_phc_chandanagar',
    externalFacilityId: 'EXT-FAC-HYD-PHC-CHANDANAGAR',
    facilityName: 'Government Primary Health Center (PHC) Chandanagar / Lingampally',
    name: 'Government Primary Health Center (PHC) Chandanagar / Lingampally',
    facilityType: 'Government Primary Health Center & Casualty',
    ownershipType: 'GOVERNMENT',
    specialties: ['24/7 Casualty', 'Emergency Wound Care', 'Maternal & Child Emergency Care'],
    coordinates: [78.3245, 17.4920],
    latitude: 17.4920,
    longitude: 78.3245,
    address: 'Near Lingampally Railway Station Road, Chandanagar, Hyderabad, Telangana 500050',
    operatingAddress: {
      buildingNumber: 'PHC Emergency Center',
      streetName: 'Station Road, Chandanagar',
      area: 'Chandanagar / Lingampally',
      city: 'Hyderabad',
      pinCode: '500050',
      location: { type: 'Point', coordinates: [78.3245, 17.4920] },
    },
    emergencyContactPhone: '040-23034455',
    displayPhone: '040-23034455',
    contactNumber: '04023034455',
    distanceKm: 3.9,
    estimatedTravelMinutes: 10,
    isPartner: false,
    liveAvailabilityConfirmed: false,
    availabilityConfirmation: 'UNCONFIRMED_EXTERNAL',
  },
  {
    _id: 'ext_uphc_hafeezpet',
    externalFacilityId: 'EXT-FAC-HYD-UPHC-HAFEEZPET',
    facilityName: 'Urban Primary Health Center (UPHC) Hafeezpet',
    name: 'Urban Primary Health Center (UPHC) Hafeezpet',
    facilityType: 'Government Urban Health Center',
    ownershipType: 'GOVERNMENT',
    specialties: ['Casualty Stabilization', 'Emergency Medicine', 'Ambulance Triage Station'],
    coordinates: [78.3490, 17.4810],
    latitude: 17.4810,
    longitude: 78.3490,
    address: 'Hafeezpet Main Road, Near Old Post Office, Hyderabad, Telangana 500049',
    operatingAddress: {
      buildingNumber: 'UPHC Facility',
      streetName: 'Hafeezpet Main Road',
      area: 'Hafeezpet',
      city: 'Hyderabad',
      pinCode: '500049',
      location: { type: 'Point', coordinates: [78.3490, 17.4810] },
    },
    emergencyContactPhone: '040-23040108',
    displayPhone: '040-23040108',
    contactNumber: '04023040108',
    distanceKm: 3.5,
    estimatedTravelMinutes: 9,
    isPartner: false,
    liveAvailabilityConfirmed: false,
    availabilityConfirmation: 'UNCONFIRMED_EXTERNAL',
  },
  {
    _id: 'ext_bhel_general',
    externalFacilityId: 'EXT-FAC-HYD-BHEL-GENERAL',
    facilityName: 'BHEL General Hospital (Public Sector Hospital & Emergency Trauma Hub)',
    name: 'BHEL General Hospital (Public Sector Hospital & Emergency Trauma Hub)',
    facilityType: 'Public Sector Undertaking Hospital & Trauma Center',
    ownershipType: 'GOVERNMENT',
    specialties: ['24/7 Acute Casualty', 'Level-2 Trauma Care', 'ICU & Cardiac Care', 'Burn Resuscitation'],
    coordinates: [78.2890, 17.5012],
    latitude: 17.5012,
    longitude: 78.2890,
    address: 'BHEL Township, Ramachandrapuram, Hyderabad, Telangana 502032',
    operatingAddress: {
      buildingNumber: 'Main Hospital Block',
      streetName: 'BHEL Township Road',
      area: 'Ramachandrapuram / BHEL',
      city: 'Hyderabad',
      pinCode: '502032',
      location: { type: 'Point', coordinates: [78.2890, 17.5012] },
    },
    emergencyContactPhone: '040-23182222',
    displayPhone: '040-23182222',
    contactNumber: '04023182222',
    distanceKm: 5.5,
    estimatedTravelMinutes: 14,
    isPartner: false,
    liveAvailabilityConfirmed: false,
    availabilityConfirmation: 'UNCONFIRMED_EXTERNAL',
  },
  {
    _id: 'ext_esic_rc_puram',
    externalFacilityId: 'EXT-FAC-HYD-ESIC-RC-PURAM',
    facilityName: 'ESI Hospital RC Puram (Employees State Insurance Govt Hospital)',
    name: 'ESI Hospital RC Puram (Employees State Insurance Govt Hospital)',
    facilityType: 'Central Government ESIC Hospital & Casualty Wing',
    ownershipType: 'GOVERNMENT',
    specialties: ['24/7 Emergency Casualty', 'Industrial Polytrauma', 'Emergency Surgery', 'ICU'],
    coordinates: [78.2985, 17.5098],
    latitude: 17.5098,
    longitude: 78.2985,
    address: 'Factory Road, Ramachandrapuram, Hyderabad, Telangana 502032',
    operatingAddress: {
      buildingNumber: 'Casualty & Trauma Dept',
      streetName: 'Factory Road, Ramachandrapuram',
      area: 'RC Puram',
      city: 'Hyderabad',
      pinCode: '502032',
      location: { type: 'Point', coordinates: [78.2985, 17.5098] },
    },
    emergencyContactPhone: '040-23021444',
    displayPhone: '040-23021444',
    contactNumber: '04023021444',
    distanceKm: 6.2,
    estimatedTravelMinutes: 16,
    isPartner: false,
    liveAvailabilityConfirmed: false,
    availabilityConfirmation: 'UNCONFIRMED_EXTERNAL',
  },
  {
    _id: 'ext_chc_patancheru',
    externalFacilityId: 'EXT-FAC-HYD-CHC-PATANCHERU',
    facilityName: 'Government Community Health Center (CHC) & Area Hospital Patancheru',
    name: 'Government Community Health Center (CHC) & Area Hospital Patancheru',
    facilityType: 'Government Community Health Center & Regional Trauma Unit',
    ownershipType: 'GOVERNMENT',
    specialties: ['24/7 Trauma Bay', 'Industrial Resuscitation', 'Emergency Surgery', 'Toxicology'],
    coordinates: [78.2612, 17.5286],
    latitude: 17.5286,
    longitude: 78.2612,
    address: 'Near Bus Depot, NH 65, Patancheru, Hyderabad, Telangana 502319',
    operatingAddress: {
      buildingNumber: 'Emergency Trauma Wing',
      streetName: 'NH 65, Patancheru Industrial Area',
      area: 'Patancheru',
      city: 'Hyderabad',
      pinCode: '502319',
      location: { type: 'Point', coordinates: [78.2612, 17.5286] },
    },
    emergencyContactPhone: '08455-242233',
    displayPhone: '08455-242233',
    contactNumber: '08455242233',
    distanceKm: 9.5,
    estimatedTravelMinutes: 19,
    isPartner: false,
    liveAvailabilityConfirmed: false,
    availabilityConfirmation: 'UNCONFIRMED_EXTERNAL',
  },
  {
    _id: 'ext_hyd_nims',
    externalFacilityId: 'EXT-FAC-HYD-NIMS',
    facilityName: "Nizam's Institute of Medical Sciences (NIMS) Emergency Center",
    name: "Nizam's Institute of Medical Sciences (NIMS) Emergency Center",
    facilityType: 'Autonomous Super-Specialty Medical Institute',
    ownershipType: 'GOVERNMENT',
    specialties: ['Acute Neuro-trauma', 'Emergency Cardiology', 'Organ Resuscitation', 'Toxicology'],
    coordinates: [78.4526, 17.4223],
    latitude: 17.4223,
    longitude: 78.4526,
    address: 'Punjagutta, Hyderabad, Telangana 500082',
    operatingAddress: {
      buildingNumber: 'Emergency Medicine Dept',
      streetName: 'Punjagutta Main Road',
      area: 'Punjagutta',
      city: 'Hyderabad',
      pinCode: '500082',
      location: { type: 'Point', coordinates: [78.4526, 17.4223] },
    },
    emergencyContactPhone: '040-23489000',
    displayPhone: '040-23489000',
    contactNumber: '04023489000',
    distanceKm: 13.8,
    estimatedTravelMinutes: 28,
    isPartner: false,
    liveAvailabilityConfirmed: false,
    availabilityConfirmation: 'UNCONFIRMED_EXTERNAL',
  },
  {
    _id: 'ext_hyd_osmania',
    externalFacilityId: 'EXT-FAC-HYD-OSMANIA',
    facilityName: 'Osmania General Hospital & Trauma Center',
    name: 'Osmania General Hospital & Trauma Center',
    facilityType: 'State Apex Tertiary Public Trauma Center',
    ownershipType: 'GOVERNMENT',
    specialties: ['Level-1 Trauma Bay', 'Emergency Surgery', 'Casualty & Resuscitation', 'Burn Unit'],
    coordinates: [78.4770, 17.3785],
    latitude: 17.3785,
    longitude: 78.4770,
    address: 'Afzal Gunj, High Court Road, Hyderabad, Telangana 500012',
    operatingAddress: {
      buildingNumber: 'Trauma & Casualty Wing',
      streetName: 'Afzal Gunj, High Court Road',
      area: 'Afzal Gunj',
      city: 'Hyderabad',
      pinCode: '500012',
      location: { type: 'Point', coordinates: [78.4770, 17.3785] },
    },
    emergencyContactPhone: '040-24600121',
    displayPhone: '040-24600121',
    contactNumber: '04024600121',
    distanceKm: 17.5,
    estimatedTravelMinutes: 36,
    isPartner: false,
    liveAvailabilityConfirmed: false,
    availabilityConfirmation: 'UNCONFIRMED_EXTERNAL',
  },
  // --- Delhi Baseline Facilities ---
  {
    _id: 'ext_aiims_trauma',
    externalFacilityId: 'EXT-FAC-AIIMS-TRAUMA',
    facilityName: 'AIIMS Apex Trauma Center (JPNATC)',
    name: 'AIIMS Apex Trauma Center (JPNATC)',
    facilityType: 'Apex Level-1 Public Trauma Center',
    ownershipType: 'GOVERNMENT',
    specialties: ['Level-1 Polytrauma', 'Neurosurgery', 'Orthopedic Surgery', 'Emergency Resuscitation'],
    coordinates: [77.1950, 28.5672],
    latitude: 28.5672,
    longitude: 77.1950,
    address: 'Ring Road, Raj Nagar, Safdarjung Enclave, New Delhi 110029',
    operatingAddress: {
      buildingNumber: 'JPNATC Complex',
      streetName: 'Ring Road, Raj Nagar, Safdarjung Enclave',
      area: 'South Delhi',
      city: 'New Delhi',
      pinCode: '110029',
      location: { type: 'Point', coordinates: [77.1950, 28.5672] },
    },
    emergencyContactPhone: '011-26731000',
    displayPhone: '011-26731000',
    contactNumber: '01126731000',
    distanceKm: 2.4,
    estimatedTravelMinutes: 7,
    isPartner: false,
    liveAvailabilityConfirmed: false,
    availabilityConfirmation: 'UNCONFIRMED_EXTERNAL',
  },
  {
    _id: 'ext_safdarjung',
    externalFacilityId: 'EXT-FAC-SAFDARJUNG',
    facilityName: 'Safdarjung Hospital Emergency & Burn Block',
    name: 'Safdarjung Hospital Emergency & Burn Block',
    facilityType: 'Central Government Multi-Speciality Trauma Block',
    ownershipType: 'GOVERNMENT',
    specialties: ['24/7 Burn ICU', 'Emergency Surgery', 'Cardiac Resuscitation', 'Toxicology'],
    coordinates: [77.2075, 28.5705],
    latitude: 28.5705,
    longitude: 77.2075,
    address: 'Ansari Nagar West, Ring Road, New Delhi 110029',
    operatingAddress: {
      buildingNumber: 'Emergency Block',
      streetName: 'Ansari Nagar West, Ring Road',
      area: 'South Delhi',
      city: 'New Delhi',
      pinCode: '110029',
      location: { type: 'Point', coordinates: [77.2075, 28.5705] },
    },
    emergencyContactPhone: '011-26707444',
    displayPhone: '011-26707444',
    contactNumber: '01126707444',
    distanceKm: 3.1,
    estimatedTravelMinutes: 9,
    isPartner: false,
    liveAvailabilityConfirmed: false,
    availabilityConfirmation: 'UNCONFIRMED_EXTERNAL',
  },
];

export const EmergencyFallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('requestId') || searchParams.get('id');
  const { location, selectedSearchLocation, detectCurrentLocation } = useLocationService();

  // Location state
  const [userLocation, setUserLocation] = useState(
    location.latitude != null
      ? { lat: location.latitude, lng: location.longitude }
      : selectedSearchLocation?.latitude != null
      ? { lat: selectedSearchLocation.latitude, lng: selectedSearchLocation.longitude }
      : { lat: 17.4568, lng: 78.3264 }
  );
  const [userAddress, setUserAddress] = useState(
    location.address || selectedSearchLocation?.address || 'Detecting current location...'
  );
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (location.latitude != null && location.longitude != null) {
      setUserLocation({ lat: location.latitude, lng: location.longitude });
      if (location.address) setUserAddress(location.address);
    }
  }, [location.latitude, location.longitude, location.address]);

  // Search Expansion state (for both requestId mode and standalone fallback directory)
  const [customSearchLevel, setCustomSearchLevel] = useState(1);
  const [customRadiusKm, setCustomRadiusKm] = useState(5);

  // Backend Fallback & Recovery State
  const [loading, setLoading] = useState(false);
  const [expanding, setExpanding] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [fallbackData, setFallbackData] = useState(null);
  const [recoveryData, setRecoveryData] = useState(null);
  const [externalFacilities, setExternalFacilities] = useState([]);
  const [acceptedParticipating, setAcceptedParticipating] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(null);

  // Confirmation Disclaimer Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [facilityToConfirm, setFacilityToConfirm] = useState(null);
  const [confirmingSelection, setConfirmingSelection] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (location.source === 'UNKNOWN') {
      initUserLocation();
    }
    loadFallbackData();
  }, [requestId, userLocation.lat, userLocation.lng, customRadiusKm]);

  const initUserLocation = async (refresh = false) => {
    try {
      setLocating(true);
      const res = await detectCurrentLocation({ forceRefresh: refresh });
      if (res.success) {
        setUserLocation({ lat: res.location.latitude, lng: res.location.longitude });
        setUserAddress(res.location.address || `GPS: ${res.location.latitude.toFixed(4)}, ${res.location.longitude.toFixed(4)}`);
      }
    } catch (err) {
      console.warn('Location detection note:', err);
    } finally {
      setLocating(false);
    }
  };

  const loadFallbackData = async () => {
    try {
      setLoading(true);

      let centerLat = userLocation.lat || 17.4568;
      let centerLng = userLocation.lng || 78.3264;

      // 1. Fetch confirmed emergency request location details (if requestId exists)
      let fallbackOptions = [];
      let acceptedFacilities = [];

      if (requestId) {
        try {
          const reqRes = await api.get(`/emergency/requests/${requestId}`);
          if (reqRes.data?.success && reqRes.data?.data) {
            const reqData = reqRes.data.data;
            const snapshotCoords = reqData.locationSnapshot?.coordinates;
            const liveCoords = reqData.location?.coordinates;
            const coords = (snapshotCoords && (snapshotCoords[0] !== 0 || snapshotCoords[1] !== 0))
              ? snapshotCoords
              : (liveCoords && (liveCoords[0] !== 0 || liveCoords[1] !== 0))
              ? liveCoords
              : null;
            if (coords) {
              centerLat = coords[1];
              centerLng = coords[0];
              setUserLocation({ lat: centerLat, lng: centerLng });
              const resolvedAddress = reqData.locationSnapshot?.address || reqData.address;
              if (resolvedAddress) setUserAddress(resolvedAddress);
            }
          }
        } catch (e) {
          console.warn('Emergency request details retrieval notice:', e.message);
        }

        // 2. Fetch fallback options for this emergency request
        try {
          const optRes = await api.get(`/emergency/requests/${requestId}/fallback-options`);
          if (optRes.data?.success) {
            setFallbackData(optRes.data);
            fallbackOptions = optRes.data.options || [];
            acceptedFacilities = fallbackOptions.filter((o) => o.optionType === 'PARTICIPATING_ORGANIZATION');
            setAcceptedParticipating(acceptedFacilities);
          }
        } catch (e) {
          console.warn('Fallback options retrieval notice:', e.message);
        }

        // 3. Fetch recovery status
        try {
          const recRes = await api.get(`/emergency/requests/${requestId}/recovery-status`);
          if (recRes.data?.success) {
            setRecoveryData(recRes.data);
          }
        } catch (e) {
          console.warn('Recovery status retrieval notice:', e.message);
        }
      }

      // 4. Fetch government fallback directory from backend API
      const activeRadius = customRadiusKm;
      let directoryFacilities = [];
      try {
        const queryUrl = requestId
          ? `/emergency/requests/${requestId}/external-facilities?radiusKm=${activeRadius}&limit=30`
          : `/emergency/external-facilities?lat=${centerLat}&lng=${centerLng}&radiusKm=${activeRadius}&limit=30`;
        const directoryRes = await api.get(queryUrl);
        directoryFacilities = (directoryRes.data?.facilities || []).filter((facility) => {
          const ownership = String(facility.ownershipType || '').toUpperCase();
          const type = String(facility.facilityType || '').toLowerCase();
          return ownership === 'GOVERNMENT' || /government|public|municipal|civic|uphc|phc|chc|area hospital/.test(type);
        });
      } catch (directoryError) {
        console.warn('Government fallback directory notice:', directoryError.message);
      }

      const optionFacilities = fallbackOptions.filter((o) => o.optionType === 'EXTERNAL_FACILITY');

      // 5. Calculate dynamic proximity for client baseline
      const baselineWithDistance = BASELINE_GOVERNMENT_HOSPITALS.map((fac) => {
        const facLat = fac.latitude != null ? fac.latitude : (fac.coordinates ? fac.coordinates[1] : 17.4568);
        const facLng = fac.longitude != null ? fac.longitude : (fac.coordinates ? fac.coordinates[0] : 78.3264);
        const dist = Number(calculateDistanceKm(centerLat, centerLng, facLat, facLng).toFixed(1));
        const travelMins = estimateTravelTimeMinutes(dist);
        return {
          ...fac,
          distanceKm: dist,
          estimatedTravelMinutes: travelMins,
        };
      }).filter((fac) => fac.distanceKm <= activeRadius);

      const normalizedDirectory = directoryFacilities.map((fac) => {
        const coords = fac.coordinates || fac.operatingAddress?.location?.coordinates || (fac.latitude ? [fac.longitude, fac.latitude] : null);
        const facLat = coords ? coords[1] : fac.latitude;
        const facLng = coords ? coords[0] : fac.longitude;
        const dist = (fac.distanceKm != null && fac.distanceKm > 0)
          ? Number(Number(fac.distanceKm).toFixed(1))
          : (facLat && facLng)
          ? Number(calculateDistanceKm(centerLat, centerLng, facLat, facLng).toFixed(1))
          : 5;
        const travelMins = fac.estimatedTravelMinutes || estimateTravelTimeMinutes(dist);
        return {
          ...fac,
          distanceKm: dist,
          estimatedTravelMinutes: travelMins,
        };
      }).filter((fac) => fac.distanceKm <= activeRadius);

      const allCandidates = [...normalizedDirectory, ...optionFacilities, ...baselineWithDistance];
      const mergedFacilities = [];
      const seen = new Set();
      for (const item of allCandidates) {
        const idKey = (item.externalFacilityId || item._id || item.name || '').toLowerCase().trim();
        if (!seen.has(idKey)) {
          seen.add(idKey);
          mergedFacilities.push(item);
        }
      }

      mergedFacilities.sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999));

      setExternalFacilities(mergedFacilities);
      if (mergedFacilities.length > 0) {
        setSelectedFacility(mergedFacilities[0]);
      } else if (acceptedFacilities.length > 0) {
        setSelectedFacility(acceptedFacilities[0]);
      } else {
        setSelectedFacility(null);
      }
    } catch (err) {
      console.warn('Fallback data loading notice:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExpandSearch = async () => {
    const nextLevel = Math.min(5, searchLevel + 1);
    const radiusMap = { 1: 5, 2: 10, 3: 20, 4: 40, 5: 80 };
    setCustomSearchLevel(nextLevel);
    setCustomRadiusKm(radiusMap[nextLevel]);

    if (!requestId) return;
    try {
      setExpanding(true);
      setFeedback(null);
      const res = await api.post(`/internal/emergency-fallback/${requestId}/expand-search`);
      if (res.data.success) {
        setFeedback({
          type: 'success',
          message: res.data.message || `Search radius successfully expanded to Level ${nextLevel} (${radiusMap[nextLevel]} km).`,
        });
        await loadFallbackData();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to expand search radius',
      });
    } finally {
      setExpanding(false);
    }
  };

  const handleRetryMatching = async () => {
    if (!requestId) {
      await loadFallbackData();
      return;
    }
    try {
      setRetrying(true);
      setFeedback(null);
      const res = await api.post(`/emergency/requests/${requestId}/retry-matching`);
      if (res.data.success) {
        setFeedback({
          type: 'success',
          message: 'Matching restarted. Discovering nearby emergency centers.',
        });
        await loadFallbackData();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to restart matching',
      });
    } finally {
      setRetrying(false);
    }
  };

  const handleSelectExternalFacility = (fac) => {
    setFacilityToConfirm(fac);
    setShowConfirmModal(true);
  };

  const confirmExternalSelection = async () => {
    if (!facilityToConfirm || !requestId) {
      setShowConfirmModal(false);
      handleOpenGoogleMaps(facilityToConfirm || selectedFacility);
      return;
    }
    try {
      setConfirmingSelection(true);
      const targetId = facilityToConfirm.externalFacilityId || facilityToConfirm._id;
      const res = await api.post(`/emergency/requests/${requestId}/select-external-facility`, {
        externalFacilityId: targetId,
      });

      setShowConfirmModal(false);
      if (res.data.success) {
        setFeedback({
          type: 'success',
          message: `Destination confirmed: ${facilityToConfirm.name || facilityToConfirm.facilityName}. Opening turn-by-turn navigation.`,
        });
        handleOpenGoogleMaps(facilityToConfirm);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Selection error',
      });
      setShowConfirmModal(false);
      handleOpenGoogleMaps(facilityToConfirm);
    } finally {
      setConfirmingSelection(false);
    }
  };

  const handleSwitchToParticipating = async (org) => {
    if (!requestId) return;
    try {
      setLoading(true);
      const res = await api.post(`/emergency/requests/${requestId}/change-destination`, {
        newOrganizationId: org.id || org._id,
        reason: 'Patient recovered to alternative accepted hospital',
      });
      if (res.data.success) {
        navigate(`/emergency/tracking/${requestId}`);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to switch hospital',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenGoogleMaps = (facility) => {
    const destCoords =
      facility.coordinates ||
      facility.location?.coordinates ||
      facility.operatingAddress?.location?.coordinates;
    const destLat = destCoords ? destCoords[1] : facility.latitude;
    const destLng = destCoords ? destCoords[0] : facility.longitude;

    const originParam =
      userLocation?.lat && userLocation?.lng
        ? `&origin=${userLocation.lat},${userLocation.lng}`
        : '';

    const destination =
      destLat && destLng
        ? `${destLat},${destLng}`
        : encodeURIComponent(facility.operatingAddress?.streetName || facility.address || facility.name);

    const url = `https://www.google.com/maps/dir/?api=1${originParam}&destination=${destination}&travelmode=driving`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const searchLevel = fallbackData?.currentSearchLevel || fallbackData?.fallbackSession?.currentSearchLevel || customSearchLevel;
  const radiusKm = fallbackData?.fallbackSession?.currentSearchRadiusKm || customRadiusKm;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 font-sans">
      
      {/* Top Navigation Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors self-start cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span>Back to Emergency Triage</span>
        </button>

        {/* Live Detected User Location Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/90 border border-slate-200/80 text-xs text-slate-700 shadow-xs">
          <LocateFixed className={`w-3.5 h-3.5 text-blue-600 ${locating ? 'animate-spin' : ''}`} />
          <span className="font-semibold text-slate-500">Your Location:</span>
          <span className="font-bold text-slate-900 truncate max-w-[240px] sm:max-w-xs">{userAddress}</span>
          <button
            onClick={() => initUserLocation(true)}
            className="text-[10px] uppercase font-bold text-blue-600 hover:text-blue-800 ml-1 underline cursor-pointer"
          >
            Update
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-500 hover:text-slate-800 ml-3">✕</button>
        </div>
      )}

      {/* Destination Recovery Alert (If recovery session active) */}
      {recoveryData?.hasActiveRecovery && (
        <div className="bg-amber-500/15 border-2 border-amber-500/30 rounded-2xl p-5 text-amber-950 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-amber-800 font-bold uppercase text-xs tracking-wider">
            <AlertOctagon className="w-4 h-4 animate-pulse text-amber-600" />
            <span>Destination Recovery Mode Active</span>
          </div>
          <h2 className="text-base font-bold tracking-tight text-amber-950">
            Hospital Confirmation or Capacity Hold Could Not Be Completed
          </h2>
          <p className="text-xs text-amber-800 font-medium">
            Reason: {recoveryData.session?.recoveryNotes || recoveryData.session?.triggerReason || 'Selected hospital could not reserve immediate capacity'}.
            Alternative accepted partner hospitals or major public trauma centers are available below.
          </p>
        </div>
      )}

      {/* 1. Redesigned Emergency Alert Banner: WCAG 2.2 AA High Contrast */}
      <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-2xl p-6 text-[#7F1D1D] shadow-sm relative overflow-hidden">
        <div className="relative z-10 space-y-2.5 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="bg-[#DC2626] text-[#FFFFFF] rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-xs">
              <AlertOctagon className="w-3.5 h-3.5 text-[#FFFFFF] animate-pulse" />
              <span>Emergency Fallback & Search Expansion</span>
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#991B1B] leading-snug">
            {acceptedParticipating.length > 0
              ? 'Alternative Emergency Facilities Available'
              : 'No Verified SHAP Partners In Immediate Range. Showing External Public / Government Centers.'}
          </h1>

          <p className="text-xs sm:text-sm text-[#7F1D1D] leading-relaxed font-medium">
            Immediate patient safety takes priority over private platform reservation. Direct turn-by-turn navigation and direct phone helplines for major tertiary government trauma institutions are provided below.
          </p>
        </div>

        {/* Decorative graphic backdrop */}
        <div className="absolute -right-6 -bottom-8 opacity-10 pointer-events-none">
          <ShieldAlert className="w-56 h-56 text-[#DC2626]" />
        </div>
      </div>

      {/* Search Expansion Controls Card */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Geographic Search Expansion Tiers</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                Level {searchLevel} of 5 ({radiusKm} km)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Expand radius to discover emergency government centers and participating hospitals across wider regional boundaries.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRetryMatching}
              disabled={retrying}
              icon={RefreshCw}
              className={retrying ? 'animate-spin' : ''}
            >
              {requestId ? 'Restart Matching' : 'Refresh Centers'}
            </Button>
            {searchLevel < 5 && (
              <Button
                size="sm"
                variant="primary"
                onClick={handleExpandSearch}
                disabled={expanding}
                icon={Search}
              >
                {expanding ? 'Expanding Search...' : `Expand to Level ${searchLevel + 1}`}
              </Button>
            )}
          </div>
        </div>

        {/* Tier Step Indicators */}
        <div className="grid grid-cols-5 gap-2 pt-1">
          {[
            { lvl: 1, dist: '5 km', km: 5 },
            { lvl: 2, dist: '10 km', km: 10 },
            { lvl: 3, dist: '20 km', km: 20 },
            { lvl: 4, dist: '40 km', km: 40 },
            { lvl: 5, dist: '80 km', km: 80 },
          ].map((tier) => {
            const isPast = tier.lvl < searchLevel;
            const isCurrent = tier.lvl === searchLevel;
            return (
              <button
                type="button"
                key={tier.lvl}
                onClick={() => {
                  setCustomSearchLevel(tier.lvl);
                  setCustomRadiusKm(tier.km);
                }}
                className={`p-2 rounded-xl text-center border text-[11px] font-bold transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                    : isPast
                    ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    : 'bg-white dark:bg-slate-900/40 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-300'
                }`}
              >
                <span className="block text-[10px] uppercase font-semibold">Tier {tier.lvl}</span>
                <span>{tier.dist}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Alternative Accepted Participating Hospitals (if any exist) */}
      {acceptedParticipating.length > 0 && (
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold">Alternative Accepted Participating Hospitals</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900">
              Live Bed Hold Supported
            </span>
          </div>
          <p className="text-xs text-emerald-700">
            These participating facilities responded ACCEPT to your Emergency Beep and are ready to secure a bed reservation immediately:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {acceptedParticipating.map((org) => (
              <div
                key={org.id || org._id}
                className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{org.name}</h4>
                  <p className="text-[11px] text-slate-500 truncate">{org.address?.streetName || org.address || 'Address on file'}</p>
                  <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                    {org.distanceKm} km (~{org.estimatedTravelMinutes} mins)
                  </span>
                </div>
                <button
                  onClick={() => handleSwitchToParticipating(org)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex-shrink-0 shadow-xs transition-colors cursor-pointer"
                >
                  Switch & Reserve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Redesigned Clinical Safety Notice: WCAG 2.2 AA High Contrast Amber Banner */}
      <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-4 text-[#78350F] flex items-start gap-3.5 shadow-xs">
        <AlertTriangle className="w-5 h-5 text-[#D97706] flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#92400E]">
            Mandatory Emergency Care Disclaimer
          </h2>
          <p className="text-xs sm:text-sm font-bold text-[#78350F] leading-relaxed">
            Live bed/specialist availability cannot be verified for external facilities. Dispatching call to Emergency Services (112/108).
          </p>
          <p className="text-xs text-[#78350F] leading-relaxed">
            Public trauma centers accept emergency cases under statutory mandates. However, pre-arrival bed holds and specialist reservation locks are not supported for non-partner hospitals.
          </p>
        </div>
      </div>

      {/* 3. Helpline Action Cards (108, 112, 102) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: 108 Ambulance */}
        <a
          href="tel:108"
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200/60 dark:border-red-900/50">
              Trauma Ambulance
            </span>
            <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-red-600 transition-colors">
              108
            </p>
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
              National Emergency Medical Services
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/40 flex items-center justify-center flex-shrink-0 group-hover:bg-red-600 group-hover:text-white transition-all">
            <Ambulance className="w-6 h-6" />
          </div>
        </a>

        {/* Card 2: 112 Unified Emergency */}
        <a
          href="tel:112"
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Unified Disaster Desk
            </span>
            <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
              112
            </p>
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
              Police, Fire & Disaster Helpline
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-all">
            <PhoneCall className="w-6 h-6" />
          </div>
        </a>

        {/* Card 3: 102 Maternity & Infant */}
        <a
          href="tel:102"
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/50">
              Maternal / Infant
            </span>
            <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
              102
            </p>
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
              Obstetric & Neonatal Rapid Transport
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all">
            <HeartHandshake className="w-6 h-6" />
          </div>
        </a>
      </div>

      {/* 4. Directory & Map Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Directory Cards (Col 6) */}
        <div className="lg:col-span-6 space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Major Public Trauma Centers ({externalFacilities.length})
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">Ranked by Proximity</span>
          </div>

          <div className="space-y-3">
            {externalFacilities.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-3 shadow-md">
                <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto" />
                <h3 className="text-base font-bold text-white">No Public Trauma Centers Within {radiusKm} km</h3>
                <p className="text-xs text-slate-300 max-w-sm mx-auto">
                  Expand the search radius using the tier buttons above or contact national emergency dispatch directly for emergency routing.
                </p>
                <div className="pt-2 flex justify-center gap-3">
                  <a
                    href="tel:108"
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call 108 Ambulance
                  </a>
                  <a
                    href="tel:112"
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-700 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call 112 Unified
                  </a>
                </div>
              </div>
            ) : (
              externalFacilities.map((facility) => {
                const facId = facility.externalFacilityId || facility._id;
                const isSelected = (selectedFacility?.externalFacilityId || selectedFacility?._id) === facId;
                const formattedAddress = facility.address || formatFacilityAddress(facility);

                return (
                  <div
                    key={facId}
                    onClick={() => setSelectedFacility(facility)}
                    className={`bg-slate-900 border transition-all cursor-pointer space-y-3.5 rounded-2xl p-5 shadow-sm hover:shadow-md ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-lg'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-200 border border-slate-700">
                            External Public Facility
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/70 text-amber-300 border border-amber-800/60">
                            Unconfirmed Live Bed Hold
                          </span>
                        </div>
                        <h3 className="text-base font-bold tracking-tight text-white leading-snug">
                          {facility.name || facility.facilityName}
                        </h3>
                        <p className="text-xs text-slate-300 flex items-start">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 mr-1 flex-shrink-0 mt-0.5" />
                          <span className="truncate">{formattedAddress}</span>
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0 pl-2">
                        <span className="text-xs font-bold text-sky-400 bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-full inline-block">
                          {facility.distanceKm} km
                        </span>
                        <span className="block text-[10px] text-slate-300 font-medium mt-1">
                          ~{facility.estimatedTravelMinutes || facility.etaMins || 10} mins
                        </span>
                      </div>
                    </div>

                    {/* Specialties Pills */}
                    {facility.specialties && facility.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {facility.specialties.map((spec, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-slate-800 text-slate-200 px-2.5 py-0.5 rounded-full border border-slate-700 font-medium"
                          >
                            {spec}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action Buttons: Call & Select as Destination / Navigate */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                      <a
                        href={`tel:${facility.emergencyContactPhone || facility.contactNumber || '108'}`}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full"
                      >
                        <button className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer border border-slate-700">
                          <Phone className="w-3.5 h-3.5 text-slate-300" />
                          <span>Call {facility.emergencyContactPhone || '108'}</span>
                        </button>
                      </a>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectExternalFacility(facility);
                        }}
                        className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                      >
                        <Navigation className="w-3.5 h-3.5 fill-current" />
                        <span>Select & Navigate</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Interactive Leaflet Map (Col 6) */}
        <div className="lg:col-span-6 sticky top-20 space-y-3">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  External Public Trauma Centers Map
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Gray Markers = Public Centers
              </span>
            </div>

            <LeafletMap
              center={[
                selectedFacility?.latitude ?? (selectedFacility?.coordinates ? selectedFacility.coordinates[1] : userLocation.lat),
                selectedFacility?.longitude ?? (selectedFacility?.coordinates ? selectedFacility.coordinates[0] : userLocation.lng),
              ]}
              zoom={12}
              userLocation={[userLocation.lat, userLocation.lng]}
              destinationLocation={
                selectedFacility
                  ? [
                      selectedFacility.latitude ?? (selectedFacility.coordinates ? selectedFacility.coordinates[1] : userLocation.lat),
                      selectedFacility.longitude ?? (selectedFacility.coordinates ? selectedFacility.coordinates[0] : userLocation.lng),
                    ]
                  : null
              }
              hospitals={externalFacilities.map((f) => ({
                _id: f._id || f.externalFacilityId,
                name: f.name || f.facilityName,
                coordinates: f.coordinates || [f.longitude, f.latitude],
                operatingAddress: f.operatingAddress,
                isPartner: false,
                isVerified: false,
                isDestination: (f.externalFacilityId || f._id) === (selectedFacility?.externalFacilityId || selectedFacility?._id),
              }))}
              onMarkerClick={(fac) => {
                const match = externalFacilities.find((p) => (p._id || p.externalFacilityId) === (fac._id || fac.externalFacilityId));
                if (match) setSelectedFacility(match);
              }}
              polylineColor="#64748B"
              className="h-[460px] w-full rounded-xl"
            />

            {/* Selected Facility Quick Bar with Direct Navigation */}
            {selectedFacility && (
              <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <p className="font-bold tracking-tight text-slate-900 truncate">{selectedFacility.name || selectedFacility.facilityName}</p>
                  <p className="text-[11px] text-slate-500 truncate">{selectedFacility.address || formatFacilityAddress(selectedFacility)}</p>
                </div>
                <button
                  onClick={() => handleSelectExternalFacility(selectedFacility)}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow flex-shrink-0 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5 fill-current" />
                  <span>Select Destination</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Confirmation & Disclaimer Modal */}
      {showConfirmModal && facilityToConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Confirm External Destination
                </h3>
                <span className="text-xs text-slate-500">
                  {facilityToConfirm.name || facilityToConfirm.facilityName}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 space-y-2">
              <p className="font-bold">
                Mandatory Emergency Care Notice:
              </p>
              <p>
                Live bed and specialist availability <strong>cannot be confirmed</strong> for external healthcare centers. A managed reservation hold will <strong>not</strong> be created.
              </p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                Direct turn-by-turn navigation will open immediately. For severe emergencies, dial 108 or 112 for ambulance transit.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirmModal(false)}
                disabled={confirmingSelection}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={confirmExternalSelection}
                disabled={confirmingSelection}
                icon={Navigation}
              >
                {confirmingSelection ? 'Confirming...' : 'Acknowledge & Navigate'}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default EmergencyFallbackPage;
