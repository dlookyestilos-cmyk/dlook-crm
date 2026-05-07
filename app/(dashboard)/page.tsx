import { createClient } from "@/lib/supabase/server";
import ServicioCard from "./_components/servicio-card";

type Linea = {
  slug: string;
  nombre: string;
  descripcion: string;
  frase_cierre: string | null;
  orden: number;
};

type Servicio = {
  id: string;
  nombre: string;
  categoria: string;
  descripcion: string | null;
  icono: string;
  color_acento: string;
  precio_sesion: number | null;
  sesiones_paquete: number | null;
  precio_paquete: number | null;
  nota_precio: string | null;
  orden: number;
};

export default async function ServiciosHomePage() {
  const supabase = await createClient();

  const [{ data: lineas }, { data: servicios }] = await Promise.all([
    supabase
      .from("lineas")
      .select("*")
      .order("orden")
      .returns<Linea[]>(),
    supabase
      .from("servicios")
      .select("*")
      .eq("activo", true)
      .order("orden")
      .returns<Servicio[]>(),
  ]);

  return (
    <div>
      <header className="mb-12">
        <span className="block text-[14px] tracking-[0.16em] uppercase text-gold font-light italic mb-2 font-cormorant">
          Nuestros
        </span>
        <h1 className="font-cormorant text-[44px] font-light text-turquesa-dark leading-tight mb-2">
          Servicios
        </h1>
        <p className="text-ink-soft text-[15px] font-light max-w-2xl">
          Selecciona un servicio para ver la lista de clientas y gestionar sus procesos.
        </p>
      </header>

      {(lineas ?? []).map((linea) => {
        const items = (servicios ?? []).filter((s) => s.categoria === linea.slug);
        return (
          <section key={linea.slug} className="mb-14">
            <div className="flex items-center gap-3.5 mb-6">
              <span className="w-6 h-px bg-gold" />
              <span className="text-[11px] tracking-[0.25em] uppercase text-gold font-medium">
                {linea.nombre}
              </span>
              <span className="flex-1 h-px bg-gradient-to-r from-gold/60 to-transparent" />
            </div>

            {items.length === 0 ? (
              <p className="text-ink-mute text-sm italic">Sin servicios cargados.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {items.map((s) => (
                  <ServicioCard
                    key={s.id}
                    id={s.id}
                    nombre={s.nombre}
                    descripcion={s.descripcion}
                    icono={s.icono}
                    color_acento={s.color_acento}
                    precio_sesion={s.precio_sesion}
                    sesiones_paquete={s.sesiones_paquete}
                    precio_paquete={s.precio_paquete}
                    nota_precio={s.nota_precio}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
