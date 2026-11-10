import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { LeafletMap } from '../../components/common/LeafletMap';
import {
  Navigation,
  MapPin,
  Building2,
  CheckCircle2,
  Phone,
  AlertTriangle,
  XCircle,
  Clock,
} from 'lucide-react';

export const EmergencyTrackingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [emergency, setEmergency] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmergency();

    if (socket) {
      socket.emit('emergency:subscribe', { emergencyRequestId: id });
      socket.on('emergency:status_change', () => fetchEmergency());
    }

    return () => {
      if (socket) {
        socket.emit('emergency:unsubscribe', { emergencyRequestId: id });
        socket.off('emergency:status_change');
      }
    };
  }, [id, socket]);

  const fetchEmergency = async () => {
    try {
      const res = await api.get(`/emergency/${id}`);
      if (res.data.success) {
        setEmergency(res.data.data.emergency);
      }
    } catch (err) {
      console.error('Error fetching emergency', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEmergency = async () => {
    const reason = prompt('Please specify cancellation reason:');
    if (!reason) return;

    try {
      await api.post(`/emergency/${id}/cancel`, { reason });
      fetchEmergency();
    } catch (err) {
      alert('Error cancelling emergency: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading navigation tracking...</div>;
  }

  const destination = emergency?.selectedOrganizationId;
  const userCoords = emergency?.location?.coordinates
    ? [emergency.location.coordinates[1], emergency.location.coordinates[0]] // [lat, lng]
    : [28.6139, 77.2090];
  const destCoords = destination?.location?.coordinates
    ? [destination.location.coordinates[1], destination.location.coordinates[0]]
    : [28.6200, 77.2150];

  const statusSteps = [
    'CREATED',
    'BROADCASTED',
    'DESTINATION_SELECTED',
    'RESOURCES_RESERVED',
    'PATIENT_EN_ROUTE',
    'ARRIVED',
  ];
  const currentStepIdx = statusSteps.indexOf(emergency?.status);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-red-600 uppercase tracking-wider">
            Live Emergency Navigation
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            En Route to {destination?.name || 'Destination Hospital'}
          </h1>
        </div>

        <div className="flex items-center space-x-3">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-extrabold uppercase tracking-wider rounded-full">
            Status: {emergency?.status}
          </span>
          {emergency?.status !== 'ARRIVED' && emergency?.status !== 'CANCELLED' && (
            <button
              onClick={handleCancelEmergency}
              className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Progress Stepper matching Screen 11 */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="flex items-center justify-between min-w-[500px]">
          {statusSteps.map((step, idx) => {
            const isCompleted = currentStepIdx >= idx;
            const isCurrent = currentStepIdx === idx;
            return (
              <div key={step} className="flex-1 flex items-center">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCompleted
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : isCurrent
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span
                    className={`text-[10px] uppercase font-bold mt-1.5 text-center ${
                      isCompleted ? 'text-emerald-700' : isCurrent ? 'text-blue-600' : 'text-slate-400'
                    }`}
                  >
                    {step.replace(/_/g, ' ')}
                  </span>
                </div>
                {idx < statusSteps.length - 1 && (
                  <div
                    className={`h-1 flex-1 -mt-4 transition-all ${
                      currentStepIdx > idx ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Map & Facility info */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Map (Col 8) */}
        <div className="lg:col-span-8 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-2">
            <span className="flex items-center">
              <Navigation className="w-4 h-4 text-blue-600 mr-1.5" />
              Live Route Navigation
            </span>
            <span className="text-slate-500">Connecting GPS Coordinates</span>
          </div>

          <LeafletMap
            center={destCoords}
            zoom={13}
            userLocation={userCoords}
            destinationLocation={destCoords}
            hospitals={[
              {
                name: destination?.name,
                coordinates: destination?.location?.coordinates,
                address: destination?.address,
                isSuitable: true,
              },
            ]}
            className="h-96 w-full rounded-2xl shadow-inner border border-slate-200"
          />
        </div>

        {/* Facility Details (Col 4) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Hospital Destination
            </h3>

            <div className="space-y-2">
              <h4 className="text-base font-extrabold text-slate-900">{destination?.name}</h4>
              <p className="text-xs text-slate-500 flex items-start">
                <MapPin className="w-4 h-4 text-slate-400 mr-1.5 flex-shrink-0 mt-0.5" />
                {destination?.address?.street}, {destination?.address?.city}
              </p>
            </div>

            {destination?.emergencyContactPhone && (
              <a
                href={`tel:${destination.emergencyContactPhone}`}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center space-x-2"
              >
                <Phone className="w-4 h-4" />
                <span>Call Emergency Desk</span>
              </a>
            )}

            <div className="pt-3 border-t border-slate-100 text-xs space-y-1 text-slate-600">
              <p><strong>Patient:</strong> {emergency?.patientName}</p>
              <p><strong>Code:</strong> {emergency?.requestCode}</p>
              <p><strong>Category:</strong> {emergency?.emergencyType?.toUpperCase()}</p>
            </div>
          </div>

          {emergency?.status === 'ARRIVED' && (
            <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-3xl text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="text-sm font-bold text-emerald-900">Arrived at Destination</h4>
              <p className="text-xs text-emerald-700">
                You have reached reception. The hospital has allocated your reserved bed.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

