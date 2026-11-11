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
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';

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
    return (
      <div className="max-w-5xl mx-auto space-y-4 p-8 text-center text-xs text-slate-400">
        Loading navigation telemetry...
      </div>
    );
  }

  const destination = emergency?.selectedOrganizationId;
  const userCoords = emergency?.location?.coordinates
    ? [emergency.location.coordinates[1], emergency.location.coordinates[0]]
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
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="emergency" size="xs" dot pulseDot>
              Live Telemetry Navigation
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            En Route to {destination?.name || 'Destination Trauma Center'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time GPS routing and hospital trauma arrival coordination
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="presence" size="sm">
            {emergency?.status?.replace(/_/g, ' ')}
          </Badge>
          {emergency?.status !== 'ARRIVED' && emergency?.status !== 'CANCELLED' && (
            <Button
              size="sm"
              variant="outline"
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              onClick={handleCancelEmergency}
            >
              Cancel Alert
            </Button>
          )}
        </div>
      </div>

      {/* Progress Stepper */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-card overflow-x-auto">
        <div className="flex items-center justify-between min-w-[500px]">
          {statusSteps.map((step, idx) => {
            const isCompleted = currentStepIdx >= idx;
            const isCurrent = currentStepIdx === idx;
            return (
              <div key={step} className="flex-1 flex items-center">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCompleted
                        ? 'bg-presence-600 text-white shadow-xs'
                        : isCurrent
                        ? 'bg-brand-600 text-white ring-2 ring-brand-200'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span
                    className={`text-[9px] uppercase font-bold mt-1 text-center tracking-wider ${
                      isCompleted ? 'text-presence-700' : isCurrent ? 'text-brand-600' : 'text-slate-400'
                    }`}
                  >
                    {step.replace(/_/g, ' ')}
                  </span>
                </div>
                {idx < statusSteps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 -mt-3.5 transition-all ${
                      currentStepIdx > idx ? 'bg-presence-500' : 'bg-slate-200'
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
        
        {/* Leaflet Map (Col 8) */}
        <div className="lg:col-span-8 bg-white p-3.5 rounded-xl border border-slate-200 shadow-card space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 px-1">
            <span className="flex items-center gap-1.5">
              <Navigation className="w-4 h-4 text-brand-600" />
              <span>Turn-by-Turn Route Telemetry</span>
            </span>
            <span className="text-slate-400 text-[11px]">Connecting GPS Live</span>
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
            className="h-96 w-full rounded-lg"
          />
        </div>

        {/* Facility Details (Col 4) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-card space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Assigned Facility
            </h3>

            <div className="space-y-2">
              <h4 className="text-base font-extrabold text-slate-900">{destination?.name}</h4>
              <p className="text-xs text-slate-500 flex items-start">
                <MapPin className="w-4 h-4 text-slate-400 mr-1.5 flex-shrink-0 mt-0.5" />
                <span>
                  {destination?.operatingAddress?.streetName
                    ? `${destination.operatingAddress.buildingNumber ? destination.operatingAddress.buildingNumber + ', ' : ''}${destination.operatingAddress.streetName}, ${destination.operatingAddress.city}`
                    : `${destination?.address?.street || ''}, ${destination?.address?.city || ''}`}
                </span>
              </p>
            </div>

            {destination?.emergencyContactPhone && (
              <a
                href={`tel:${destination.emergencyContactPhone}`}
                className="w-full"
              >
                <Button variant="presence" size="md" className="w-full" icon={Phone}>
                  Call Trauma Desk: {destination.emergencyContactPhone}
                </Button>
              </a>
            )}

            <div className="pt-3 border-t border-slate-100 text-xs space-y-1.5 text-slate-600">
              <p><strong className="text-slate-900">Patient:</strong> {emergency?.patientName}</p>
              <p><strong className="text-slate-900">Pass Code:</strong> <span className="font-mono">{emergency?.requestCode}</span></p>
              <p><strong className="text-slate-900">Condition:</strong> {emergency?.emergencyType?.toUpperCase()}</p>
            </div>
          </div>

          {emergency?.status === 'ARRIVED' && (
            <div className="bg-presence-50 border border-presence-200 p-4 rounded-xl text-center space-y-1">
              <CheckCircle2 className="w-7 h-7 text-presence-600 mx-auto" />
              <h4 className="text-xs font-bold text-presence-900">Arrived at Trauma Center</h4>
              <p className="text-[11px] text-presence-700">
                You have reached reception. The facility has allocated your reserved bed.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default EmergencyTrackingPage;
