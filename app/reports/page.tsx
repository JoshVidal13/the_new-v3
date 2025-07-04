"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  AlertTriangle,
  BarChart3,
  PieChart,
  DollarSign,
  Activity,
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"
import { useEntries } from "@/hooks/use-entries"
import { ConnectionStatus } from "@/components/connection-status"
import { createLocalDate } from "@/lib/date-utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { FinanceChart } from "@/components/finance-chart"
import { getWorkCycles, isDateInWorkPeriod, getCurrentCycleInfo } from "@/lib/work-cycles"

interface CategoryData {
  category: string
  amount: number
  percentage: number
  entries: any[]
  trend: "up" | "down" | "stable"
}

export default function ReportsPage() {
  const { entries, loading } = useEntries()
  const [selectedCycles, setSelectedCycles] = useState("recent")
  const [activeTab, setActiveTab] = useState("overview")

  const currentCycleInfo = useMemo(() => getCurrentCycleInfo(), [])

  const filteredCycles = useMemo(() => {
    const allCycles = getWorkCycles(12)

    switch (selectedCycles) {
      case "current":
        return [currentCycleInfo.cycle]
      case "recent":
        return allCycles.slice(-6) // Últimos 6 ciclos
      case "all":
        return allCycles
      default:
        return allCycles.slice(-6)
    }
  }, [selectedCycles, currentCycleInfo])

  const cycleAnalysis = useMemo(() => {
    const cycleData = filteredCycles.map((cycle) => {
      // Entradas del período de trabajo
      const workEntries = entries.filter((entry) => {
        const entryDate = createLocalDate(entry.date)
        return isDateInWorkPeriod(entryDate, cycle)
      })

      // Entradas del período de descanso
      const restEntries = entries.filter((entry) => {
        const entryDate = createLocalDate(entry.date)
        return cycle.restDays.some((restDay) => {
          const restDayOnly = new Date(restDay.getFullYear(), restDay.getMonth(), restDay.getDate())
          const entryDateOnly = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate())
          return restDayOnly.getTime() === entryDateOnly.getTime()
        })
      })

      const allEntries = [...workEntries, ...restEntries]
      const ingresos = allEntries.filter((e) => e.type === "ingreso").reduce((sum, e) => sum + e.amount, 0)
      const gastos = allEntries.filter((e) => e.type === "gasto").reduce((sum, e) => sum + e.amount, 0)
      const inversiones = allEntries.filter((e) => e.type === "inversion").reduce((sum, e) => sum + e.amount, 0)

      return {
        cycle,
        entries: allEntries,
        workEntries,
        restEntries,
        ingresos,
        gastos,
        inversiones,
        balance: ingresos - inversiones,
        efficiency: ingresos > 0 ? ((ingresos - gastos - inversiones) / ingresos) * 100 : 0,
        workDays:
          workEntries.length > 0
            ? cycle.workDays.filter((day) =>
                workEntries.some((entry) => {
                  const entryDate = createLocalDate(entry.date)
                  const dayOnly = new Date(day.getFullYear(), day.getMonth(), day.getDate())
                  const entryDateOnly = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate())
                  return dayOnly.getTime() === entryDateOnly.getTime()
                }),
              ).length
            : 0,
      }
    })

    return cycleData.filter((data) => data.entries.length > 0)
  }, [filteredCycles, entries])

  const categoryAnalysis = useMemo(() => {
    const allEntries = cycleAnalysis.flatMap((cycle) => cycle.entries)
    const gastoCategories: { [key: string]: CategoryData } = {}
    const ingresoCategories: { [key: string]: CategoryData } = {}
    const inversionCategories: { [key: string]: CategoryData } = {}

    const gastoEntries = allEntries.filter((e) => e.type === "gasto")
    const ingresoEntries = allEntries.filter((e) => e.type === "ingreso")
    const inversionEntries = allEntries.filter((e) => e.type === "inversion")

    const totalGastos = gastoEntries.reduce((sum, e) => sum + e.amount, 0)
    const totalIngresos = ingresoEntries.reduce((sum, e) => sum + e.amount, 0)
    const totalInversiones = inversionEntries.reduce((sum, e) => sum + e.amount, 0)

    // Analizar gastos por categoría
    gastoEntries.forEach((entry) => {
      if (!gastoCategories[entry.category]) {
        gastoCategories[entry.category] = {
          category: entry.category,
          amount: 0,
          percentage: 0,
          entries: [],
          trend: "stable",
        }
      }
      gastoCategories[entry.category].amount += entry.amount
      gastoCategories[entry.category].entries.push(entry)
    })

    Object.values(gastoCategories).forEach((cat) => {
      cat.percentage = totalGastos > 0 ? (cat.amount / totalGastos) * 100 : 0
    })

    // Analizar ingresos por categoría
    ingresoEntries.forEach((entry) => {
      if (!ingresoCategories[entry.category]) {
        ingresoCategories[entry.category] = {
          category: entry.category,
          amount: 0,
          percentage: 0,
          entries: [],
          trend: "stable",
        }
      }
      ingresoCategories[entry.category].amount += entry.amount
      ingresoCategories[entry.category].entries.push(entry)
    })

    Object.values(ingresoCategories).forEach((cat) => {
      cat.percentage = totalIngresos > 0 ? (cat.amount / totalIngresos) * 100 : 0
    })

    // Analizar inversiones por categoría
    inversionEntries.forEach((entry) => {
      if (!inversionCategories[entry.category]) {
        inversionCategories[entry.category] = {
          category: entry.category,
          amount: 0,
          percentage: 0,
          entries: [],
          trend: "stable",
        }
      }
      inversionCategories[entry.category].amount += entry.amount
      inversionCategories[entry.category].entries.push(entry)
    })

    Object.values(inversionCategories).forEach((cat) => {
      cat.percentage = totalInversiones > 0 ? (cat.amount / totalInversiones) * 100 : 0
    })

    return {
      gastos: Object.values(gastoCategories).sort((a, b) => b.amount - a.amount),
      ingresos: Object.values(ingresoCategories).sort((a, b) => b.amount - a.amount),
      inversiones: Object.values(inversionCategories).sort((a, b) => b.amount - a.amount),
    }
  }, [cycleAnalysis])

  const totals = useMemo(() => {
    const ingresos = cycleAnalysis.reduce((sum, cycle) => sum + cycle.ingresos, 0)
    const gastos = cycleAnalysis.reduce((sum, cycle) => sum + cycle.gastos, 0)
    const inversiones = cycleAnalysis.reduce((sum, cycle) => sum + cycle.inversiones, 0)
    const balance = ingresos - inversiones
    const avgEfficiency =
      cycleAnalysis.length > 0
        ? cycleAnalysis.reduce((sum, cycle) => sum + cycle.efficiency, 0) / cycleAnalysis.length
        : 0

    return {
      ingresos,
      gastos,
      inversiones,
      balance,
      avgEfficiency,
      totalCycles: cycleAnalysis.length,
      activeDays: cycleAnalysis.reduce((sum, cycle) => sum + cycle.workDays, 0),
    }
  }, [cycleAnalysis])

  const chartData = useMemo(() => {
    const cyclesData = cycleAnalysis.map((cycleData) => ({
      name: `C${cycleData.cycle.cycleNumber}`,
      ingresos: cycleData.ingresos,
      gastos: cycleData.gastos,
      inversiones: cycleData.inversiones,
      balance: cycleData.balance,
      efficiency: cycleData.efficiency,
    }))

    const gastosCategorias = categoryAnalysis.gastos.map((cat) => ({
      name: cat.category,
      value: cat.amount,
    }))

    const ingresosCategorias = categoryAnalysis.ingresos.map((cat) => ({
      name: cat.category,
      value: cat.amount,
    }))

    const inversionesCategorias = categoryAnalysis.inversiones.map((cat) => ({
      name: cat.category,
      value: cat.amount,
    }))

    return {
      cyclesData,
      gastosCategorias,
      ingresosCategorias,
      inversionesCategorias,
    }
  }, [cycleAnalysis, categoryAnalysis])

  const insights = useMemo(() => {
    const insights = []

    if (totals.avgEfficiency > 30) {
      insights.push({
        type: "success",
        title: "🎯 Excelente Eficiencia",
        message: `Promedio de eficiencia del ${totals.avgEfficiency.toFixed(1)}% en los ciclos`,
        icon: Award,
      })
    }

    if (totals.balance > 0) {
      insights.push({
        type: "success",
        title: "💰 Balance Positivo",
        message: `Superávit total de $${totals.balance.toLocaleString()}`,
        icon: TrendingUp,
      })
    }

    const bestCycle = cycleAnalysis.reduce(
      (best, current) => (current.balance > best.balance ? current : best),
      cycleAnalysis[0],
    )

    if (bestCycle && cycleAnalysis.length > 1) {
      insights.push({
        type: "success",
        title: "🏆 Mejor Ciclo",
        message: `Ciclo ${bestCycle.cycle.cycleNumber} con $${bestCycle.balance.toLocaleString()} de balance`,
        icon: Target,
      })
    }

    if (categoryAnalysis.gastos.length > 0) {
      const topGasto = categoryAnalysis.gastos[0]
      if (topGasto.percentage > 40) {
        insights.push({
          type: "warning",
          title: "⚠️ Concentración de Gastos",
          message: `${topGasto.category} representa el ${topGasto.percentage.toFixed(1)}% de gastos`,
          icon: AlertTriangle,
        })
      }
    }

    return insights
  }, [totals, cycleAnalysis, categoryAnalysis])

  if (loading) {
    return (
      <div className="min-h-screen bg-black dark:bg-black p-4 flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="text-gray-100">Cargando reportes...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:bg-black p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">📊 Reportes por Ciclos</h1>
            <ConnectionStatus />
          </div>

          <div className="flex gap-3 items-center">
            <Select value={selectedCycles} onValueChange={setSelectedCycles}>
              <SelectTrigger className="w-48 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700">
                <SelectItem value="current">Ciclo Actual</SelectItem>
                <SelectItem value="recent">Últimos 6 Ciclos</SelectItem>
                <SelectItem value="all">Todos los Ciclos</SelectItem>
              </SelectContent>
            </Select>
            <ThemeToggle />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-800 dark:text-green-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Ingresos Totales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                ${totals.ingresos.toLocaleString()}
              </div>
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">{totals.totalCycles} ciclos analizados</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-800 dark:text-red-300 flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Gastos Totales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700 dark:text-red-400">${totals.gastos.toLocaleString()}</div>
              <p className="text-xs text-red-600 dark:text-red-500 mt-1">{totals.activeDays} días activos</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-800 dark:text-purple-300 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Inversiones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                ${totals.inversiones.toLocaleString()}
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-500 mt-1">Estrategia de crecimiento</p>
            </CardContent>
          </Card>

          <Card
            className={`bg-gradient-to-br ${
              totals.balance >= 0
                ? "from-blue-50 to-cyan-100 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800"
                : "from-orange-50 to-red-100 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800"
            }`}
          >
            <CardHeader className="pb-2">
              <CardTitle
                className={`text-sm font-medium flex items-center gap-2 ${
                  totals.balance >= 0 ? "text-blue-800 dark:text-blue-300" : "text-orange-800 dark:text-orange-300"
                }`}
              >
                <DollarSign className="w-4 h-4" />
                Balance Neto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  totals.balance >= 0 ? "text-blue-700 dark:text-blue-400" : "text-orange-700 dark:text-orange-400"
                }`}
              >
                ${totals.balance.toLocaleString()}
              </div>
              <p
                className={`text-xs mt-1 ${
                  totals.balance >= 0 ? "text-blue-600 dark:text-blue-500" : "text-orange-600 dark:text-orange-500"
                }`}
              >
                {totals.avgEfficiency.toFixed(1)}% eficiencia promedio
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Insights */}
        {insights.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insights.map((insight, index) => (
              <Card
                key={index}
                className={`${
                  insight.type === "success"
                    ? "bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800"
                    : "bg-gradient-to-br from-yellow-50 to-orange-100 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800"
                }`}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <insight.icon
                      className={`w-5 h-5 mt-0.5 ${
                        insight.type === "success"
                          ? "text-green-600 dark:text-green-400"
                          : "text-yellow-600 dark:text-yellow-400"
                      }`}
                    />
                    <div>
                      <h3
                        className={`font-semibold ${
                          insight.type === "success"
                            ? "text-green-800 dark:text-green-300"
                            : "text-yellow-800 dark:text-yellow-300"
                        }`}
                      >
                        {insight.title}
                      </h3>
                      <p
                        className={`text-sm ${
                          insight.type === "success"
                            ? "text-green-700 dark:text-green-400"
                            : "text-yellow-700 dark:text-yellow-400"
                        }`}
                      >
                        {insight.message}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Tabs defaultValue="overview" className="space-y-6" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <TabsTrigger
              value="overview"
              className="text-gray-700 dark:text-gray-300 data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-300"
            >
              📊 Resumen General
            </TabsTrigger>
            <TabsTrigger
              value="cycles"
              className="text-gray-700 dark:text-gray-300 data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-300"
            >
              🔄 Por Ciclos
            </TabsTrigger>
            <TabsTrigger
              value="categories"
              className="text-gray-700 dark:text-gray-300 data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-300"
            >
              📈 Por Categorías
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <BarChart3 className="w-5 h-5" />
                    Tendencia por Ciclos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <FinanceChart
                      type="bar"
                      data={chartData.cyclesData}
                      keys={["ingresos", "gastos", "inversiones"]}
                      colors={["#10b981", "#ef4444", "#8b5cf6"]}
                      indexBy="name"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <Activity className="w-5 h-5" />
                    Eficiencia por Ciclo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <FinanceChart
                      type="line"
                      data={chartData.cyclesData.map((d) => ({ name: d.name, value: d.efficiency }))}
                      colors={["#3b82f6"]}
                      keys={["value"]}
                      indexBy="name"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <PieChart className="w-5 h-5" />
                    Distribución de Gastos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <FinanceChart
                      type="pie"
                      data={chartData.gastosCategorias}
                      colors={["#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e"]}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <PieChart className="w-5 h-5" />
                    Distribución de Ingresos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <FinanceChart
                      type="pie"
                      data={chartData.ingresosCategorias}
                      colors={["#10b981", "#059669", "#047857", "#065f46", "#064e3b"]}
                    />
                  </div>
                </CardContent>
              </Card>

              {chartData.inversionesCategorias.length > 0 && (
                <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                      <Target className="w-5 h-5" />
                      Distribución de Inversiones
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <FinanceChart
                        type="pie"
                        data={chartData.inversionesCategorias}
                        colors={["#8b5cf6", "#7c3aed", "#6d28d9", "#5b21b6", "#4c1d95"]}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="cycles" className="space-y-6">
            <div className="grid gap-4">
              {cycleAnalysis.map((cycleData, index) => (
                <Card key={index} className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-gray-900 dark:text-white">
                        🔄 Ciclo {cycleData.cycle.cycleNumber}
                      </CardTitle>
                      <Badge
                        variant={cycleData.balance >= 0 ? "default" : "destructive"}
                        className={`${
                          cycleData.balance >= 0
                            ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                            : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                        }`}
                      >
                        {cycleData.balance >= 0 ? "Superávit" : "Déficit"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Trabajo: {format(cycleData.cycle.workStart, "d MMM", { locale: es })} -{" "}
                      {format(cycleData.cycle.workEnd, "d MMM", { locale: es })} • Descanso:{" "}
                      {format(cycleData.cycle.restStart, "d MMM", { locale: es })} -{" "}
                      {format(cycleData.cycle.restEnd, "d MMM", { locale: es })}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                          ${cycleData.ingresos.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Ingresos</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div className="text-lg font-bold text-red-600 dark:text-red-400">
                          ${cycleData.gastos.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Gastos</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                          ${cycleData.inversiones.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Inversiones</div>
                      </div>
                      <div
                        className={`text-center p-3 rounded-lg ${
                          cycleData.balance >= 0
                            ? "bg-blue-50 dark:bg-blue-900/20"
                            : "bg-orange-50 dark:bg-orange-900/20"
                        }`}
                      >
                        <div
                          className={`text-lg font-bold ${
                            cycleData.balance >= 0
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-orange-600 dark:text-orange-400"
                          }`}
                        >
                          ${cycleData.balance.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Balance</div>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                          {cycleData.efficiency.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Eficiencia</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">📊 Estadísticas</h4>
                        <div className="space-y-1 text-gray-600 dark:text-gray-400">
                          <div>• {cycleData.entries.length} movimientos totales</div>
                          <div>• {cycleData.workEntries.length} en período de trabajo</div>
                          <div>• {cycleData.restEntries.length} en período de descanso</div>
                          <div>• {cycleData.workDays} días con actividad</div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">🎯 Rendimiento</h4>
                        <div className="space-y-2">
                          <div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600 dark:text-gray-400">Eficiencia del ciclo</span>
                              <span className="text-gray-600 dark:text-gray-400">
                                {cycleData.efficiency.toFixed(1)}%
                              </span>
                            </div>
                            <Progress value={Math.max(0, Math.min(100, cycleData.efficiency))} className="h-2" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2">
                    <TrendingDown className="w-5 h-5" />
                    Gastos por Categoría
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {categoryAnalysis.gastos.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                      No hay gastos en los ciclos seleccionados
                    </p>
                  ) : (
                    categoryAnalysis.gastos.map((category, index) => (
                      <div key={category.category} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 text-xs">
                              #{index + 1}
                            </Badge>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{category.category}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-red-600 dark:text-red-400">
                              ${category.amount.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {category.percentage.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                        <Progress value={category.percentage} className="h-2" />
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {category.entries.length} movimiento{category.entries.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="text-green-700 dark:text-green-400 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Ingresos por Categoría
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {categoryAnalysis.ingresos.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                      No hay ingresos en los ciclos seleccionados
                    </p>
                  ) : (
                    categoryAnalysis.ingresos.map((category, index) => (
                      <div key={category.category} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 text-xs">
                              #{index + 1}
                            </Badge>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{category.category}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-600 dark:text-green-400">
                              ${category.amount.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {category.percentage.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                        <Progress value={category.percentage} className="h-2" />
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {category.entries.length} movimiento{category.entries.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="text-purple-700 dark:text-purple-400 flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Inversiones por Categoría
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {categoryAnalysis.inversiones.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                      No hay inversiones en los ciclos seleccionados
                    </p>
                  ) : (
                    categoryAnalysis.inversiones.map((category, index) => (
                      <div key={category.category} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300 text-xs">
                              #{index + 1}
                            </Badge>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{category.category}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-purple-600 dark:text-purple-400">
                              ${category.amount.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {category.percentage.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                        <Progress value={category.percentage} className="h-2" />
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {category.entries.length} movimiento{category.entries.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
