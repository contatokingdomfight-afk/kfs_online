"use client";

import { useState, useMemo, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowLeft, Baby, CheckCircle2, Dumbbell, MapPin, MessageCircle, Swords } from "lucide-react";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { submitTrialRequest, type SubmitTrialResult } from "./actions";

type ModalityOption = { value: string; label: string };
type LessonSlot = { id: string; occurrenceDate: string; label: string; startTime: string; endTime: string };
type Step = 1 | 2 | 3;

const PRIMARY = "var(--primary)";

function buildNoSlotsWhatsAppUrl(phone: string, locale: Locale, modalityLabel?: string): string {
  const digits = phone.replace(/\D/g, "");
  const message =
    locale === "en"
      ? `Hi! I'd like to book a trial class${modalityLabel ? ` for ${modalityLabel}` : ""}, but I couldn't find an available time online.`
      : `Olá! Gostaria de marcar uma aula experimental${modalityLabel ? ` de ${modalityLabel}` : ""}, mas não encontrei horário disponível online.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function ymdToDate(ymd: string): Date {
  return new Date(`${ymd}T12:00:00Z`);
}

function dayChip(ymd: string, locale: Locale) {
  const d = ymdToDate(ymd);
  const tag = locale === "en" ? "en-GB" : "pt-PT";
  return {
    weekday: d.toLocaleDateString(tag, { weekday: "short", timeZone: "UTC" }).replace(".", "").slice(0, 3),
    day: d.getUTCDate(),
    month: d.toLocaleDateString(tag, { month: "short", timeZone: "UTC" }).replace(".", ""),
  };
}

function longDate(ymd: string, locale: Locale): string {
  const s = ymdToDate(ymd).toLocaleDateString(locale === "en" ? "en-GB" : "pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function periodLabel(startTime: string, locale: Locale): string {
  const h = Number(startTime.slice(0, 2));
  if (locale === "en") return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
  return h < 12 ? "manhã" : h < 18 ? "tarde" : "noite";
}

function ModalityIcon({ code }: { code: string }) {
  const c = code.toUpperCase();
  if (c.includes("KID")) return <Baby size={20} aria-hidden />;
  if (c.includes("BOX")) return <Dumbbell size={20} aria-hidden />;
  return <Swords size={20} aria-hidden />;
}

const cardBase: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  width: "100%",
  padding: "14px 14px",
  borderRadius: 14,
  background: "var(--bg-secondary)",
  border: "1px solid var(--border)",
  color: "var(--text-primary)",
  font: "inherit",
  textAlign: "left",
  cursor: "pointer",
};

const selectedRing: React.CSSProperties = { border: `2px solid ${PRIMARY}`, padding: "13px 13px" };

const labelStyle: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: "var(--text-primary)" };

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending} style={{ minHeight: 50, fontSize: 16, fontWeight: 700 }}>
      {pending ? pendingLabel : label}
    </button>
  );
}

export function FormularioExperimental({
  locale,
  schools,
  defaultSchoolId,
  modalityOptions,
  lessonsBySchoolId,
  referrerStudentId,
  interestedPlanName,
  schoolPhone,
}: {
  locale: Locale;
  schools: { id: string; name: string }[];
  defaultSchoolId?: string;
  modalityOptions: ModalityOption[];
  lessonsBySchoolId: Record<string, Record<string, LessonSlot[]>>;
  /** Aluno que partilhou o link de indicação (`?ref=`), se aplicável. */
  referrerStudentId?: string | null;
  /** Plano clicado na home (`?plano=<id>`), já resolvido para o nome público. */
  interestedPlanName?: string | null;
  schoolPhone: string;
}) {
  const t = getTranslations(locale);
  const en = locale === "en";
  const [state, formAction] = useActionState(submitTrialRequest, null as SubmitTrialResult | null);
  const [step, setStep] = useState<Step>(1);
  const [schoolId, setSchoolId] = useState(defaultSchoolId || schools[0]?.id || "");
  const [modality, setModality] = useState("");
  const [day, setDay] = useState("");
  const [slotKey, setSlotKey] = useState("");

  const modalitiesForSchool = useMemo(() => {
    const byMod = lessonsBySchoolId[schoolId] ?? {};
    return modalityOptions
      .map((o) => {
        const slots = byMod[o.value] ?? [];
        const weekdays = new Set(slots.map((s) => ymdToDate(s.occurrenceDate).getUTCDay()));
        return { ...o, slots, daysPerWeek: weekdays.size };
      })
      .filter((o) => o.slots.length > 0);
  }, [schoolId, lessonsBySchoolId, modalityOptions]);

  const current = modalitiesForSchool.find((m) => m.value === modality);
  const slots = current?.slots ?? [];
  const days = useMemo(() => [...new Set(slots.map((s) => s.occurrenceDate))], [slots]);
  const slotsForDay = slots.filter((s) => s.occurrenceDate === day);
  const selectedSlot = slots.find((s) => `${s.id}::${s.occurrenceDate}` === slotKey);
  const schoolName = schools.find((s) => s.id === schoolId)?.name ?? "";

  function chooseSchool(id: string) {
    setSchoolId(id);
    setModality("");
    setDay("");
    setSlotKey("");
  }

  function chooseModality(code: string) {
    if (code !== modality) {
      setDay("");
      setSlotKey("");
    }
    setModality(code);
  }

  function goToDay() {
    if (!current) return;
    if (!day || !days.includes(day)) setDay(days[0] ?? "");
    setStep(2);
  }

  const whatsappHelp = (
    <a
      href={buildNoSlotsWhatsAppUrl(schoolPhone, locale, current?.label)}
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text-secondary)", textDecoration: "none" }}
    >
      <MessageCircle size={16} aria-hidden />
      <span>
        {en ? "No time works for you?" : "Nenhum horário te serve?"}{" "}
        <span style={{ color: PRIMARY, fontWeight: 600 }}>{en ? "Message us" : "Fala connosco"}</span>
      </span>
    </a>
  );

  const backButton = (to: Step, label: string) => (
    <button
      type="button"
      onClick={() => setStep(to)}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: 0, padding: 0, color: "var(--text-secondary)", font: "inherit", fontSize: 14, cursor: "pointer" }}
    >
      <ArrowLeft size={16} aria-hidden />
      {label}
    </button>
  );

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {referrerStudentId && <input type="hidden" name="referrerStudentId" value={referrerStudentId} />}
      {interestedPlanName && <input type="hidden" name="interestedPlanName" value={interestedPlanName} />}
      <input type="hidden" name="schoolId" value={schoolId} />
      <input type="hidden" name="modality" value={modality} />
      <input type="hidden" name="lessonSlot" value={slotKey} />

      <div role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step} aria-label={en ? `Step ${step} of 3` : `Passo ${step} de 3`} style={{ display: "flex", gap: 6 }}>
        {[1, 2, 3].map((n) => (
          <span key={n} style={{ flex: 1, height: 5, borderRadius: 3, background: n <= step ? PRIMARY : "var(--border)", transition: "background 0.2s" }} />
        ))}
      </div>

      {interestedPlanName && (
        <div style={{ padding: "10px 14px", borderRadius: 12, background: "color-mix(in srgb, var(--primary) 10%, transparent)", fontSize: 14, color: "var(--text-primary)" }}>
          {t("trialFormInterestedPlan")}: <strong>{interestedPlanName}</strong>
        </div>
      )}

      {step === 1 && (
        <>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{en ? "Which class do you want to try?" : "Que aula queres experimentar?"}</h2>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>
              {en ? "Your first class is free." : "A primeira aula é gratuita."}
            </p>
          </div>

          {schools.length > 1 && (
            <div role="radiogroup" aria-label={t("trialFormSchool")} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {schools.map((s) => {
                const on = s.id === schoolId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => chooseSchool(s.id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      minHeight: 38,
                      padding: "0 14px",
                      borderRadius: 999,
                      border: on ? `1px solid ${PRIMARY}` : "1px solid var(--border)",
                      background: on ? PRIMARY : "var(--bg-secondary)",
                      color: on ? "#fff" : "var(--text-primary)",
                      font: "inherit",
                      fontSize: 13,
                      fontWeight: on ? 700 : 500,
                      cursor: "pointer",
                    }}
                  >
                    <MapPin size={14} aria-hidden />
                    {s.name}
                  </button>
                );
              })}
            </div>
          )}

          {modalitiesForSchool.length > 0 ? (
            <div role="radiogroup" aria-label={t("trialFormModality")} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {modalitiesForSchool.map((m) => {
                const on = m.value === modality;
                return (
                  <button
                    key={m.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => chooseModality(m.value)}
                    style={{ ...cardBase, ...(on ? selectedRing : null) }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 42,
                        height: 42,
                        flexShrink: 0,
                        borderRadius: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "color-mix(in srgb, var(--primary) 14%, transparent)",
                        color: PRIMARY,
                      }}
                    >
                      <ModalityIcon code={m.value} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 16, fontWeight: 700 }}>{m.label}</span>
                      <span style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
                        {en
                          ? `${m.daysPerWeek} ${m.daysPerWeek === 1 ? "day" : "days"} a week`
                          : `${m.daysPerWeek} ${m.daysPerWeek === 1 ? "dia" : "dias"} por semana`}
                      </span>
                    </span>
                    {on ? <CheckCircle2 size={22} color="var(--primary)" aria-hidden /> : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, borderRadius: 14, background: "var(--bg-secondary)", fontSize: 15, color: "var(--text-secondary)" }}>
              <span>{t("trialFormNoSlots")}</span>
              <a
                href={buildNoSlotsWhatsAppUrl(schoolPhone, locale)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ textAlign: "center", textDecoration: "none" }}
              >
                {t("trialFormNoSlotsWhatsApp")}
              </a>
            </div>
          )}

          {modalitiesForSchool.length > 0 && (
            <button type="button" className="btn btn-primary" disabled={!current} onClick={goToDay} style={{ minHeight: 50, fontSize: 16, fontWeight: 700 }}>
              {en ? "Continue" : "Continuar"}
            </button>
          )}
        </>
      )}

      {step === 2 && current && (
        <>
          {backButton(1, current.label)}
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{en ? "Pick a day" : "Escolhe o dia"}</h2>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>{en ? "Slide to see more days." : "Desliza para veres mais dias."}</p>
          </div>

          <div role="radiogroup" aria-label={en ? "Day" : "Dia"} className="swipe-carousel-scroll" style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2 }}>
            {days.map((ymd) => {
              const on = ymd === day;
              const c = dayChip(ymd, locale);
              return (
                <button
                  key={ymd}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={longDate(ymd, locale)}
                  onClick={() => {
                    setDay(ymd);
                    setSlotKey("");
                  }}
                  style={{
                    flex: "0 0 58px",
                    padding: "8px 0",
                    borderRadius: 14,
                    border: on ? `1px solid ${PRIMARY}` : "1px solid var(--border)",
                    background: on ? PRIMARY : "var(--bg-secondary)",
                    color: on ? "#fff" : "var(--text-secondary)",
                    font: "inherit",
                    textAlign: "center",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ display: "block", fontSize: 12, textTransform: "capitalize" }}>{c.weekday}</span>
                  <span style={{ display: "block", fontSize: 20, fontWeight: 800, color: on ? "#fff" : "var(--text-primary)", lineHeight: 1.2 }}>{c.day}</span>
                  <span style={{ display: "block", fontSize: 11, textTransform: "capitalize" }}>{c.month}</span>
                </button>
              );
            })}
          </div>

          {day && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={labelStyle}>{longDate(day, locale)}</span>
              <div role="radiogroup" aria-label={en ? "Time" : "Hora"} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
                {slotsForDay.map((s) => {
                  const key = `${s.id}::${s.occurrenceDate}`;
                  const on = key === slotKey;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setSlotKey(key)}
                      style={{ ...cardBase, ...(on ? selectedRing : null), flexDirection: "column", alignItems: "center", gap: 2, textAlign: "center" }}
                    >
                      <span style={{ fontSize: 17, fontWeight: 800 }}>{s.startTime.slice(0, 5)}</span>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                        {periodLabel(s.startTime, locale)} · {en ? "until" : "até"} {s.endTime.slice(0, 5)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {whatsappHelp}

          <button type="button" className="btn btn-primary" disabled={!selectedSlot} onClick={() => setStep(3)} style={{ minHeight: 50, fontSize: 16, fontWeight: 700 }}>
            {en ? "Continue" : "Continuar"}
          </button>
        </>
      )}

      {step === 3 && current && selectedSlot && (
        <>
          {backButton(2, en ? "Day and time" : "Dia e hora")}
          <div
            style={{
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid color-mix(in srgb, var(--primary) 45%, transparent)",
              background: "color-mix(in srgb, var(--primary) 8%, transparent)",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 800 }}>{current.label}</span>
            <span style={{ fontSize: 14, color: "var(--text-primary)" }}>
              {longDate(selectedSlot.occurrenceDate, locale)} · {selectedSlot.startTime.slice(0, 5)}–{selectedSlot.endTime.slice(0, 5)}
            </span>
            {schoolName ? <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{schoolName}</span> : null}
          </div>

          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{en ? "Your details" : "Os teus dados"}</h2>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>
              {en ? "We'll confirm your spot by WhatsApp." : "Confirmamos a tua vaga por WhatsApp."}
            </p>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={labelStyle}>{t("trialFormName")}</span>
            <input type="text" name="name" required className="input" placeholder={t("trialFormPlaceholderName")} autoComplete="name" />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={labelStyle}>{en ? "Mobile" : "Telemóvel"}</span>
            <input type="tel" name="contact" required className="input" placeholder={t("trialFormPlaceholderPhone")} autoComplete="tel" inputMode="tel" />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={labelStyle}>
              {t("trialFormEmail")} <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>{t("waitlistOptional")}</span>
            </span>
            <input type="email" name="email" className="input" placeholder={t("trialFormPlaceholderEmail")} autoComplete="email" inputMode="email" />
          </label>

          {state?.error && (
            <p role="alert" style={{ margin: 0, fontSize: 15, color: "var(--danger)" }}>
              {state.error}
            </p>
          )}

          <SubmitButton label={en ? "Book free class" : "Marcar aula grátis"} pendingLabel={en ? "Booking…" : "A marcar…"} />
        </>
      )}
    </form>
  );
}
