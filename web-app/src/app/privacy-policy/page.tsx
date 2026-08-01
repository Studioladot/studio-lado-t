// Página pública — requisito de Meta App Review para habilitar
// instagram_content_publish/instagram_manage_insights en modo Live/Público
// (SaaS B2B, no un tester individual). Texto placeholder legal estándar,
// no reemplaza una revisión de un abogado — cubre lo mínimo que Meta pide
// ver: qué datos se piden, para qué, cómo se guardan los tokens, cómo se
// borran. Fuera del layout de (dashboard) a propósito: tiene que ser
// legible sin sesión iniciada, tanto por clientes como por el revisor de
// Meta.

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: '1. Qué es Gotix',
    body: [
      'Gotix es un software como servicio (SaaS) B2B: comercios, marcas y agencias lo usan para administrar sus ventas, publicidad y contenido en redes sociales desde un solo lugar. Esta política aplica a todas las organizaciones que usan Gotix.',
    ],
  },
  {
    title: '2. Qué datos pedimos y para qué',
    body: [
      'Cuando conectás tu cuenta de Meta (Facebook/Instagram), pedimos permiso para leer información básica de tu perfil de negocio, la lista de Páginas y cuentas publicitarias que administrás, y la cuenta de Instagram Business o Creator vinculada a esas Páginas.',
      'Con tu autorización explícita, usamos esos permisos para: mostrar métricas de tus campañas y publicaciones, publicar contenido en tu nombre cuando vos lo programás desde Gotix, y sincronizar analítica orgánica (alcance, reproducciones, seguidores).',
      'Nunca publicamos ni modificamos nada sin una acción explícita tuya (programar una publicación, lanzar un anuncio) — Gotix no actúa por su cuenta sobre tus cuentas conectadas fuera de lo que vos configuraste.',
    ],
  },
  {
    title: '3. Cómo guardamos tus credenciales',
    body: [
      'Los tokens de acceso que Meta nos entrega se guardan cifrados en nuestra base de datos, aislados por organización — ninguna otra organización que use Gotix puede leer, ver ni cruzar tus datos ni tus tokens bajo ninguna circunstancia.',
      'Los tokens se usan exclusivamente para llamar a la API de Meta en tu nombre, en respuesta a acciones que vos iniciaste dentro de Gotix (ver o publicar contenido, sincronizar métricas).',
    ],
  },
  {
    title: '4. Cuánto tiempo guardamos los datos',
    body: [
      'Guardamos tus datos de conexión mientras la conexión esté activa. Si desconectás tu cuenta de Meta/Instagram desde Gotix, o eliminás tu cuenta de Gotix, tus tokens y datos de conexión se borran.',
      'Las métricas históricas (reproducciones, alcance, seguidores) se guardan como referencia de tendencia mientras tu organización exista en Gotix, y se borran junto con el resto de tus datos al eliminar tu cuenta.',
    ],
  },
  {
    title: '5. Cómo pedir el borrado de tus datos',
    body: [
      'Podés desconectar tu cuenta de Meta/Instagram en cualquier momento desde Gotix — eso borra inmediatamente el token y los datos de conexión asociados.',
      'Si preferís pedirlo directamente a través de Meta (Configuración de Facebook → Aplicaciones y sitios web → Eliminar), Meta nos notifica automáticamente y procesamos el borrado desde nuestro extremo — podés revisar el estado de esa solicitud en la URL de confirmación que Meta te muestra.',
    ],
  },
  {
    title: '6. Contacto',
    body: [
      'Para cualquier consulta sobre esta política o sobre tus datos, escribinos a privacidad@gotix.app.',
    ],
  },
]

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto min-h-screen max-w-[720px] px-6 py-16">
      <p className="text-[11px] font-bold uppercase tracking-wide text-text-3">Gotix</p>
      <h1 className="mt-1 text-[28px] font-bold tracking-[-0.03em] text-text">Política de Privacidad</h1>
      <p className="mt-2 text-sm text-text-2">Última actualización: 30 de julio de 2026.</p>

      <div className="mt-10 flex flex-col gap-8">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="mb-2 text-base font-bold tracking-tight text-text">{section.title}</h2>
            <div className="flex flex-col gap-2.5">
              {section.body.map((paragraph, i) => (
                <p key={i} className="text-sm leading-relaxed text-text-2">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
