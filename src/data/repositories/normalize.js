export function cleanText(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text === '' ? null : text;
}

export function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function nowISO() {
  return new Date().toISOString();
}
