/**
 * Formatea un valor numérico como pesos colombianos.
 * 90000 → "$90.000"
 */
export function formatCOP(value: number | null | undefined): string {
  if (value == null) return "—";
  return "$" + Math.round(value).toLocaleString("es-CO");
}
