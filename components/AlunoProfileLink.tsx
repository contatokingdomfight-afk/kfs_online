"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoadingOverlay } from "@/components/LoadingOverlay";

type Props = {
  href: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Link para o perfil do aluno que mostra um modal de carregamento durante a navegação.
 */
export function AlunoProfileLink({ href, children, className, style }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setLoading(true);
    router.push(href);
  };

  return (
    <>
      <Link href={href} onClick={handleClick} className={className} style={style}>
        {children}
      </Link>
      <LoadingOverlay open={loading} message="Abrindo o perfil do aluno…" />
    </>
  );
}
