import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Users, CheckCircle2, ShieldAlert, Clock, Award } from 'lucide-react';

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
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Physicians Currently Present On-Site</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Verified doctors who have completed QR check-in and are physically present in the facility.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading doctor presence records...</div>
      ) : doctors.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
          <Users className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No doctors currently checked in</h3>
          <p className="text-xs text-slate-500">
            Doctors scan the facility entrance QR code upon arrival to register their presence.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {doctors.map((doc) => (
            <div
              key={doc._id}
              className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm flex items-start space-x-4"
            >
              <img
                src={doc.userId?.avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'}
                alt={doc.userId?.name}
                className="w-14 h-14 rounded-2xl object-cover border border-slate-100"
              />
              <div className="space-y-1">
                <div className="flex items-center space-x-1.5">
                  <h3 className="text-sm font-bold text-slate-900">{doc.userId?.name}</h3>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-xs font-semibold text-blue-600">{doc.specialization}</p>

                <div className="flex items-center space-x-2 pt-1 text-[11px]">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    PRESENT ON-SITE
                  </span>
                  {doc.isAvailableForEmergency && (
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
                      EMERGENCY DUTY
                    </span>
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

