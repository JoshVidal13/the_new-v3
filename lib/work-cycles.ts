/**
 * Sistema de ciclos de trabajo: 11 días laborables + 3 días de descanso
 * Cada ciclo inicia en jueves y el trabajo termina el segundo domingo siguiente
 * Después hay 3 días de descanso (lunes, martes, miércoles)
 * El siguiente ciclo inicia el jueves siguiente
 */

export interface WorkCycle {
  cycleNumber: number
  workStart: Date // Jueves
  workEnd: Date // Segundo domingo siguiente (día 11)
  restStart: Date // Lunes siguiente
  restEnd: Date // Miércoles siguiente
  nextCycleStart: Date // Jueves siguiente
  label: string
  workDays: Date[]
  restDays: Date[]
  isActive: boolean // Si estamos actualmente en este ciclo
  isWorkPeriod: boolean // Si hoy es día de trabajo de este ciclo
  isRestPeriod: boolean // Si hoy es día de descanso de este ciclo
}

// Fecha de inicio del sistema: Jueves 26 de junio de 2025
const SYSTEM_START_DATE = new Date(2025, 5, 26) // Mes 5 = junio (0-indexed)

/**
 * Verifica si una fecha es el jueves 26 de junio de 2025 o posterior
 */
export function isValidSystemDate(date: Date): boolean {
  return date >= SYSTEM_START_DATE
}

/**
 * Crea un ciclo de trabajo específico
 */
export function createWorkCycle(cycleNumber: number): WorkCycle {
  // Cada ciclo completo dura 14 días (11 trabajo + 3 descanso)
  const cycleStartOffset = (cycleNumber - 1) * 14

  const workStart = new Date(SYSTEM_START_DATE)
  workStart.setDate(SYSTEM_START_DATE.getDate() + cycleStartOffset)

  // El trabajo dura 11 días (día 0 al día 10)
  const workEnd = new Date(workStart)
  workEnd.setDate(workStart.getDate() + 10)

  // El descanso empieza el día siguiente al trabajo (lunes)
  const restStart = new Date(workEnd)
  restStart.setDate(workEnd.getDate() + 1)

  // El descanso dura 3 días (lunes, martes, miércoles)
  const restEnd = new Date(restStart)
  restEnd.setDate(restStart.getDate() + 2)

  // El siguiente ciclo empieza el jueves siguiente
  const nextCycleStart = new Date(restEnd)
  nextCycleStart.setDate(restEnd.getDate() + 1)

  // Crear arrays con todos los días
  const workDays: Date[] = []
  for (let i = 0; i <= 10; i++) {
    const day = new Date(workStart)
    day.setDate(workStart.getDate() + i)
    workDays.push(day)
  }

  const restDays: Date[] = []
  for (let i = 0; i <= 2; i++) {
    const day = new Date(restStart)
    day.setDate(restStart.getDate() + i)
    restDays.push(day)
  }

  const today = new Date()
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  // Verificar si estamos en este ciclo
  const cycleStart = new Date(workStart.getFullYear(), workStart.getMonth(), workStart.getDate())
  const cycleEnd = new Date(restEnd.getFullYear(), restEnd.getMonth(), restEnd.getDate())
  const isActive = todayOnly >= cycleStart && todayOnly <= cycleEnd

  // Verificar si hoy es día de trabajo
  const isWorkPeriod = workDays.some((day) => {
    const dayOnly = new Date(day.getFullYear(), day.getMonth(), day.getDate())
    return dayOnly.getTime() === todayOnly.getTime()
  })

  // Verificar si hoy es día de descanso
  const isRestPeriod = restDays.some((day) => {
    const dayOnly = new Date(day.getFullYear(), day.getMonth(), day.getDate())
    return dayOnly.getTime() === todayOnly.getTime()
  })

  const label = `Ciclo ${cycleNumber}: ${formatDate(workStart)} - ${formatDate(workEnd)}`

  return {
    cycleNumber,
    workStart,
    workEnd,
    restStart,
    restEnd,
    nextCycleStart,
    label,
    workDays,
    restDays,
    isActive,
    isWorkPeriod,
    isRestPeriod,
  }
}

/**
 * Obtiene el número de ciclo para una fecha específica
 */
export function getCycleNumberForDate(date: Date): number {
  if (!isValidSystemDate(date)) {
    return 0 // Antes del sistema
  }

  const daysDifference = Math.floor((date.getTime() - SYSTEM_START_DATE.getTime()) / (1000 * 60 * 60 * 24))
  return Math.floor(daysDifference / 14) + 1
}

/**
 * Obtiene el ciclo actual
 */
export function getCurrentWorkCycle(): WorkCycle {
  const today = new Date()
  const cycleNumber = getCycleNumberForDate(today)
  return createWorkCycle(cycleNumber)
}

/**
 * Obtiene múltiples ciclos (históricos y futuros)
 */
export function getWorkCycles(count = 10): WorkCycle[] {
  const currentCycleNumber = getCycleNumberForDate(new Date())
  const cycles: WorkCycle[] = []

  // Generar ciclos desde algunos anteriores hasta algunos futuros
  const startCycle = Math.max(1, currentCycleNumber - Math.floor(count / 2))

  for (let i = 0; i < count; i++) {
    const cycleNumber = startCycle + i
    cycles.push(createWorkCycle(cycleNumber))
  }

  return cycles
}

/**
 * Verifica si una fecha está en período de trabajo de un ciclo
 */
export function isDateInWorkPeriod(date: Date, cycle: WorkCycle): boolean {
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  return cycle.workDays.some((workDay) => {
    const workDayOnly = new Date(workDay.getFullYear(), workDay.getMonth(), workDay.getDate())
    return workDayOnly.getTime() === dateOnly.getTime()
  })
}

/**
 * Verifica si una fecha está en período de descanso de un ciclo
 */
export function isDateInRestPeriod(date: Date, cycle: WorkCycle): boolean {
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  return cycle.restDays.some((restDay) => {
    const restDayOnly = new Date(restDay.getFullYear(), restDay.getMonth(), restDay.getDate())
    return restDayOnly.getTime() === dateOnly.getTime()
  })
}

/**
 * Obtiene el ciclo que contiene una fecha específica
 */
export function getWorkCycleForDate(date: Date): WorkCycle | null {
  if (!isValidSystemDate(date)) {
    return null
  }

  const cycleNumber = getCycleNumberForDate(date)
  return createWorkCycle(cycleNumber)
}

/**
 * Obtiene información detallada del estado actual
 */
export function getCurrentCycleInfo(): {
  cycle: WorkCycle
  dayNumber: number // Qué día del ciclo es hoy (1-14)
  workDayNumber: number // Qué día de trabajo es (1-11, 0 si es descanso)
  restDayNumber: number // Qué día de descanso es (1-3, 0 si es trabajo)
  daysUntilNextCycle: number
  status: "work" | "rest" | "before-system"
} {
  const today = new Date()

  if (!isValidSystemDate(today)) {
    const daysUntilStart = Math.ceil((SYSTEM_START_DATE.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return {
      cycle: createWorkCycle(1),
      dayNumber: 0,
      workDayNumber: 0,
      restDayNumber: 0,
      daysUntilNextCycle: daysUntilStart,
      status: "before-system",
    }
  }

  const cycle = getCurrentWorkCycle()
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  // Calcular qué día del ciclo es hoy
  const cycleStartOnly = new Date(cycle.workStart.getFullYear(), cycle.workStart.getMonth(), cycle.workStart.getDate())
  const dayNumber = Math.floor((todayOnly.getTime() - cycleStartOnly.getTime()) / (1000 * 60 * 60 * 24)) + 1

  let workDayNumber = 0
  let restDayNumber = 0
  let status: "work" | "rest" | "before-system" = "work"

  if (cycle.isWorkPeriod) {
    workDayNumber =
      cycle.workDays.findIndex((day) => {
        const dayOnly = new Date(day.getFullYear(), day.getMonth(), day.getDate())
        return dayOnly.getTime() === todayOnly.getTime()
      }) + 1
    status = "work"
  } else if (cycle.isRestPeriod) {
    restDayNumber =
      cycle.restDays.findIndex((day) => {
        const dayOnly = new Date(day.getFullYear(), day.getMonth(), day.getDate())
        return dayOnly.getTime() === todayOnly.getTime()
      }) + 1
    status = "rest"
  }

  // Días hasta el siguiente ciclo
  const nextCycleStartOnly = new Date(
    cycle.nextCycleStart.getFullYear(),
    cycle.nextCycleStart.getMonth(),
    cycle.nextCycleStart.getDate(),
  )
  const daysUntilNextCycle = Math.ceil((nextCycleStartOnly.getTime() - todayOnly.getTime()) / (1000 * 60 * 60 * 24))

  return {
    cycle,
    dayNumber,
    workDayNumber,
    restDayNumber,
    daysUntilNextCycle,
    status,
  }
}

/**
 * Genera una lista de los primeros ciclos del sistema
 */
export function generateInitialCycles(count = 20): Array<{
  cycleNumber: number
  workPeriod: string
  restPeriod: string
  totalDays: number
}> {
  const cycles = []

  for (let i = 1; i <= count; i++) {
    const cycle = createWorkCycle(i)
    cycles.push({
      cycleNumber: i,
      workPeriod: `${formatDate(cycle.workStart)} - ${formatDate(cycle.workEnd)}`,
      restPeriod: `${formatDate(cycle.restStart)} - ${formatDate(cycle.restEnd)}`,
      totalDays: 14,
    })
  }

  return cycles
}

/**
 * Formatea una fecha para mostrar
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

/**
 * Obtiene el progreso del ciclo actual (0-100)
 */
export function getCurrentCycleProgress(): number {
  const info = getCurrentCycleInfo()
  if (info.status === "before-system") return 0
  return Math.min(100, (info.dayNumber / 14) * 100)
}

/**
 * Obtiene el progreso del período de trabajo actual (0-100)
 */
export function getCurrentWorkProgress(): number {
  const info = getCurrentCycleInfo()
  if (info.status !== "work") return info.status === "rest" ? 100 : 0
  return Math.min(100, (info.workDayNumber / 11) * 100)
}
