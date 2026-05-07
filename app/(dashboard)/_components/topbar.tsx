import TopbarSearch from "./topbar-search";

function getIniciales(nombre: string): string {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

function getFechaHoy(): string {
  const fmt = new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const txt = fmt.format(new Date());
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

export default function Topbar({
  nombre,
  email,
}: {
  nombre: string;
  email: string;
}) {
  return (
    <header className="bg-white border-b border-line-soft sticky top-0 z-30 px-10 py-[18px] flex items-center justify-between">
      <div className="text-sm text-ink-soft font-light">
        Hola, <strong className="text-turquesa-dark font-medium">{nombre}</strong>
        <span className="mx-2 text-line">·</span>
        <span>{getFechaHoy()}</span>
      </div>

      <div className="flex items-center gap-4">
        <TopbarSearch />

        <div
          className="w-10 h-10 rounded-full bg-turquesa text-white flex items-center justify-center font-medium text-[13px] border-2 border-white shadow-sm cursor-pointer tracking-wider"
          title={email}
        >
          {getIniciales(nombre)}
        </div>
      </div>
    </header>
  );
}
