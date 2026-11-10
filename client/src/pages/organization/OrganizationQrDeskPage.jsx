import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { QrCode, Building2, Printer, ShieldCheck } from 'lucide-react';

export const OrganizationQrDeskPage = () => {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQr = async () => {
      try {
        const res = await api.get('/organizations/portal/qr-code');
        if (res.data.success) {
          setQrData(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching org qr code', err);
      } finally {
        setLoading(false);
      }
    };
    fetchQr();
  }, []);

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-12 text-center">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Facility Entrance QR Code</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Print or display this pass at reception for visiting doctors to scan and register their physical presence.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-xs text-slate-400">Loading facility QR...</div>
      ) : (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-5">
          <div className="flex items-center justify-center space-x-2 text-blue-600 font-bold text-xs uppercase tracking-wider">
            <Building2 className="w-4 h-4" />
            <span>{qrData?.organizationName}</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block mx-auto shadow-inner">
            <img
              src={qrData?.qrDataUrl}
              alt="Facility Presence QR"
              className="w-56 h-56 object-contain mx-auto"
            />
            <p className="text-xs font-mono font-bold text-slate-900 mt-3">
              {qrData?.qrCheckinCode}
            </p>
          </div>

          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Doctors scanning this code will be recorded as <strong>PRESENT</strong> on-site at this facility.
          </p>

          <button
            onClick={() => window.print()}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors inline-flex items-center space-x-2"
          >
            <Printer className="w-4 h-4" />
            <span>Print Reception Pass</span>
          </button>
        </div>
      )}
    </div>
  );
};

