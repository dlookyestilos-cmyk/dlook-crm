import { listarClientas } from "./actions";
import ClientasList from "./_components/clientas-list";

export default async function ClientasPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id: selectedId } = await searchParams;
  const clientas = await listarClientas();

  return <ClientasList clientas={clientas} selectedId={selectedId} />;
}
