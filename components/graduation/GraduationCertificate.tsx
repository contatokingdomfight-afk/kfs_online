import type { CertificateData } from "@/lib/graduation/certificate";
import { formatCertificateDate } from "@/lib/graduation/certificate";
import s from "./certificate.module.css";

const EMBLEM = "/brand/kfs-emblem.svg";

/** Impressão: só o certificado, A4 horizontal, sem margens (CSS global — os módulos não aceitam html/body). */
const PRINT_CSS = `@media print {
  @page { size: A4 landscape; margin: 0; }
  html, body { height: 210mm !important; overflow: hidden !important; }
  body * { visibility: hidden !important; }
  .kfs-cert-print, .kfs-cert-print * { visibility: visible !important; }
  .kfs-cert-print { position: fixed !important; left: 0; top: 0; width: 297mm !important; height: 210mm !important; margin: 0 !important; z-index: 2147483647; }
  .kfs-cert-print [data-certificate] { border-radius: 0; }
}`;

/** Certificado de graduação (A4 horizontal, escala com a largura do contentor). */
export function GraduationCertificate({ data, id }: { data: CertificateData; id?: string }) {
  const colors = data.gradeColors.length ? data.gradeColors : ["#a8a9ad"];
  return (
    <div className={`${s.wrap} kfs-cert-print`} id={id}>
      <style>{PRINT_CSS}</style>
      <div className={s.cert} data-certificate>
        <span className={`${s.oct} ${s.octA}`} />
        <span className={`${s.oct} ${s.octB}`} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={s.wm} src={EMBLEM} alt="" />
        <div className={s.fr} />
        <div className={s.fr2} />

        <div className={s.hd}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={s.hemb} src={EMBLEM} alt="Kingdom Fight School" />
          <div className={s.hbrand}>
            <div className={`${s.kf} ${s.silver}`}>KINGDOM FIGHT</div>
            <div className={`${s.sch} ${s.silver}`}>
              <span>SCHOOL</span>
            </div>
            {data.schoolNif && <div className={s.nif}>NIF {data.schoolNif}</div>}
          </div>
        </div>

        <div className={`${s.ttl} ${s.silver}`}>CERTIFICADO DE GRADUAÇÃO</div>
        <div className={s.mod}>{data.modalityName}</div>

        <div className={s.certTxt}>Certifica-se que</div>
        <div className={s.name}>{data.studentName}</div>
        {data.studentNif && (
          <div className={s.nif} data-private>
            NIF {data.studentNif}
          </div>
        )}
        <div className={s.nline} />
        <div className={s.grade}>concluiu com aprovação o exame de graduação e obteve o grau</div>
        <div className={s.gname}>{data.gradeName.replace(/\s*\/\s*/g, " / ")}</div>
        <span className={s.rib}>
          {colors.map((c, i) => (
            <i key={i} style={{ background: c }} />
          ))}
        </span>

        <div className={s.foot}>
          <Signature sig={data.signatures[0]} />
          <div className={s.seal}>
            <div className={s.sealO}>
              <div className={s.qr} dangerouslySetInnerHTML={{ __html: data.qrSvg }} />
            </div>
            <small>
              N.º {data.number} · {formatCertificateDate(data.issuedAt).toUpperCase()}
            </small>
          </div>
          <Signature sig={data.signatures[1]} />
        </div>
      </div>
    </div>
  );
}

function Signature({ sig }: { sig?: { name: string; imageUrl: string } }) {
  if (!sig) return <div />;
  return (
    <div className={s.sig}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={s.sigImg} src={sig.imageUrl} alt={`Assinatura de ${sig.name}`} />
      <div className={s.ln}>
        <b>{sig.name}</b>
      </div>
    </div>
  );
}
