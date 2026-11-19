export const formatIndianPhone = (value = '') => {
  const raw = String(value).trim();
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  const national = digits.startsWith('91') && digits.length >= 12
    ? digits.slice(-10)
    : digits.startsWith('0') && digits.length >= 11
      ? digits.slice(-10)
      : digits.slice(-10);
  return national.length === 10
    ? `+91 ${national.slice(0, 5)} ${national.slice(5)}`
    : raw;
};
