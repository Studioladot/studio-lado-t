// "Guía rápida" (2026-08-08) — acceso fijo desde el sidebar (ver
// sidebar-nav.tsx) para consultar la metodología de uso cuando quieran, no
// solo durante el onboarding. Página estática, sin datos — 100%
// tipográfica, sin ningún ícono.

const STEPS: { title: string; body: string }[] = [
  {
    title: '1. Conectá Meta',
    body: 'Vinculá tu Business Manager desde Ajustes → Integraciones. Sin esto, Campañas, Rendimiento y el Autopiloto quedan sin datos reales para mostrar.',
  },
  {
    title: '2. Definí tus Pilares Estratégicos',
    body: 'Atracción, Nutrición y Venta vienen precargados — editalos desde el lápiz que aparece junto al selector en Publicaciones, Campañas o Notas. Es la misma lista en los tres lugares.',
  },
  {
    title: '3. Armá un guion',
    body: 'Un guion es hook + desarrollo + cierre + copy. Desde Biblioteca de Guiones podés generar variantes del gancho con IA antes de grabar nada.',
  },
  {
    title: '4. Publicá con su Pilar asignado',
    body: 'Cada publicación que cargás en Calendario/Control queda categorizada por Pilar — así el Dashboard y las métricas después pueden mostrarte qué está funcionando por tipo de contenido.',
  },
  {
    title: '5. Convertí lo que funciona en pauta',
    body: 'Un posteo orgánico con buen alcance se puede transformar en un anuncio de Meta Ads en 3 clics, sin volver a subir ningún archivo — o armar un testeo nuevo desde cero en Campañas.',
  },
  {
    title: '6. Dejá que el Autopiloto vigile',
    body: 'Reglas simples (pausar, subir presupuesto, rotar creativo) corriendo cada hora sobre tus campañas activas — vos revisás las alertas, no cada número.',
  },
]

export default function GuiaRapidaPage() {
  return (
    <div className="mx-auto max-w-[640px]">
      <div className="mb-8">
        <h1 className="text-[22px] font-bold tracking-[-0.03em] text-text">Guía rápida</h1>
        <p className="mt-0.5 text-[13px] text-text-2">La metodología de uso de Gotix, en 6 pasos.</p>
      </div>

      <div className="flex flex-col gap-6">
        {STEPS.map((step) => (
          <div key={step.title}>
            <p className="text-sm font-bold text-text">{step.title}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-text-2">{step.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
