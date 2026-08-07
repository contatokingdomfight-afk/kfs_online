/**
 * Breakpoint do shell autenticado (dashboard / coach / admin).
 * Tablets ~768–1023px (ex. Galaxy Tab A11+ em landscape) usam layout mobile
 * (drawer + barra inferior), alinhado ao `lg:` do Tailwind na homepage.
 */
export const APP_SHELL_DESKTOP_MIN_PX = 1024;

export const APP_SHELL_DESKTOP_MEDIA = `(min-width: ${APP_SHELL_DESKTOP_MIN_PX}px)`;

export const APP_SHELL_MOBILE_MAX_MEDIA = `(max-width: ${APP_SHELL_DESKTOP_MIN_PX - 0.02}px)`;
