import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

const DEFAULT_COUNTRY: CountryCode = "IN";

export function toWhatsAppLink(
  phone: string | null | undefined,
  countryHint: CountryCode = DEFAULT_COUNTRY
): string | null {
  if (!phone) return null;
  const parsed = parsePhoneNumberFromString(phone, countryHint);
  if (!parsed || !parsed.isValid()) return null;
  const digits = parsed.number.replace(/^\+/, "");
  return `https://wa.me/${digits}`;
}
