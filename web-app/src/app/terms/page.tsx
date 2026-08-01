// Página pública — equivalente de privacy-policy/page.tsx para los
// Términos de Servicio. Contenido migrado tal cual del terminos.html
// legacy (raíz del repo, ahora eliminado) — no es texto nuevo, es el mismo
// texto legal que ya estaba publicado en gotix.com.ar/terminos.html,
// reformateado con el sistema de diseño de este proyecto. Igual que la
// política de privacidad, no reemplaza una revisión de un abogado. Fuera
// del layout de (dashboard) a propósito: tiene que ser legible sin sesión
// iniciada (footer, pasarelas de pago, clientes sin cuenta todavía).

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: '1. Aceptación de los términos',
    body: [
      'El acceso y uso de Gotix (en adelante, "la Plataforma"), disponible en gotix.com.ar, implica la aceptación plena de estos Términos de Servicio. Si el usuario no está de acuerdo con alguna de estas condiciones, debe abstenerse de utilizar la Plataforma.',
    ],
  },
  {
    title: '2. Descripción del servicio',
    body: [
      'Gotix es un sistema operativo de negocio para marcas de e-commerce que permite la gestión, automatización y testeo de campañas publicitarias en Meta Ads, incluyendo creación de campañas, conjuntos de anuncios y anuncios, lectura de métricas de rendimiento, reglas de decisión, y herramientas de análisis vinculadas a la operación publicitaria del usuario.',
      'La Plataforma se conecta con la API de Marketing de Meta y con otros servicios de terceros (por ejemplo, plataformas de e-commerce) bajo autorización explícita del usuario, para operar en su nombre dentro de los permisos otorgados.',
    ],
  },
  {
    title: '3. Cuentas de usuario',
    body: [
      'Para utilizar Gotix, el usuario debe crear una cuenta y proporcionar información veraz. El usuario es responsable de mantener la confidencialidad de sus credenciales de acceso y de toda actividad realizada bajo su cuenta. Gotix no se hace responsable por accesos no autorizados derivados de la negligencia del usuario en la protección de sus credenciales.',
    ],
  },
  {
    title: '4. Conexión con cuentas de Meta y de terceros',
    body: [
      'Al vincular su cuenta publicitaria de Meta Ads (u otros servicios de terceros) a Gotix, el usuario autoriza expresamente a la Plataforma a actuar en su nombre dentro del alcance de los permisos otorgados, incluyendo la lectura y, cuando corresponda, la creación o modificación de campañas, conjuntos de anuncios y anuncios.',
      'El usuario puede revocar esta autorización en cualquier momento desde el panel de administración de su cuenta de Meta (Meta Business Suite) o desde la configuración de Gotix. Gotix no es responsable por las políticas, disponibilidad, cambios técnicos o decisiones de Meta Platforms, Inc. ni de ningún otro proveedor tercero integrado a la Plataforma.',
    ],
  },
  {
    title: '5. Uso aceptable',
    body: [
      'El usuario se compromete a utilizar Gotix de forma lícita y conforme a estos Términos. En particular, el usuario no podrá: utilizar la Plataforma para fines fraudulentos, ilegales o que infrinjan derechos de terceros; intentar acceder a cuentas, datos o funcionalidades de otros usuarios sin autorización; realizar ingeniería inversa, descompilar o intentar extraer el código fuente de la Plataforma; ni utilizar la Plataforma de forma que infrinja las Políticas de Publicidad o los Términos de la Plataforma de Meta.',
    ],
  },
  {
    title: '6. Responsabilidad sobre las campañas publicitarias',
    body: [
      'Gotix actúa como una herramienta de gestión y automatización. El usuario es el único responsable por el contenido, la configuración, el presupuesto y los resultados de las campañas publicitarias creadas o gestionadas a través de la Plataforma, así como por el cumplimiento de las políticas publicitarias de Meta y de la normativa de defensa del consumidor y publicidad aplicable.',
      'Gotix no garantiza resultados específicos de rendimiento publicitario (ventas, ROAS, alcance, etc.), ya que estos dependen de factores externos a la Plataforma, incluyendo el comportamiento de la subasta de Meta Ads.',
    ],
  },
  {
    title: '7. Disponibilidad del servicio',
    body: [
      'Gotix procurará mantener la Plataforma disponible y operativa, pero no garantiza un funcionamiento ininterrumpido o libre de errores. La Plataforma depende de servicios de terceros (Vercel, Supabase, API de Meta) cuya disponibilidad escapa al control directo de Gotix.',
    ],
  },
  {
    title: '8. Propiedad intelectual',
    body: [
      'El software, diseño, marca y demás elementos de Gotix son propiedad de sus titulares y están protegidos por la normativa de propiedad intelectual aplicable. El uso de la Plataforma no otorga al usuario ningún derecho de propiedad sobre el software, más allá de la licencia de uso necesaria para operar el servicio contratado.',
    ],
  },
  {
    title: '9. Modificaciones del servicio y de los términos',
    body: [
      'Gotix podrá modificar, suspender o discontinuar funcionalidades de la Plataforma, así como actualizar estos Términos de Servicio en cualquier momento. Los cambios entrarán en vigor desde su publicación en esta misma página, indicando la fecha de última actualización. El uso continuado de la Plataforma luego de una modificación implica la aceptación de los nuevos términos.',
    ],
  },
  {
    title: '10. Terminación de la cuenta',
    body: [
      'El usuario puede dar de baja su cuenta en cualquier momento. Gotix se reserva el derecho de suspender o cancelar el acceso de un usuario en caso de incumplimiento de estos Términos, sin perjuicio de otras acciones legales que pudieran corresponder.',
    ],
  },
  {
    title: '11. Ley aplicable y jurisdicción',
    body: [
      'Estos Términos de Servicio se rigen por las leyes de la República Argentina. Para cualquier controversia derivada del uso de la Plataforma, las partes se someten a la jurisdicción de los tribunales ordinarios competentes de la República Argentina, con renuncia expresa a cualquier otro fuero que pudiera corresponder.',
    ],
  },
  {
    title: '12. Contacto',
    body: [
      'Para consultas relacionadas con estos Términos de Servicio, el usuario puede comunicarse a través de los canales de contacto disponibles en gotix.com.ar.',
    ],
  },
]

export default function TermsPage() {
  return (
    <div className="mx-auto min-h-screen max-w-[720px] px-6 py-16">
      <p className="text-[11px] font-bold uppercase tracking-wide text-text-3">Gotix</p>
      <h1 className="mt-1 text-[28px] font-bold tracking-[-0.03em] text-text">Términos de Servicio</h1>
      <p className="mt-2 text-sm text-text-2">Última actualización: 30 de junio de 2026.</p>

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
