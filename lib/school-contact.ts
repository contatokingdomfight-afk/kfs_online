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

/** Link directo ao separador de Avaliações do perfil "Kingdom Fight School" no Google Maps (não só a ficha geral). */
export const SCHOOL_GOOGLE_REVIEWS_URL =
  "https://www.google.com/maps/place/Kingdom+Fight+School/@38.7856476,-9.345031,17z/data=!4m8!3m7!1s0xd1ecf7f29c1591b:0x1ba4a66db1613c5e!8m2!3d38.7856476!4d-9.345031!9m1!1b1!16s%2Fg%2F11wb07yjzn";
