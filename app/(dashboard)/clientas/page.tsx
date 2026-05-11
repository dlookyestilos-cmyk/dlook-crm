import { listarClientas, listarServicios } from "./actions";
import ClientasList from "./_components/clientas-list";

export default async function ClientasPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id: selectedId } = await searchParams;
  const [clientas, servicios] = await Promise.all([listarClientas(), listarServicios()]);

  return <ClientasList clientas={clientas} servicios={servicios} selectedId={selectedId} />;
}
