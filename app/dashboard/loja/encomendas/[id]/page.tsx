import { OrderDetailView } from "@/components/retail/OrderDetailView";

export const dynamic = "force-dynamic";

export default async function MinhaEncomendaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nova?: string; pago?: string }> }) {
  const [{ id }, { nova, pago }] = await Promise.all([params, searchParams]);
  return <OrderDetailView id={id} nova={nova} pago={pago} basePath="/dashboard/loja" />;
}
