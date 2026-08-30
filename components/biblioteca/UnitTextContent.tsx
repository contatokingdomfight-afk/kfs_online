import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  text: string;
};

/**
 * Renderiza texto de unidade em Markdown. Só Markdown puro — sem plugin de HTML bruto
 * (ex. rehype-raw), porque o texto vem de coach/admin e não deve poder injetar HTML.
 */
export function UnitTextContent({ text }: Props) {
  return (
    <div className="unit-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}
