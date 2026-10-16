import { OrderDetailView } from "@/components/retail/OrderDetailView";

export const dynamic = "force-dynamic";

export default async function MinhaEncomendaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nova?: string }> }) {
  const [{ id }, { nova }] = await Promise.all([params, searchParams]);
  return <OrderDetailView id={id} nova={nova} basePath="/dashboard/loja" />;
}
