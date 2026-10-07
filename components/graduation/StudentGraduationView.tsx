import Link from "next/link";
import { BookOpen, CalendarDays, Check, ChevronRight, Circle, Crown, MapPin, PartyPopper, Star } from "lucide-react";
import { BeltSwatch } from "@/components/graduation/BeltSwatch";
import { GRADUATION_AXIS_META, type GraduationItemDraft } from "@/lib/graduation/template";
import { groupItemsByAxis, type ProgressCheck } from "@/lib/graduation/progress";
import type { StudentExamHistoryEntry, StudentModalityGraduation } from "@/lib/graduation/load-student-progress";
import { ExamStatusChip, formatExamDate } from "@/components/graduation/ExamStatusChip";

const card = "mt-4 rounded-2xl border border-border bg-bg-secondary p-4 sm:p-5";
const eyebrow = "m-0 text-xs font-bold uppercase tracking-wider text-text-secondary";

export function StudentGraduationView({ graduation }: { graduation: StudentModalityGraduation }) {
  const { progress, modalityName } = graduation;
  const { current, next } = progress;

  return (
    <div>
      {/* Grau atual */}
      <section className={card} aria-labelledby="grau-atual">
        <p className={eyebrow} id="grau-atual">
          Grau atual · {modalityName}
        </p>
        <div className="mt-3 flex items-center gap-4">
          <BeltSwatch colors={current?.colors ?? []} width={88} height={22} />
          <div className="min-w-0">
            <p className="m-0 text-xl font-bold text-text-primary">{current ? current.name : "Sem graduação"}</p>
            <p className="m-0 mt-0.5 text-sm text-text-secondary">
              {current
                ? [current.motto && `“${current.motto}”`, graduation.lastAwardedAt && `desde ${formatDate(graduation.lastAwardedAt)}`]
                    .filter(Boolean)
                    .join(" · ")
                : "A tua jornada começa aqui."}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Stat value={`${graduation.currentPosition} / ${graduation.totalGrades}`} label="graus" />
          <Stat
            value={String(progress.qualifyingMonthsTotal)}
            label={progress.qualifyingMonthsTotal === 1 ? "mês de treino ativo" : "meses de treino ativo"}
            hint={`Meses com ${graduation.monthlyMinAttendances}+ treinos`}
          />
        </div>
      </section>

      {graduation.convocation && <ConvocationBanner convocation={graduation.convocation} />}

      {next ? <NextGrade graduation={graduation} /> : <TopGrade />}

      {graduation.examHistory.length > 0 && <ExamHistory entries={graduation.examHistory} />}
    </div>
  );
}

function Stat({ value, label, hint }: { value: string; label: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg px-3 py-2.5">
      <p className="m-0 text-lg font-bold text-text-primary">{value}</p>
      <p className="m-0 text-xs text-text-secondary">{label}</p>
      {hint && <p className="m-0 mt-0.5 text-[11px] text-text-secondary opacity-80">{hint}</p>}
    </div>
  );
}

function NextGrade({ graduation }: { graduation: StudentModalityGraduation }) {
  const { progress } = graduation;
  const next = progress.next!;
  const total = progress.checks.length;

  return (
    <>
      <section className={card} aria-labelledby="proximo-grau">
        <p className={eyebrow} id="proximo-grau">
          Próximo grau
        </p>
        <div className="mt-3 flex items-center gap-4">
          <BeltSwatch colors={next.colors} width={88} height={22} />
          <div className="min-w-0">
            <p className="m-0 text-xl font-bold text-text-primary">{next.name}</p>
            {(next.subtitle || next.motto) && (
              <p className="m-0 mt-0.5 text-sm text-text-secondary">
                {[next.subtitle, next.motto && `“${next.motto}”`].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>
        {next.objective && <p className="mb-0 mt-3 text-sm leading-relaxed text-text-primary">{next.objective}</p>}

        {progress.isReadyForExam ? (
          <div
            className="mt-4 flex gap-3 rounded-xl border p-3"
            style={{
              borderColor: "color-mix(in srgb, var(--success) 40%, transparent)",
              background: "color-mix(in srgb, var(--success) 10%, transparent)",
            }}
          >
            <PartyPopper size={20} aria-hidden className="mt-0.5 shrink-0 text-success" />
            <div>
              <p className="m-0 text-sm font-bold text-text-primary">Estás apto para o exame!</p>
              <p className="m-0 mt-0.5 text-sm text-text-secondary">
                Cumpriste todos os requisitos. A academia vai convocar-te para o próximo exame de graduação.
              </p>
            </div>
          </div>
        ) : total > 0 ? (
          <div className="mt-4">
            <div className="flex items-baseline justify-between gap-2">
              <p className="m-0 text-sm font-semibold text-text-primary">Requisitos para o exame</p>
              <p className="m-0 text-sm text-text-secondary">
                {progress.doneCount} de {total}
              </p>
            </div>
            <ProgressBar value={progress.doneCount / total} label={`${progress.doneCount} de ${total} requisitos cumpridos`} />
          </div>
        ) : null}

        {total > 0 && (
          <ul className="m-0 mt-4 flex list-none flex-col gap-2 p-0">
            {progress.checks.map((c) => (
              <CheckRow key={c.key} check={c} />
            ))}
          </ul>
        )}

        {progress.recommendedCourses.length > 0 && (
          <div className="mt-4">
            <p className="m-0 text-sm font-semibold text-text-primary">Cursos recomendados</p>
            <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
              {progress.recommendedCourses.map((c) => (
                <li key={c.courseId}>
                  <Link
                    href={`/dashboard/biblioteca/${c.courseId}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text-primary no-underline"
                  >
                    <BookOpen size={16} aria-hidden className="shrink-0 text-text-secondary" />
                    <span className="min-w-0 flex-1">{c.name}</span>
                    <span className={`text-xs font-semibold ${c.completed ? "text-success" : "text-text-secondary"}`}>
                      {c.completed ? "Concluído" : "Ver curso"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <ExamContent graduation={graduation} />

      {next.notes && (
        <section className={card}>
          <p className={eyebrow}>Sobre o grau {next.name}</p>
          <p className="mb-0 mt-2 whitespace-pre-line text-sm leading-relaxed text-text-primary">{next.notes}</p>
        </section>
      )}
    </>
  );
}

function CheckRow({ check }: { check: ProgressCheck }) {
  const done = check.status === "done";
  const content = (
    <>
      <span
        aria-hidden
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          done ? "bg-success text-white" : "border border-border text-text-secondary"
        }`}
      >
        {done ? <Check size={14} strokeWidth={3} /> : <Circle size={8} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-text-primary">{check.label}</span>
        <span className="block text-xs text-text-secondary">{check.detail}</span>
        {!done && check.progress != null && <ProgressBar value={check.progress} label={check.detail} thin />}
      </span>
      {check.href && !done && <ChevronRight size={16} aria-hidden className="mt-1 shrink-0 text-text-secondary" />}
    </>
  );
  const className = "flex items-start gap-3 rounded-xl border border-border bg-bg px-3 py-2.5";
  return (
    <li>
      <span className="sr-only">{done ? "Cumprido: " : "Por cumprir: "}</span>
      {check.href && !done ? (
        <Link href={check.href} className={`${className} no-underline`}>
          {content}
        </Link>
      ) : (
        <div className={className}>{content}</div>
      )}
    </li>
  );
}

function ProgressBar({ value, label, thin }: { value: number; label: string; thin?: boolean }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={label}
      className={`mt-2 w-full overflow-hidden rounded-full bg-border ${thin ? "h-1.5" : "h-2"}`}
    >
      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
    </div>
  );
}

function ExamContent({ graduation }: { graduation: StudentModalityGraduation }) {
  const { progress } = graduation;
  const next = progress.next!;
  const groups = groupItemsByAxis(progress.newItems);
  const reviewCount = progress.reviewGrades.reduce((s, g) => s + g.items.length, 0);
  const hasCritical = [...progress.newItems, ...progress.reviewGrades.flatMap((g) => g.items)].some((i) => i.isCritical);

  return (
    <section className={card} aria-labelledby="conteudo-exame">
      <p className={eyebrow} id="conteudo-exame">
        O que vais ser avaliado
      </p>
      <p className="mb-0 mt-2 text-sm leading-relaxed text-text-secondary">
        {progress.reviewGrades.length > 0 ? (
          <>
            O exame é <strong className="text-text-primary">cumulativo</strong>: és avaliado item a item no que é novo em {next.name} e em
            tudo o que aprendeste em {progress.reviewGrades[0]?.gradeName}
            {progress.reviewGrades.length > 1 ? ", e em conjunto (por eixo) nos graus mais antigos" : ""}.
          </>
        ) : (
          <>Estes são os conteúdos do teu primeiro exame.</>
        )}
        {hasCritical && (
          <>
            {" "}
            Os itens com <Star size={12} aria-label="estrela" className="inline -mt-0.5 fill-warning text-warning" /> são fundamentais e
            precisam de ser dominados individualmente.
          </>
        )}
      </p>

      <p className="mb-0 mt-4 text-sm font-semibold text-text-primary">Novo em {next.name}</p>
      {groups.length === 0 ? (
        <p className="mb-0 mt-2 text-sm text-text-secondary">A academia ainda não definiu os conteúdos deste grau.</p>
      ) : (
        <div className="mt-2 flex flex-col gap-3">
          {groups.map((g) => (
            <AxisGroup key={g.axis} axis={g.axis} items={g.items} />
          ))}
        </div>
      )}

      {progress.reviewGrades.length > 0 && (
        <div className="mt-5">
          <p className="m-0 text-sm font-semibold text-text-primary">Revisão dos graus anteriores</p>
          <p className="m-0 mt-0.5 text-xs text-text-secondary">
            {reviewCount} {reviewCount === 1 ? "item" : "itens"} que continuam a ser avaliados
          </p>
          <div className="mt-2 flex flex-col gap-2">
            {progress.reviewGrades.map((g, i) => (
              // O grau imediatamente anterior (o primeiro da lista) é avaliado item a item; os mais antigos por eixo.
              <details key={g.gradeId} className="group rounded-xl border border-border bg-bg" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
                  <BeltSwatch colors={g.colors} width={36} height={10} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-text-primary">{g.gradeName}</span>
                    <span className="block text-xs text-text-secondary">
                      {i === 0 ? "Avaliado item a item" : "Avaliado em conjunto, por eixo"}
                    </span>
                  </span>
                  <span className="text-xs text-text-secondary">{g.items.length} itens</span>
                  <ChevronRight size={16} aria-hidden className="shrink-0 text-text-secondary transition-transform group-open:rotate-90" />
                </summary>
                <div className="flex flex-col gap-3 border-t border-border px-3 pb-3 pt-3">
                  {groupItemsByAxis(g.items).map((ag) => (
                    <AxisGroup key={ag.axis} axis={ag.axis} items={ag.items} compact />
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function AxisGroup({ axis, items, compact }: { axis: keyof typeof GRADUATION_AXIS_META; items: GraduationItemDraft[]; compact?: boolean }) {
  const meta = GRADUATION_AXIS_META[axis];
  return (
    <div className={compact ? "" : "rounded-xl border border-border bg-bg p-3"}>
      <p className="m-0 text-sm font-bold text-text-primary">
        <span aria-hidden>{meta.emoji}</span> {meta.label}
        <span className="ml-1.5 text-xs font-normal text-text-secondary">· {meta.hint}</span>
      </p>
      <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2 text-sm text-text-primary">
            {item.isCritical ? (
              <Star size={14} aria-label="Item fundamental" className="mt-0.5 shrink-0 fill-warning text-warning" />
            ) : (
              <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-text-secondary opacity-60" />
            )}
            <span className="min-w-0">
              {item.label}
              {item.description && <span className="block text-xs text-text-secondary">{item.description}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TopGrade() {
  return (
    <section className={`${card} text-center`}>
      <Crown size={28} aria-hidden className="mx-auto text-warning" />
      <p className="m-0 mt-2 text-lg font-bold text-text-primary">Atingiste o grau máximo</p>
      <p className="m-0 mt-1 text-sm text-text-secondary">Agora o teu papel é formar a próxima geração do Reino.</p>
    </section>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" });
}

function ConvocationBanner({ convocation }: { convocation: NonNullable<StudentModalityGraduation["convocation"]> }) {
  return (
    <section
      className="mt-4 rounded-2xl border p-4 sm:p-5"
      style={{ borderColor: "var(--primary)", background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
      aria-labelledby="convocatoria"
    >
      <p className={eyebrow} id="convocatoria" style={{ color: "var(--primary)" }}>
        Estás convocado
      </p>
      <p className="m-0 mt-2 text-lg font-bold text-text-primary">Exame para {convocation.gradeName}</p>
      <p className="m-0 mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
        <span className="inline-flex items-center gap-1">
          <CalendarDays size={14} aria-hidden /> {formatExamDate(convocation.scheduledAt)}
        </span>
        {convocation.location && (
          <span className="inline-flex items-center gap-1">
            <MapPin size={14} aria-hidden /> {convocation.location}
          </span>
        )}
      </p>
      <p className="m-0 mt-2 text-sm text-text-primary">Revê abaixo tudo o que vai ser avaliado. Boa preparação!</p>
    </section>
  );
}

function ExamHistory({ entries }: { entries: StudentExamHistoryEntry[] }) {
  return (
    <section className={card} aria-labelledby="historico-exames">
      <p className={eyebrow} id="historico-exames">
        Os teus exames
      </p>
      <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
        {entries.map((e) => {
          const content = (
            <>
              <BeltSwatch colors={e.gradeColors} width={36} height={10} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-text-primary">{e.gradeName}</span>
                <span className="block text-xs text-text-secondary">{formatExamDate(e.scheduledAt, false)}</span>
              </span>
              <ExamStatusChip status={e.status} />
              {e.status !== "ABSENT" && <ChevronRight size={16} aria-hidden className="shrink-0 text-text-secondary" />}
            </>
          );
          const cls = "flex items-center gap-3 rounded-xl border border-border bg-bg px-3 py-2.5";
          return (
            <li key={e.candidateId}>
              {e.status === "ABSENT" ? (
                <div className={cls}>{content}</div>
              ) : (
                <Link href={`/dashboard/graduacao/exame/${e.candidateId}`} className={`${cls} text-inherit no-underline`}>
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
