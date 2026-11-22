const moneyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Argentina/Buenos_Aires",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Argentina/Buenos_Aires",
});

export function formatMoney(cents: number) {
  return moneyFormatter.format(cents / 100);
}

export function formatDate(value: Date | string | number) {
  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: Date | string | number) {
  return dateTimeFormatter.format(new Date(value));
}

export function formatFacturaNumero(puntoVenta: number, numero: number) {
  return `${String(puntoVenta).padStart(4, "0")}-${String(numero).padStart(8, "0")}`;
}

export function formatReciboNumero(puntoVenta: number, numero: number) {
  return `R ${formatFacturaNumero(puntoVenta, numero)}`;
}

export function normalizeDocumento(value: string) {
  return value.replace(/[.\-\s]/g, "").toUpperCase();
}
