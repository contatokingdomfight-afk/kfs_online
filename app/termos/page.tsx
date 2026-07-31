import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell, LegalSection } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Termos de Serviço | Kingdom Fight School",
  description: "Termos de utilização da plataforma Kingdom Fight School.",
};

export default async function TermosPage() {
  return (
    <LegalPageShell title="Termos de Serviço" updatedAt="28 de junho de 2026">
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
