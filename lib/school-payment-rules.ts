/**
 * Meios de pagamento de uma escola, vistos pelo aluno. Regras puras (testáveis e usáveis em componentes cliente);
 * a leitura da BD está em lib/school-payment-methods.ts.
 * Regra de ouro: sem dados da escola não se mostra nada. Nunca se recorre aos dados de outra escola.
 */

/** A Sede: a sua conta Revolut está nas variáveis de ambiente e a ligação bancária é a `RevolutConnection` "default". */
export const SEDE_SCHOOL_ID = "default-school-001";

export type SchoolPaymentSettingsRow = {
  ibanEnabled: boolean;
  iban: string | null;
  ibanHolder: string | null;
  ibanHolderAddress: string | null;
  bicSwift: string | null;
  revolutTag: string | null;
  mbwayEnabled: boolean;
  mbwayPhone: string | null;
  cashEnabled: boolean;
  revolutEnabled: boolean;
};

export type SchoolPaymentInfo = {
  isSede: boolean;
  /** Transferência para a conta da escola; null = a escola não a aceita. */
  transfer: { iban: string | null; holder: string | null; holderAddress: string | null; bicSwift: string | null; revolutTag: string | null } | null;
  mbwayPhone: string | null;
  cash: boolean;
  /** Pagamento online (cartão/Revolut), para a conta Revolut da própria escola. */
  onlineRevolut: boolean;
};

export const NO_SCHOOL_PAYMENT_INFO: SchoolPaymentInfo = { isSede: false, transfer: null, mbwayPhone: null, cash: false, onlineRevolut: false };

function clean(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

/** `merchantConfigured`: esta escola tem conta Revolut própria configurada. */
export function schoolPaymentInfoFromRow(schoolId: string, row: SchoolPaymentSettingsRow | null | undefined, merchantConfigured: boolean): SchoolPaymentInfo {
  if (!row) return NO_SCHOOL_PAYMENT_INFO;
  const isSede = schoolId === SEDE_SCHOOL_ID;
  const iban = row.ibanEnabled ? clean(row.iban) : null;
  const revolutTag = clean(row.revolutTag);
  return {
    isSede,
    transfer:
      iban || revolutTag
        ? { iban, holder: clean(row.ibanHolder), holderAddress: clean(row.ibanHolderAddress), bicSwift: clean(row.bicSwift), revolutTag }
        : null,
    mbwayPhone: row.mbwayEnabled ? clean(row.mbwayPhone) : null,
    cash: row.cashEnabled,
    onlineRevolut: row.revolutEnabled && merchantConfigured,
  };
}

export function hasAnySchoolPaymentMethod(info: SchoolPaymentInfo): boolean {
  return Boolean(info.transfer || info.mbwayPhone || info.cash || info.onlineRevolut);
}

/** Encomendas sem escola vêm da loja pública, que é da Sede. */
export function orderPaymentSchoolId(orderSchoolId: string | null | undefined): string {
  return orderSchoolId || SEDE_SCHOOL_ID;
}

/** Formas de pagamento que a adesão aceita para esta escola, pela ordem em que são mostradas. */
export function enrollmentPaymentMethods(info: SchoolPaymentInfo, opts: { includeOnline: boolean }): ("REVOLUT" | "TRANSFER" | "MBWAY" | "CASH")[] {
  return [
    ...(opts.includeOnline && info.onlineRevolut ? (["REVOLUT"] as const) : []),
    ...(info.cash ? (["CASH"] as const) : []),
    ...(info.transfer ? (["TRANSFER"] as const) : []),
    ...(info.mbwayPhone ? (["MBWAY"] as const) : []),
  ];
}

/** Identificação da escola nos documentos e cartões de pagamento. */
export type SchoolIdentity = {
  /** Denominação legal; sem ela, o nome da escola. */
  name: string;
  /** Como os documentos designam a escola. */
  displayName: string;
  tradeName: string | null;
  nipc: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
};

/** O que o comprovativo de adesão precisa de saber sobre a escola do aluno. */
export type EnrollmentSchoolDetails = { identity: SchoolIdentity | null; payment: SchoolPaymentInfo };
