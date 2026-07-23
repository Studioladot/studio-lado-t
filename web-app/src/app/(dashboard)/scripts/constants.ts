export const ANGLES = [
  'Necesidad Emocional',
  'Prueba Social',
  'Modelado',
  'Urgencia/Escasez',
  'Promoción',
  'Valor/Precio',
  'Problema/Solución',
  'FAQ',
  'Detrás de escena',
  'Otro',
] as const

export const STATUSES = ['borrador', 'test', 'activo', 'ganador', 'pausado'] as const

export const STATUS_LABEL: Record<string, string> = {
  borrador: 'Idea/Borrador',
  test: 'En test',
  activo: 'Activo en Meta',
  ganador: 'Ganador',
  pausado: 'Pausado',
}

export const STATUS_COLOR: Record<string, string> = {
  borrador: 'text-text-2',
  test: 'text-accent',
  activo: 'text-green',
  ganador: 'text-green',
  pausado: 'text-amber',
}
