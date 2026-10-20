/**
 * Conta «só loja»: quem se regista a partir da Academy/Loja para comprar não é aluno da escola.
 * Fica marcada em `user_metadata.shop_only` e o middleware só a deixa ver as áreas públicas
 * (/academy, /loja) e o checkout — nunca o /dashboard nem o resto da plataforma.
 * Sem imports: é usado no middleware (Edge).
 */
export const SHOP_ONLY_METADATA_KEY = "shop_only";

export function isShopNextPath(next: string | null | undefined): boolean {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return false;
  return next === "/academy" || next.startsWith("/academy/") || next.startsWith("/academy?") || next === "/loja" || next.startsWith("/loja/") || next.startsWith("/loja?");
}

export function isShopOnlyUser(user: { user_metadata?: Record<string, unknown> | null } | null | undefined): boolean {
  return user?.user_metadata?.[SHOP_ONLY_METADATA_KEY] === true;
}

/** Rotas de API que a conta «só loja» pode chamar (checkout dos cursos). */
export function isShopOnlyAllowedApi(pathname: string): boolean {
  return pathname === "/api/stripe/academy-checkout";
}
