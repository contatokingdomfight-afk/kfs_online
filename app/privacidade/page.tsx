import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Política de Privacidade | Kingdom Fight School",
  description: "Política de privacidade e proteção de dados (RGPD) da Kingdom Fight School.",
};

export default async function PrivacidadePage() {
  return (
    <LegalPageShell title="Política de Privacidade" updatedAt="28 de junho de 2026">
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
          consentimento, podemos usar cookies adicionais para melhorar a experiência e métricas agregadas. Podes
          gerir a preferência no banner de cookies ou nas definições do browser.
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
