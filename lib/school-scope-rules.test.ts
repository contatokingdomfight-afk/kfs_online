import { describe, expect, it } from "vitest";
import { canAccessSchool, resolveSchoolParam, schoolScopeFrom, scopedSchoolIds, scopeQuery, type SchoolScope } from "./school-scope-rules";

const SCHOOLS = [
  { id: "a", name: "PM Team Sintra" },
  { id: "b", name: "PM Team Lisboa" },
  { id: "c", name: "PM Team Cascais" },
];
const network = (selectedSchoolId: string | null = null): SchoolScope => ({ kind: "network", schools: SCHOOLS, selectedSchoolId });
const directorA = schoolScopeFrom(["a"], SCHOOLS, null);

describe("schoolScopeFrom", () => {
  it("diretor sem escola ativa fica sem acesso", () => {
    expect(schoolScopeFrom([], SCHOOLS, null)).toEqual({ kind: "none" });
    expect(schoolScopeFrom(["inativa"], SCHOOLS, null)).toEqual({ kind: "none" });
  });

  it("ignora no cookie uma escola que não é dele", () => {
    const s = schoolScopeFrom(["a"], SCHOOLS, "b");
    expect(s.kind === "school" && s.selectedSchoolId).toBe("a");
  });

  it("aceita no cookie outra escola dele", () => {
    const s = schoolScopeFrom(["a", "c"], SCHOOLS, "c");
    expect(s.kind === "school" && s.selectedSchoolId).toBe("c");
  });
});

describe("isolamento entre escolas", () => {
  it("diretor da escola A não acede à B", () => {
    expect(canAccessSchool(directorA, "a")).toBe(true);
    expect(canAccessSchool(directorA, "b")).toBe(false);
    expect(canAccessSchool(directorA, null)).toBe(false);
  });

  it("?school= de outra escola é ignorado para o diretor", () => {
    expect(resolveSchoolParam(directorA, "b")).toBe("a");
    expect(resolveSchoolParam(directorA, undefined)).toBe("a");
  });

  it("sem escola não vê nada", () => {
    expect(scopedSchoolIds({ kind: "none" })).toEqual([]);
    expect(canAccessSchool({ kind: "none" }, "a")).toBe(false);
    expect(resolveSchoolParam({ kind: "none" }, "a")).toBeNull();
  });

  it("Admin Geral vê tudo ou a escola escolhida", () => {
    expect(scopedSchoolIds(network())).toBeNull();
    expect(scopedSchoolIds(network("b"))).toEqual(["b"]);
    expect(canAccessSchool(network("b"), "c")).toBe(true);
    expect(resolveSchoolParam(network(), "c")).toBe("c");
    expect(resolveSchoolParam(network("b"), undefined)).toBe("b");
    expect(resolveSchoolParam(network(), "nao-existe")).toBeNull();
  });
});

describe("scopeQuery", () => {
  const fakeQuery = () => {
    const calls: [string, string[]][] = [];
    const q = { in: (c: string, v: string[]) => (calls.push([c, v]), q), calls };
    return q;
  };

  it("filtra pela escola do diretor", () => {
    const q = fakeQuery();
    scopeQuery(q, directorA);
    expect(q.calls).toEqual([["schoolId", ["a"]]]);
  });

  it("não filtra para o Admin Geral em «Todas»", () => {
    const q = fakeQuery();
    scopeQuery(q, network(), "Student.schoolId");
    expect(q.calls).toEqual([]);
  });
});
