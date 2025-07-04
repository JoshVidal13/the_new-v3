/**
 * Utilidades para manejar períodos de trabajo de 11 días
 * Cada período inicia en jueves y termina el domingo de la semana siguiente
 */

export interface WorkPeriod {
  start: Date
  end: Date
  periodNumber: number
  label: string
  days: Date[]
}

/**
 * Obtiene el jueves de inicio para una fecha dada
 */
export function getThursdayStart(date: Date): Date {
  const result = new Date(date)

  // Si es jueves, usar esa fecha
  if (result.getDay() === 4) {
    return result
  }

  // Si es viernes, sábado o domingo, ir al jueves anterior
  if (result.getDay() >= 5 || result.getDay() === 0) {
    while (result.getDay() !== 4) {
      result.setDate(result.getDate() - 1)
    }
    return result
  }

  // Si es lunes, martes o miércoles, ir al jueves anterior
  while (result.getDay() !== 4) {
    result.setDate(result.getDate() - 1)
  }

  return result
}

/**
 * Crea un período de trabajo de 11 días desde un jueves
 */
export function createWorkPeriod(thursdayStart: Date, periodNumber = 0): WorkPeriod {
  const start = new Date(thursdayStart)
  const end = new Date(thursdayStart)
  end.setDate(start.getDate() + 10) // 11 días total (0-10)

  // Crear array con todos los días del período
  const days: Date[] = []
  for (let i = 0; i <= 10; i++) {
    const day = new Date(start)
    day.setDate(start.getDate() + i)
    days.push(day)
  }

  const label = `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}`

  return {
    start,
    end,
    periodNumber,
    label,
    days,
  }
}

/**
 * Obtiene el período de trabajo actual
 */
export function getCurrentWorkPeriod(): WorkPeriod {
  const today = new Date()
  const thursdayStart = getThursdayStart(today)
  return createWorkPeriod(thursdayStart, 0)
}

/**
 * Obtiene múltiples períodos de trabajo hacia atrás desde hoy
 */
export function getWorkPeriods(count = 8): WorkPeriod[] {
  const periods: WorkPeriod[] = []
  const today = new Date()
  let currentThursday = getThursdayStart(today)

  // Generar períodos hacia atrás
  for (let i = 0; i < count; i++) {
    const period = createWorkPeriod(currentThursday, -i)
    periods.push(period)

    // Ir al jueves anterior (11 días atrás)
    currentThursday = new Date(currentThursday)
    currentThursday.setDate(currentThursday.getDate() - 11)
  }

  return periods.reverse() // Más antiguo primero
}

/**
 * Obtiene períodos de trabajo para un mes específico
 */
export function getWorkPeriodsForMonth(year: number, month: number): WorkPeriod[] {
  const periods: WorkPeriod[] = []
  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0)

  // Encontrar el primer jueves del mes o antes
  const currentThursday = getThursdayStart(monthStart)

  // Si el jueves está antes del mes, avanzar hasta que el período toque el mes
  while (true) {
    const period = createWorkPeriod(currentThursday)

    // Si el período termina antes del mes, avanzar
    if (period.end < monthStart) {
      currentThursday.setDate(currentThursday.getDate() + 11)
      continue
    }

    // Si el período empieza después del mes, parar
    if (period.start > monthEnd) {
      break
    }

    // El período toca el mes, agregarlo
    periods.push(period)
    currentThursday.setDate(currentThursday.getDate() + 11)
  }

  return periods
}

/**
 * Verifica si una fecha está dentro de un período de trabajo
 */
export function isDateInWorkPeriod(date: Date, period: WorkPeriod): boolean {
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const startOnly = new Date(period.start.getFullYear(), period.start.getMonth(), period.start.getDate())
  const endOnly = new Date(period.end.getFullYear(), period.end.getMonth(), period.end.getDate())

  return dateOnly >= startOnly && dateOnly <= endOnly
}

/**
 * Obtiene el período de trabajo que contiene una fecha específica
 */
export function getWorkPeriodForDate(date: Date): WorkPeriod {
  const thursdayStart = getThursdayStart(date)

  // Verificar si la fecha está en el período que empieza en este jueves
  const currentPeriod = createWorkPeriod(thursdayStart)
  if (isDateInWorkPeriod(date, currentPeriod)) {
    return currentPeriod
  }

  // Si no, debe estar en el período anterior
  const previousThursday = new Date(thursdayStart)
  previousThursday.setDate(previousThursday.getDate() - 11)
  return createWorkPeriod(previousThursday)
}

/**
 * Formatea un período de trabajo para mostrar
 */
export function formatWorkPeriod(period: WorkPeriod): string {
  const startDay = period.start.getDate()
  const startMonth = period.start.toLocaleDateString("es-ES", { month: "short" })
  const endDay = period.end.getDate()
  const endMonth = period.end.toLocaleDateString("es-ES", { month: "short" })

  if (startMonth === endMonth) {
    return `${startDay}-${endDay} ${startMonth}`
  } else {
    return `${startDay} ${startMonth} - ${endDay} ${endMonth}`
  }
}

/**
 * Obtiene información detallada del período actual
 */
export function getCurrentPeriodInfo(): {
  period: WorkPeriod
  dayNumber: number
  daysRemaining: number
  isWorkDay: boolean
} {
  const today = new Date()
  const period = getCurrentWorkPeriod()

  // Encontrar qué día del período es hoy
  let dayNumber = 0
  let isWorkDay = false

  for (let i = 0; i < period.days.length; i++) {
    const periodDay = period.days[i]
    if (
      periodDay.getDate() === today.getDate() &&
      periodDay.getMonth() === today.getMonth() &&
      periodDay.getFullYear() === today.getFullYear()
    ) {
      dayNumber = i + 1
      isWorkDay = true
      break
    }
  }

  const daysRemaining = 11 - dayNumber

  return {
    period,
    dayNumber,
    daysRemaining,
    isWorkDay,
  }
}
