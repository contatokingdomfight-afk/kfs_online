import { GYM_ENROLLMENT_INFO } from "@/lib/enrollment-form";

export const SCHOOL_PUBLIC_CONTACT = {
  address: GYM_ENROLLMENT_INFO.address,
  phone: GYM_ENROLLMENT_INFO.phone,
} as const;

/** Ex.: +351936832300 → 936 832 300 */
export function formatSchoolPhoneForDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("351") && digits.length >= 12) {
    const local = digits.slice(3, 12);
    return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  }
  return phone;
}

export function getSchoolMapsUrl(address: string = SCHOOL_PUBLIC_CONTACT.address): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
