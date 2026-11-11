import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { QrCode, Building2, Printer, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';

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
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-card">
        <Badge variant="info" size="xs" className="mb-1">
          Reception Verification Stand
        </Badge>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Facility Reception QR Code Stand
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Print or mount at the entrance triage desk for medical practitioners to register physical on-site presence.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-xs text-slate-400">Loading facility QR...</div>
      ) : (
        <div className="bg-white rounded-xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-5">
          <div className="flex items-center justify-center gap-1.5 text-brand-700 font-bold text-xs uppercase tracking-wider">
            <Building2 className="w-4 h-4" />
            <span>{qrData?.organizationName}</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 inline-block mx-auto">
            {qrData?.qrDataUrl ? (
              <img
                src={qrData.qrDataUrl}
                alt="Facility Presence QR"
                className="w-52 h-52 object-contain mx-auto"
              />
            ) : (
              <div className="w-52 h-52 flex items-center justify-center bg-white rounded border border-slate-200">
                <QrCode className="w-40 h-40 text-slate-900" />
              </div>
            )}
            <p className="text-xs font-mono font-bold text-slate-900 mt-2">
              CODE: {qrData?.qrCheckinCode}
            </p>
          </div>

          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Doctors scanning this terminal QR are marked as <strong className="text-presence-700">PRESENT ON-SITE</strong> on the national platform.
          </p>

          <Button
            size="md"
            variant="primary"
            icon={Printer}
            onClick={() => window.print()}
          >
            Print Reception Stand Poster
          </Button>
        </div>
      )}
    </div>
  );
};

export default OrganizationQrDeskPage;
