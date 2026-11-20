import { Fragment } from "react";

/**
 * Nome do grau que pode quebrar linha depois de cada «/» (ex.: «Preto/Prata/Branco/Vermelho»),
 * em vez de alargar o ecrã no telemóvel ou partir a meio de uma palavra.
 */
export function GradeName({ name }: { name: string }) {
  const parts = name.split("/");
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < parts.length - 1 && (
            <>
              /<wbr />
            </>
          )}
        </Fragment>
      ))}
    </>
  );
}
