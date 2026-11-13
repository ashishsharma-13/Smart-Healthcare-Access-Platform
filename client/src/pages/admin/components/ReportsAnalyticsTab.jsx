import React, { useState } from 'react';
import api from '../../../services/api';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Table,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { TableSkeleton } from '../../../components/ui/Skeleton';

export const ReportsAnalyticsTab = ({ onNotify }) => {
  const [reportType, setReportType] = useState('DOCTOR_VERIFICATION');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportResult, setReportResult] = useState(null);

  const handleGenerateReport = async (e) => {
    e?.preventDefault();
    try {
      setLoading(true);
      const res = await api.post('/admin/reports/generate', {
        reportType,
        startDate: startDate || null,
        endDate: endDate || null,
      });

      if (res.data?.success) {
        setReportResult(res.data.data);
        onNotify?.({ type: 'success', message: `Generated ${res.data.data.title}.` });
      }
    } catch (err) {
      console.error('Error generating report:', err);
      onNotify?.({ type: 'error', message: 'Could not generate report data.' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams({ format: 'csv' });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await api.get(`/admin/reports/export/${reportType}?${params.toString()}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${reportType.toLowerCase()}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      onNotify?.({ type: 'success', message: 'CSV export downloaded successfully.' });
    } catch (err) {
      console.error('Error exporting CSV:', err);
      onNotify?.({ type: 'error', message: 'Failed to download report CSV.' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Configuration & Filter Header */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
        <form onSubmit={handleGenerateReport} className="flex flex-col lg:flex-row items-end gap-3">
          <div className="flex-1 w-full">
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
              Analytical Domain Report
            </label>
            <select
              value={reportType}
              onChange={(e) => { setReportType(e.target.value); setReportResult(null); }}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
            >
              <option value="DOCTOR_VERIFICATION">Doctor Medical License Verification Audit</option>
              <option value="ORGANIZATION_VERIFICATION">Healthcare Organization Accreditation Report</option>
              <option value="USER_ACTIVITY">Platform User Demographics & Account Governance</option>
              <option value="EMERGENCY_REQUESTS">Emergency Incidents & Operational Triage</option>
              <option value="RESOURCE_RESERVATIONS">Emergency Resource Hold & Reservations</option>
              <option value="APPOINTMENTS">Clinical Consultations & Appointments</option>
            </select>
          </div>

          <div className="w-full sm:w-44">
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>

          <div className="w-full sm:w-44">
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto">
            <Button type="submit" size="sm" variant="primary" icon={BarChart3} loading={loading}>
              Generate Report
            </Button>
            {reportResult && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                icon={Download}
                loading={exporting}
                onClick={handleExportCSV}
              >
                Export CSV
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Report Results */}
      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : !reportResult ? (
        <div className="p-12 bg-white rounded-xl border border-slate-200 text-center shadow-card">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h4 className="font-bold text-slate-800 text-sm">Select Report Domain</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Select an analytical report type and optional date parameters above to generate governance summaries and downloadable CSV data.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary Metric Cards */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2 mb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{reportResult.title}</h3>
                <span className="text-[11px] text-slate-500">
                  Generated at {new Date(reportResult.generatedAt).toLocaleString()} • {reportResult.rowCount} Records Found
                </span>
              </div>
              <Badge variant="primary" size="xs">Audit Certified</Badge>
            </div>

            {/* Dynamic Metric Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(reportResult.metrics || {}).map(([key, val]) => (
                <div key={key} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {key.replace(/([A-Z])/g, ' $1')}
                  </span>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">{val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-100 sticky top-0">
                  <tr>
                    {reportResult.data.length > 0 &&
                      Object.keys(reportResult.data[0])
                        .filter((k) => k !== 'id' && k !== '_id')
                        .map((head) => (
                          <th key={head} className="p-3">
                            {head.replace(/([A-Z])/g, ' $1')}
                          </th>
                        ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportResult.data.slice(0, 50).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      {Object.entries(row)
                        .filter(([k]) => k !== 'id' && k !== '_id')
                        .map(([k, v], cellIdx) => (
                          <td key={cellIdx} className="p-3 text-slate-700">
                            {typeof v === 'boolean'
                              ? v ? 'Yes' : 'No'
                              : v === null || v === undefined
                              ? 'N/A'
                              : String(v)}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {reportResult.data.length > 50 && (
              <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-[11px] text-center text-slate-500">
                Displaying first 50 rows. Download CSV export for full dataset ({reportResult.data.length} total rows).
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

