import "server-only";

import type { SidebarLink } from "@/components/Sidebar";
import type { ResolvedAdminAccess } from "./resolve";
import { canAccessAdminPathname } from "./paths";

/**
 * Remove entradas cujo `href` o utilizador não pode abrir (permissões granulares).
 */
export function filterAdminLinksForAccess(
  links: SidebarLink[],
  access: ResolvedAdminAccess
): SidebarLink[] {
  const out: SidebarLink[] = [];
  for (const link of links) {
    if (link.children?.length) {
      const ch = link.children
        .map((c) => (canAccessAdminPathname(access, c.href) ? c : null))
        .filter((x): x is SidebarLink => x !== null);
      if (ch.length > 0) {
        out.push({ ...link, children: ch });
      }
    } else if (canAccessAdminPathname(access, link.href)) {
      out.push(link);
    }
  }
  return out;
}
