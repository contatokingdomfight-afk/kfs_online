import { MapPin, Phone } from "lucide-react";
import { SCHOOL_PUBLIC_CONTACT, formatSchoolPhoneForDisplay, getSchoolMapsUrl } from "@/lib/school-contact";

type Props = {
  title: string;
  directionsLabel: string;
};

export function ModalidadeLocationSection({ title, directionsLabel }: Props) {
  return (
    <section className="border-t border-[var(--border)] py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">{title}</h2>
        <div className="mx-auto mt-8 flex max-w-md flex-col items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 text-center">
          <div className="flex items-center gap-2 text-[var(--text-primary)]">
            <MapPin className="h-5 w-5 shrink-0 text-[var(--primary)]" aria-hidden />
            <span>{SCHOOL_PUBLIC_CONTACT.address}</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--text-primary)]">
            <Phone className="h-5 w-5 shrink-0 text-[var(--primary)]" aria-hidden />
            <a href={`tel:${SCHOOL_PUBLIC_CONTACT.phone}`} className="hover:text-[var(--primary)]">
              {formatSchoolPhoneForDisplay(SCHOOL_PUBLIC_CONTACT.phone)}
            </a>
          </div>
          <a
            href={getSchoolMapsUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary mt-2 inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold"
          >
            {directionsLabel} →
          </a>
        </div>
      </div>
    </section>
  );
}
