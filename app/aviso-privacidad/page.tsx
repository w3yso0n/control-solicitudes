import Link from "next/link";

export default function AvisoPrivacidadPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-zinc-800">
      <p className="text-xs uppercase tracking-wide text-zinc-400">
        LFPDPPP · art. 16
      </p>
      <h1 className="mt-2 text-2xl font-semibold">Aviso de privacidad</h1>
      <p className="mt-6 text-sm leading-6 text-zinc-600">
        Responsable del tratamiento: campaña de Beatriz Mojica. Encargado:
        Cuantiva, por instrucción del responsable.
      </p>
      <h2 className="mt-8 text-sm font-semibold">Datos recabados</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-600">
        Nombre, teléfono, domicilio o referencia territorial, contenido de la
        petición y documento escaneado de respaldo.
      </p>
      <h2 className="mt-8 text-sm font-semibold">Finalidades</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-600">
        Primarias: registro de la petición ciudadana y contacto por WhatsApp
        para acuse de recibo. No se promete resolución institucional en fase
        campaña.
      </p>
      <h2 className="mt-8 text-sm font-semibold">Baja del canal</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-600">
        Responda BAJA al mensaje de WhatsApp. La petición permanece registrada;
        solo se detiene el canal de mensajería.
      </p>
      <h2 className="mt-8 text-sm font-semibold">Derechos ARCO</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-600">
        Acceso, rectificación, cancelación y oposición a través del canal que
        publique la campaña. Este aviso se actualizará si cambia el responsable
        (transición a gobierno).
      </p>
      <p className="mt-10 text-sm">
        <Link href="/login" className="text-guinda hover:underline">
          Volver
        </Link>
      </p>
    </main>
  );
}
