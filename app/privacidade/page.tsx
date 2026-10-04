import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";

export const metadata: Metadata = {
  title: "Política de Privacidade | Kingdom Fight School",
  description: "Política de privacidade e proteção de dados (RGPD) da Kingdom Fight School.",
};

export default async function PrivacidadePage() {
  const locale = ((await getLocaleFromCookies()) === "en" ? "en" : "pt") as "pt" | "en";

  if (locale === "en") {
    return (
      <LegalPageShell title="Privacy Policy" updatedAt="June 28, 2026" locale="en">
        <LegalSection title="Data controller">
          <p>
            <strong>Kingdom Fight School</strong> — contact for privacy questions and exercising your rights:{" "}
            <a href="mailto:contato@kingdomfight.com" style={{ color: "var(--primary)" }}>
              contato@kingdomfight.com
            </a>
            .
          </p>
        </LegalSection>
        <LegalSection title="Data we collect">
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>Identification and contact: name, email, phone, date of birth</li>
            <li>Sports and profile data: weight, height, reach, discipline, medical notes and emergency contact</li>
            <li>Wellness: RPE, soreness, weight and benchmark logs (when used)</li>
            <li>Attendance, evaluations, performance and event participation</li>
            <li>Payment and subscription data (processed by Stripe; we do not store full card numbers)</li>
            <li>Technical data: essential session cookies and preferences (theme, language, cookie consent)</li>
          </ul>
        </LegalSection>
        <LegalSection title="Purposes and legal basis">
          <p>
            We process data to perform the school-services contract (managing students, classes, payments,
            check-in), based on GDPR Article 6(1)(b). Optional health or wellness data is based on your consent
            (Art. 6(1)(a)), which you can withdraw at any time.
          </p>
        </LegalSection>
        <LegalSection title="Sharing with third parties">
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>
              <strong>Supabase</strong> (EU) — database and authentication
            </li>
            <li>
              <strong>Stripe</strong> — payments and subscriptions
            </li>
            <li>
              <strong>Resend</strong> — transactional emails
            </li>
            <li>
              <strong>Vercel</strong> — application hosting
            </li>
            <li>
              <strong>Google</strong> — OAuth sign-in (if you choose that option)
            </li>
          </ul>
          <p>Core data is stored on servers in the European Union region (Supabase EU).</p>
        </LegalSection>
        <LegalSection title="Cookies">
          <p>
            We use strictly necessary cookies for authentication and the app to function. With your consent, we may
            use additional cookies to improve the experience and gather aggregated metrics (analytics, ad pixels).
            You can manage your preference in the cookie banner or your browser settings.
          </p>
        </LegalSection>
        <LegalSection title="Your rights">
          <p>
            Under the GDPR, you have the right to access, rectify, erase, restrict, port and object to processing. To
            exercise these rights, contact us at the email above. You may also file a complaint with the Portuguese
            data protection authority, CNPD (
            <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>
              www.cnpd.pt
            </a>
            ).
          </p>
          <p>
            In your profile area you can request account deletion (&quot;Delete my account&quot;), subject to
            minimum legal retention periods (e.g. accounting records).
          </p>
        </LegalSection>
        <LegalSection title="Retention">
          <p>
            Data is kept while your account remains active and for as long as required by legal obligations (e.g.
            financial records). After account deletion, we remove or anonymize data with no legal retention
            obligation.
          </p>
        </LegalSection>
        <p style={{ marginTop: 8, fontSize: 14 }}>
          Also see the <Link href="/termos">Terms of Service</Link>.
        </p>
      </LegalPageShell>
    );
  }

  return (
    <LegalPageShell title="Política de Privacidade" updatedAt="28 de junho de 2026" locale="pt">
      <LegalSection title="Responsável pelo tratamento">
        <p>
          <strong>Kingdom Fight School</strong> — contacto para questões de privacidade e exercício de direitos:{" "}
          <a href="mailto:contato@kingdomfight.com" style={{ color: "var(--primary)" }}>
            contato@kingdomfight.com
          </a>
          .
        </p>
      </LegalSection>
      <LegalSection title="Dados que recolhemos">
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>Identificação e contacto: nome, email, telefone, data de nascimento</li>
          <li>Dados desportivos e de perfil: peso, altura, alcance, modalidade, notas médicas e contacto de emergência</li>
          <li>Bem-estar: registos de RPE, dores, peso e benchmarks (quando utilizados)</li>
          <li>Presenças, avaliações, desempenho e participação em eventos</li>
          <li>Dados de pagamento e subscrição (processados pela Stripe; não armazenamos números completos de cartão)</li>
          <li>Dados técnicos: cookies essenciais de sessão e preferências (tema, idioma, consentimento de cookies)</li>
        </ul>
      </LegalSection>
      <LegalSection title="Finalidades e base legal">
        <p>
          Tratamos dados para execução do contrato de prestação de serviços escolares (gestão de alunos, aulas,
          pagamentos, check-in), com base no artigo 6.º(1)(b) do RGPD. Dados de saúde ou bem-estar opcionais baseiam-se
          no teu consentimento (art. 6.º(1)(a)), que podes retirar a qualquer momento.
        </p>
      </LegalSection>
      <LegalSection title="Partilha com terceiros">
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>
            <strong>Supabase</strong> (UE) — base de dados e autenticação
          </li>
          <li>
            <strong>Stripe</strong> — pagamentos e subscrições
          </li>
          <li>
            <strong>Resend</strong> — envio de emails transacionais
          </li>
          <li>
            <strong>Vercel</strong> — alojamento da aplicação
          </li>
          <li>
            <strong>Google</strong> — início de sessão OAuth (se escolheres essa opção)
          </li>
        </ul>
        <p>Os dados principais são armazenados em servidores na região da União Europeia (Supabase EU).</p>
      </LegalSection>
      <LegalSection title="Cookies">
        <p>
          Utilizamos cookies estritamente necessários para autenticação e funcionamento da aplicação. Com o teu
          consentimento, podemos usar cookies adicionais para melhorar a experiência e métricas agregadas (analytics,
          pixels de publicidade). Podes gerir a preferência no banner de cookies ou nas definições do browser.
        </p>
      </LegalSection>
      <LegalSection title="Os teus direitos">
        <p>
          Nos termos do RGPD, tens direito de acesso, retificação, apagamento, limitação, portabilidade e oposição.
          Para exercer direitos, contacta-nos pelo email acima. Podes também apresentar reclamação à CNPD (
          <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>
            www.cnpd.pt
          </a>
          ).
        </p>
        <p>
          Na área de perfil podes solicitar a eliminação da conta («Eliminar a minha conta»), sujeita a retenções
          legais mínimas (ex.: registos contabilísticos).
        </p>
      </LegalSection>
      <LegalSection title="Conservação">
        <p>
          Os dados são conservados enquanto mantiveres conta ativa e pelo período necessário para obrigações legais
          (ex.: documentação financeira). Após eliminação da conta, removemos ou anonimizamos dados sem obrigação legal
          de retenção.
        </p>
      </LegalSection>
      <p style={{ marginTop: 8, fontSize: 14 }}>
        Ver também os <Link href="/termos">Termos de Serviço</Link>.
      </p>
    </LegalPageShell>
  );
}
