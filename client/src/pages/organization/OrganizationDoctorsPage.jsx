import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Users, CheckCircle2, ShieldAlert, Clock, Award } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';

export const OrganizationDoctorsPage = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await api.get('/organizations/portal/me');
        if (res.data.success) {
          setDoctors(res.data.data.doctorsPresent || []);
        }
      } catch (err) {
        console.error('Error fetching doctors present', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-card">
        <Badge variant="presence" size="xs" dot className="mb-1">
          Active On-Site Staff
        </Badge>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Physicians Currently Present On-Site
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Verified medical doctors who have completed terminal QR check-in and are physically present in the facility.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-white border border-slate-200 rounded-xl p-4 animate-pulse" />
          ))}
        </div>
      ) : doctors.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Physicians Checked In"
          description="Doctors scan the facility entrance QR terminal upon arrival to log physical on-site presence."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {doctors.map((doc) => (
            <div
              key={doc._id}
              className="p-4 bg-white rounded-xl border border-slate-200 shadow-card flex items-start gap-3.5 hover:border-brand-300 transition-colors"
            >
              <img
                src={doc.userId?.avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'}
                alt={doc.userId?.name}
                className="w-12 h-12 rounded-lg object-cover border border-slate-200 flex-shrink-0"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-slate-900">{doc.userId?.name}</h3>
                  <CheckCircle2 className="w-3.5 h-3.5 text-presence-600" />
                </div>
                <p className="text-xs font-semibold text-brand-700">{doc.specialization}</p>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <Badge variant="presence" size="xs" dot>
                    PRESENT ON-SITE
                  </Badge>
                  {doc.isAvailableForEmergency && (
                    <Badge variant="emergency" size="xs">
                      EMERGENCY ON-CALL
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrganizationDoctorsPage;
