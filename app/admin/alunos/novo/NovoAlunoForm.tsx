"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import {
  createStudent,
  createStudentPresencial,
  type CreateStudentPresencialResult,
  type CreateStudentResult,
} from "../actions";
import { SuccessConfirmModal } from "@/components/SuccessConfirmModalDynamic";

type Mode = "invite" | "presencial";

function generateClientPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < 10; i++) {
    out += chars[bytes[i]! % chars.length];
  }
  return out;
}

export function NovoAlunoForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("invite");
  const [schools, setSchools] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  const [inviteState, inviteAction] = useFormState(createStudent, null as CreateStudentResult | null);
  const [presencialState, presencialAction] = useFormState(
    createStudentPresencial,
    null as CreateStudentPresencialResult | null
  );

  const [isMinor, setIsMinor] = useState(false);
  const [autoPassword, setAutoPassword] = useState(true);
  const [password, setPassword] = useState("");
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [savedCredentials, setSavedCredentials] = useState<CreateStudentPresencialResult | null>(null);

  useEffect(() => {
    async function loadSchools() {
      try {
        const response = await fetch("/api/schools");
        if (response.ok) {
          const data = await response.json();
          setSchools(data.schools || []);
        }
      } catch (error) {
        console.error("Error loading schools:", error);
      } finally {
        setLoading(false);
      }
    }
    loadSchools();
  }, []);

  useEffect(() => {
    if (presencialState?.success && presencialState.studentId) {
      setSavedCredentials(presencialState);
      setCredentialsOpen(true);
    }
  }, [presencialState]);

  function handleGeneratePassword() {
    setPassword(generateClientPassword());
    setAutoPassword(false);
  }

  function closeCredentialsModal() {
    const studentId = savedCredentials?.studentId;
    setCredentialsOpen(false);
    setSavedCredentials(null);
    setPassword("");
    setIsMinor(false);
    setAutoPassword(true);
    if (studentId) {
      router.push(`/admin/alunos/${studentId}`);
    }
  }

  const cardStyle = {
    padding: "clamp(20px, 5vw, 24px)",
    display: "flex",
    flexDirection: "column" as const,
    gap: "clamp(16px, 4vw, 20px)",
  };

  const labelStyle = {
    fontSize: "clamp(14px, 3.5vw, 16px)",
    fontWeight: 500,
    color: "var(--text-primary)",
  };

  return (
    <>
      <div
        className="card"
        style={{
          ...cardStyle,
          marginBottom: 16,
          padding: "12px 16px",
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
        }}
        role="tablist"
        aria-label="Modo de cadastro"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "invite"}
          className={mode === "invite" ? "btn btn-primary" : "btn btn-secondary"}
          style={{ fontSize: 14 }}
          onClick={() => setMode("invite")}
        >
          Enviar convite
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "presencial"}
          className={mode === "presencial" ? "btn btn-primary" : "btn btn-secondary"}
          style={{ fontSize: 14 }}
          onClick={() => setMode("presencial")}
        >
          Cadastro presencial
        </button>
      </div>

      {mode === "invite" ? (
        <form action={inviteAction} className="card" style={cardStyle}>
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Envia um email ao aluno para definir a senha. Podes ignorar o convite e gerir só o financeiro no admin.
          </p>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={labelStyle}>Email *</span>
            <input type="email" name="email" required className="input" placeholder="aluno@exemplo.com" />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={labelStyle}>Nome</span>
            <input type="text" name="name" className="input" placeholder="Nome completo" />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={labelStyle}>Escola *</span>
            <select name="schoolId" required className="input" disabled={loading}>
              <option value="">Selecione uma escola</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </label>
          {inviteState?.error && (
            <p style={{ margin: 0, fontSize: 14, color: "var(--danger)" }}>{inviteState.error}</p>
          )}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button type="submit" className="btn btn-primary">
              Enviar convite
            </button>
            <Link href="/admin/alunos" className="btn btn-secondary" style={{ textDecoration: "none" }}>
              Cancelar
            </Link>
          </div>
        </form>
      ) : (
        <form action={presencialAction} className="card" style={cardStyle}>
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Cria a conta sem enviar email. Anota as credenciais mostradas no final — não voltam a aparecer.
          </p>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={labelStyle}>Nome completo *</span>
            <input type="text" name="name" required className="input" placeholder="Nome completo" minLength={2} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={labelStyle}>Escola *</span>
            <select name="schoolId" required className="input" disabled={loading}>
              <option value="">Selecione uma escola</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
            <input
              type="checkbox"
              name="isMinor"
              checked={isMinor}
              onChange={(e) => setIsMinor(e.target.checked)}
              value="true"
            />
            Menor de idade (sem email — gera login @alunos.kingdomfight.pt)
          </label>
          {isMinor ? (
            <>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={labelStyle}>Data de nascimento *</span>
                <input type="date" name="dateOfBirth" required className="input" />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={labelStyle}>Nome do responsável legal *</span>
                <input type="text" name="guardianName" required className="input" minLength={3} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={labelStyle}>Telefone do responsável *</span>
                <input type="tel" name="guardianPhone" required className="input" placeholder="+351..." minLength={6} />
              </label>
            </>
          ) : (
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={labelStyle}>Email *</span>
              <input type="email" name="email" required className="input" placeholder="email da ficha de inscrição" />
            </label>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={labelStyle}>Senha inicial</span>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
              <input
                type="checkbox"
                name="autoGeneratePassword"
                checked={autoPassword}
                onChange={(e) => setAutoPassword(e.target.checked)}
                value="true"
              />
              Gerar senha automaticamente
            </label>
            {!autoPassword && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  type="text"
                  name="password"
                  className="input"
                  style={{ flex: 1, minWidth: 200 }}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  autoComplete="new-password"
                />
                <button type="button" className="btn btn-secondary" onClick={handleGeneratePassword}>
                  Sugerir senha
                </button>
              </div>
            )}
          </div>
          {presencialState?.error && (
            <p style={{ margin: 0, fontSize: 14, color: "var(--danger)" }}>{presencialState.error}</p>
          )}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button type="submit" className="btn btn-primary">
              Criar aluno presencial
            </button>
            <Link href="/admin/alunos" className="btn btn-secondary" style={{ textDecoration: "none" }}>
              Cancelar
            </Link>
          </div>
        </form>
      )}

      <SuccessConfirmModal
        open={credentialsOpen}
        onClose={closeCredentialsModal}
        title="Aluno criado — anota as credenciais"
        message={
          savedCredentials?.loginEmail && savedCredentials.initialPassword
            ? `Email de login: ${savedCredentials.loginEmail}\nSenha inicial: ${savedCredentials.initialPassword}${
                savedCredentials.syntheticLoginEmail
                  ? "\n\n(Email interno gerado — não tem caixa de correio; contacto do responsável no perfil.)"
                  : "\n\n(O aluno pode entrar com estes dados ou usar «Esqueci a senha».)"
              }`
            : "Conta criada com sucesso."
        }
        closeLabel="Ir para a ficha do aluno"
      />
    </>
  );
}
