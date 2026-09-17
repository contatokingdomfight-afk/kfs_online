import { describe, expect, it } from "vitest";
import { isTribeCommentVisibleToRegularUsers, isTribePostVisibleToRegularUsers } from "./moderation";

/** Réplica local (sem importar `./student-context`, que puxa dependências server-only não mockadas em teste). */
function tribePostVisibleForSchool(row: { visibility: string; schoolId: string }, viewerSchoolId: string): boolean {
  if (row.visibility === "ALL_SCHOOLS") return true;
  return row.schoolId === viewerSchoolId;
}

describe("isTribePostVisibleToRegularUsers", () => {
  it("only ACTIVE posts are visible", () => {
    expect(isTribePostVisibleToRegularUsers("ACTIVE")).toBe(true);
    expect(isTribePostVisibleToRegularUsers("HIDDEN")).toBe(false);
    expect(isTribePostVisibleToRegularUsers("DELETED")).toBe(false);
  });
});

describe("isTribeCommentVisibleToRegularUsers", () => {
  it("only ACTIVE comments are visible", () => {
    expect(isTribeCommentVisibleToRegularUsers("ACTIVE")).toBe(true);
    expect(isTribeCommentVisibleToRegularUsers("HIDDEN")).toBe(false);
  });
});

describe("visibility combined with moderation status", () => {
  const cases: Array<{
    label: string;
    visibility: string;
    schoolId: string;
    status: string;
    viewerSchoolId: string;
    expectedVisible: boolean;
  }> = [
    {
      label: "school-only post, same school, active",
      visibility: "SCHOOL_ONLY",
      schoolId: "s1",
      status: "ACTIVE",
      viewerSchoolId: "s1",
      expectedVisible: true,
    },
    {
      label: "school-only post, same school, but hidden by admin",
      visibility: "SCHOOL_ONLY",
      schoolId: "s1",
      status: "HIDDEN",
      viewerSchoolId: "s1",
      expectedVisible: false,
    },
    {
      label: "all-schools post, different school, active",
      visibility: "ALL_SCHOOLS",
      schoolId: "s1",
      status: "ACTIVE",
      viewerSchoolId: "s2",
      expectedVisible: true,
    },
    {
      label: "all-schools post, different school, deleted",
      visibility: "ALL_SCHOOLS",
      schoolId: "s1",
      status: "DELETED",
      viewerSchoolId: "s2",
      expectedVisible: false,
    },
    {
      label: "school-only post, different school, active",
      visibility: "SCHOOL_ONLY",
      schoolId: "s1",
      status: "ACTIVE",
      viewerSchoolId: "s2",
      expectedVisible: false,
    },
  ];

  it.each(cases)("$label", ({ visibility, schoolId, status, viewerSchoolId, expectedVisible }) => {
    const visible =
      isTribePostVisibleToRegularUsers(status) && tribePostVisibleForSchool({ visibility, schoolId }, viewerSchoolId);
    expect(visible).toBe(expectedVisible);
  });
});
