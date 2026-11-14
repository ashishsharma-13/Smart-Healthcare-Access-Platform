import React from 'react';

export const Table = ({ children, className = '' }) => (
  <div className="w-full overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white shadow-2xs">
    <table className={`w-full text-left text-xs ${className}`}>
      {children}
    </table>
  </div>
);

export const TableHeader = ({ children, className = '' }) => (
  <thead className={`bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider ${className}`}>
    {children}
  </thead>
);

export const TableBody = ({ children, className = '' }) => (
  <tbody className={`divide-y divide-[#E2E8F0] text-[#111827] ${className}`}>
    {children}
  </tbody>
);

export const TableRow = ({ children, onClick, className = '', hover = true }) => (
  <tr
    onClick={onClick}
    className={`transition-colors ${hover ? 'hover:bg-[#F8FAFC]' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
  >
    {children}
  </tr>
);

export const TableHead = ({ children, className = '' }) => (
  <th scope="col" className={`py-3 px-4 font-semibold text-[#1A1953] ${className}`}>
    {children}
  </th>
);

export const TableCell = ({ children, className = '' }) => (
  <td className={`py-3 px-4 text-[#111827] align-middle ${className}`}>
    {children}
  </td>
);

export default Table;
