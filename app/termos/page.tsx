import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";
import { getLocaleFromCookies } from "@/lib/theme-locale-server";

export const metadata: Metadata = {
  title: "Termos de Serviço | Kingdom Fight School",
  description: "Termos de utilização da plataforma Kingdom Fight School.",
};

export default async function TermosPage() {
  const locale = ((await getLocaleFromCookies()) === "en" ? "en" : "pt") as "pt" | "en";

  if (locale === "en") {
    return (
      <LegalPageShell title="Terms of Service" updatedAt="June 28, 2026" locale="en">
        <LegalSection title="1. Service description">
          <p>
            Kingdom Fight School provides a digital school-management and student-experience platform (class
            check-in, library, events, payments, physical assessment and communication), for students, coaches and
            the martial arts school&apos;s administration.
          </p>
        </LegalSection>
        <LegalSection title="2. Eligibility">
          <p>
            Registration is permitted for people aged 16 or over. Minors may only use the service with authorization
            from a parent or legal guardian, who assumes responsibility for use of the account.
          </p>
        </LegalSection>
        <LegalSection title="3. Account and responsibilities">
          <p>
            You are responsible for the confidentiality of your credentials and for all activity on your account.
            You must provide truthful information and keep it up to date. The school may suspend accounts in case of
            abusive use, fraud or breach of these terms.
          </p>
        </LegalSection>
        <LegalSection title="4. Payments and cancellations">
          <p>
            Plans and subscriptions may be processed through Stripe, with automatic renewal according to the chosen
            cycle. If a monthly payment is late, a grace period applies until the end of day 10 (Lisbon time) of the
            month in question, after which access to the plan may be suspended until payment is regularized.
            In-person payments recorded by the school follow the rules communicated at the front desk.
          </p>
          <p>
            You can manage Stripe subscriptions in the student&apos;s financial area, or contact the school for
            questions about cancellations and refunds.
          </p>
        </LegalSection>
        <LegalSection title="5. Intellectual property">
          <p>
            Platform content (text, videos, brand, training materials) is the property of Kingdom Fight School or
            the respective rights holders. Reproduction or distribution without authorization is not permitted.
          </p>
        </LegalSection>
        <LegalSection title="6. Limitation of liability">
          <p>
            The platform is provided &quot;as is&quot;. The school is not liable for temporary interruptions,
            third-party failures (payments, email, hosting) or indirect damages. Sports practice involves physical
            risk; students must follow coaches&apos; guidance and disclose relevant health conditions.
          </p>
        </LegalSection>
        <LegalSection title="7. Governing law">
          <p>
            These terms are governed by Portuguese law. For disputes, the courts of the district where Kingdom Fight
            School is headquartered have jurisdiction, without prejudice to consumers&apos; legal rights.
          </p>
        </LegalSection>
        <p style={{ marginTop: 8, fontSize: 14 }}>
          Questions:{" "}
          <a href="mailto:contato@kingdomfight.com" style={{ color: "var(--primary)" }}>
            contato@kingdomfight.com
          </a>
          . Also see the <Link href="/privacidade">Privacy Policy</Link>.
        </p>
      </LegalPageShell>
    );
  }

  return (
    <LegalPageShell title="Termos de Serviço" updatedAt="28 de junho de 2026" locale="pt">
      <LegalSection title="1. Descrição do serviço">
        <p>
          A Kingdom Fight School disponibiliza uma plataforma digital de gestão escolar e experiência do aluno
          (check-in em aulas, biblioteca, eventos, pagamentos, avaliação física e comunicação), destinada a alunos,
          treinadores e administração da escola de artes marciais.
        </p>
      </LegalSection>
      <LegalSection title="2. Elegibilidade">
        <p>
          O registo é permitido a maiores de 16 anos. Menores de idade só podem utilizar o serviço com autorização
          dos pais ou representantes legais, que assumem responsabilidade pelo uso da conta.
        </p>
      </LegalSection>
      <LegalSection title="3. Conta e responsabilidades">
        <p>
          És responsável pela confidencialidade das tuas credenciais e por toda a atividade na tua conta. Deves
          fornecer informação verdadeira e mantê-la atualizada. A escola pode suspender contas em caso de uso
          abusivo, fraude ou incumprimento destes termos.
        </p>
      </LegalSection>
      <LegalSection title="4. Pagamentos e cancelamentos">
        <p>
          Planos e subscrições podem ser processados através da Stripe, com renovação automática conforme o ciclo
          escolhido. Em caso de atraso no pagamento da mensalidade, aplica-se um período de tolerância até ao fim
          do dia 10 (horário de Lisboa) do mês em causa, após o qual o acesso ao plano pode ser suspenso até
          regularização. Pagamentos presenciais registados pela escola seguem as regras comunicadas no balcão.
        </p>
        <p>
          Podes gerir subscrições Stripe na área financeira do aluno ou contactar a escola para esclarecimentos
          sobre cancelamentos e reembolsos.
        </p>
      </LegalSection>
      <LegalSection title="5. Propriedade intelectual">
        <p>
          Conteúdos da plataforma (textos, vídeos, marca, materiais de formação) são propriedade da Kingdom Fight
          School ou dos respetivos titulares. Não é permitida a reprodução ou distribuição sem autorização.
        </p>
      </LegalSection>
      <LegalSection title="6. Limitação de responsabilidade">
        <p>
          A plataforma é fornecida «tal como está». A escola não se responsabiliza por interrupções temporárias,
          falhas de terceiros (pagamentos, email, alojamento) ou danos indiretos. A prática desportiva implica riscos
          físicos; o aluno deve seguir orientações dos treinadores e informar condições de saúde relevantes.
        </p>
      </LegalSection>
      <LegalSection title="7. Lei aplicável">
        <p>
          Estes termos regem-se pela lei portuguesa. Para litígios, é competente o foro da comarca da sede da
          Kingdom Fight School, sem prejuízo dos direitos legais do consumidor.
        </p>
      </LegalSection>
      <p style={{ marginTop: 8, fontSize: 14 }}>
        Questões:{" "}
        <a href="mailto:contato@kingdomfight.com" style={{ color: "var(--primary)" }}>
          contato@kingdomfight.com
        </a>
        . Consulta também a <Link href="/privacidade">Política de Privacidade</Link>.
      </p>
    </LegalPageShell>
  );
}
