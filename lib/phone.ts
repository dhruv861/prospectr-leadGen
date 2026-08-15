import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

const DEFAULT_COUNTRY: CountryCode = "IN";

export function toWhatsAppLink(
  phone: string | null | undefined,
  countryHint: CountryCode = DEFAULT_COUNTRY,
  message?: string
): string | null {
  if (!phone) return null;
  const parsed = parsePhoneNumberFromString(phone, countryHint);
  if (!parsed || !parsed.isValid()) return null;
  const digits = parsed.number.replace(/^\+/, "");
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
