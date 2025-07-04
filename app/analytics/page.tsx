"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft,
  TrendingUp,
  Target,
  Award,
  AlertTriangle,
  BarChart3,
  Activity,
  Zap,
  Calculator,
  Eye,
  Brain,
  Gauge,
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"
import { useEntries } from "@/hooks/use-entries"
import { ConnectionStatus } from "@/components/connection-status"
import { createLocalDate } from "@/lib/date-utils"
import { FinanceChart } from "@/components/finance-chart"
import { ThemeToggle } from "@/components/theme-toggle"
import { getWorkCycles, isDateInWorkPeriod, getCurrentCycleInfo } from "@/lib/work-cycles"

export default function AnalyticsPage() {
  const { entries, loading } = useEntries()
  const [selectedPeriod, setSelectedPeriod] = useState("recent")

  const currentCycleInfo = useMemo(() => getCurrentCycleInfo(), [])

  const cycleAnalysis = useMemo(() => {
    const allCycles = getWorkCycles(12)
    const selectedCycles =
      selectedPeriod === "current"
        ? [currentCycleInfo.cycle]
        : selectedPeriod === "recent"
          ? allCycles.slice(-8)
          : allCycles

    const cycleData = selectedCycles.map((cycle) => {
      const workEntries = entries.filter((entry) => {
        const entryDate = createLocalDate(entry.date)
        return isDateInWorkPeriod(entryDate, cycle)
      })

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

      const balance = ingresos - inversiones
      const roi = inversiones > 0 ? (balance / inversiones) * 100 : 0
      const efficiency = ingresos > 0 ? ((ingresos - gastos - inversiones) / ingresos) * 100 : 0
      const productivity = workEntries.length > 0 ? ingresos / workEntries.length : 0
      const burnRate = gastos / 11 // Gastos por día de trabajo
      const investmentRatio = ingresos > 0 ? (inversiones / ingresos) * 100 : 0

      return {
        cycle,
        entries: allEntries,
        workEntries,
        restEntries,
        ingresos,
        gastos,
        inversiones,
        balance,
        roi,
        efficiency,
        productivity,
        burnRate,
        investmentRatio,
        activeDays:
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
  }, [entries, selectedPeriod, currentCycleInfo])

  const analytics = useMemo(() => {
    if (cycleAnalysis.length === 0) {
      return {
        totalIngresos: 0,
        totalGastos: 0,
        totalInversiones: 0,
        totalBalance: 0,
        avgROI: 0,
        avgEfficiency: 0,
        avgProductivity: 0,
        avgBurnRate: 0,
        avgInvestmentRatio: 0,
        bestCycle: null,
        worstCycle: null,
        totalActiveDays: 0,
        consistencyScore: 0,
        growthRate: 0,
      }
    }

    const totalIngresos = cycleAnalysis.reduce((sum, cycle) => sum + cycle.ingresos, 0)
    const totalGastos = cycleAnalysis.reduce((sum, cycle) => sum + cycle.gastos, 0)
    const totalInversiones = cycleAnalysis.reduce((sum, cycle) => sum + cycle.inversiones, 0)
    const totalBalance = totalIngresos - totalInversiones

    const avgROI = cycleAnalysis.reduce((sum, cycle) => sum + cycle.roi, 0) / cycleAnalysis.length
    const avgEfficiency = cycleAnalysis.reduce((sum, cycle) => sum + cycle.efficiency, 0) / cycleAnalysis.length
    const avgProductivity = cycleAnalysis.reduce((sum, cycle) => sum + cycle.productivity, 0) / cycleAnalysis.length
    const avgBurnRate = cycleAnalysis.reduce((sum, cycle) => sum + cycle.burnRate, 0) / cycleAnalysis.length
    const avgInvestmentRatio =
      cycleAnalysis.reduce((sum, cycle) => sum + cycle.investmentRatio, 0) / cycleAnalysis.length

    const bestCycle = cycleAnalysis.reduce(
      (best, current) => (current.balance > best.balance ? current : best),
      cycleAnalysis[0],
    )
    const worstCycle = cycleAnalysis.reduce(
      (worst, current) => (current.balance < worst.balance ? current : worst),
      cycleAnalysis[0],
    )

    const totalActiveDays = cycleAnalysis.reduce((sum, cycle) => sum + cycle.activeDays, 0)

    // Calcular consistencia (variación en eficiencia)
    const efficiencyVariance =
      cycleAnalysis.reduce((sum, cycle) => sum + Math.pow(cycle.efficiency - avgEfficiency, 2), 0) /
      cycleAnalysis.length
    const consistencyScore = Math.max(0, 100 - Math.sqrt(efficiencyVariance))

    // Calcular tasa de crecimiento
    const firstHalf = cycleAnalysis.slice(0, Math.floor(cycleAnalysis.length / 2))
    const secondHalf = cycleAnalysis.slice(Math.floor(cycleAnalysis.length / 2))
    const firstHalfAvg = firstHalf.reduce((sum, cycle) => sum + cycle.balance, 0) / firstHalf.length
    const secondHalfAvg = secondHalf.reduce((sum, cycle) => sum + cycle.balance, 0) / secondHalf.length
    const growthRate = firstHalfAvg !== 0 ? ((secondHalfAvg - firstHalfAvg) / Math.abs(firstHalfAvg)) * 100 : 0

    return {
      totalIngresos,
      totalGastos,
      totalInversiones,
      totalBalance,
      avgROI,
      avgEfficiency,
      avgProductivity,
      avgBurnRate,
      avgInvestmentRatio,
      bestCycle,
      worstCycle,
      totalActiveDays,
      consistencyScore,
      growthRate,
    }
  }, [cycleAnalysis])

  const chartData = useMemo(() => {
    const performanceData = cycleAnalysis.map((cycleData) => ({
      name: `C${cycleData.cycle.cycleNumber}`,
      roi: cycleData.roi,
      efficiency: cycleData.efficiency,
      productivity: cycleData.productivity,
      burnRate: cycleData.burnRate,
      balance: cycleData.balance,
    }))

    const trendData = cycleAnalysis.map((cycleData) => ({
      name: `C${cycleData.cycle.cycleNumber}`,
      ingresos: cycleData.ingresos,
      gastos: cycleData.gastos,
      inversiones: cycleData.inversiones,
      balance: cycleData.balance,
    }))

    return {
      performanceData,
      trendData,
    }
  }, [cycleAnalysis])

  const insights = useMemo(() => {
    const insights = []

    if (analytics.avgROI > 20) {
      insights.push({
        type: "success",
        title: "🚀 ROI Excepcional",
        message: `ROI promedio del ${analytics.avgROI.toFixed(1)}% - Excelente retorno de inversión`,
        icon: Target,
      })
    } else if (analytics.avgROI > 0) {
      insights.push({
        type: "success",
        title: "🚀 ROI Positivo",
        message: `ROI promedio del ${analytics.avgROI.toFixed(1)}% - Excelente retorno de inversión`,
        icon: Target,
      })
    } else if (analytics.avgROI < 0) {
      insights.push({
        type: "warning",
        title: "⚠️ ROI Negativo",
        message: `ROI promedio del ${analytics.avgROI.toFixed(1)}% - Revisar estrategia de inversión`,
        icon: AlertTriangle,
      })
    }

    if (analytics.avgEfficiency > 30) {
      insights.push({
        type: "success",
        title: "⚡ Alta Eficiencia",
        message: `Eficiencia promedio del ${analytics.avgEfficiency.toFixed(1)}% - Gestión óptima`,
        icon: Zap,
      })
    }

    if (analytics.consistencyScore > 80) {
      insights.push({
        type: "success",
        title: "🎯 Consistencia Excelente",
        message: `Puntuación de consistencia: ${analytics.consistencyScore.toFixed(1)}% - Rendimiento estable`,
        icon: Award,
      })
    }

    if (analytics.growthRate > 10) {
      insights.push({
        type: "success",
        title: "📈 Crecimiento Positivo",
        message: `Tasa de crecimiento del ${analytics.growthRate.toFixed(1)}% entre períodos`,
        icon: TrendingUp,
      })
    } else if (analytics.growthRate < -10) {
      insights.push({
        type: "warning",
        title: "📉 Tendencia Decreciente",
        message: `Declive del ${Math.abs(analytics.growthRate).toFixed(1)}% - Requiere atención`,
        icon: AlertTriangle,
      })
    }

    if (analytics.avgBurnRate > 1000) {
      insights.push({
        type: "warning",
        title: "🔥 Alto Burn Rate",
        message: `$${analytics.avgBurnRate.toFixed(0)} por día - Controlar gastos operativos`,
        icon: AlertTriangle,
      })
    }

    return insights
  }, [analytics])

  if (loading) {
    return (
      <div className="min-h-screen bg-black dark:bg-black p-4 flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="text-gray-100">Cargando análisis...</span>
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">🧠 Análisis Inteligente</h1>
            <ConnectionStatus />
          </div>

          <div className="flex gap-3 items-center">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-48 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700">
                <SelectItem value="current">🎯 Ciclo Actual</SelectItem>
                <SelectItem value="recent">📊 Últimos 8 Ciclos</SelectItem>
                <SelectItem value="all">📈 Todos los Ciclos</SelectItem>
              </SelectContent>
            </Select>
            <ThemeToggle />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                ROI Promedio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${analytics.avgROI >= 0 ? "text-blue-700 dark:text-blue-400" : "text-red-700 dark:text-red-400"}`}
              >
                {analytics.avgROI.toFixed(1)}%
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">Retorno de inversión</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-800 dark:text-green-300 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Eficiencia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                {analytics.avgEfficiency.toFixed(1)}%
              </div>
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">Gestión de recursos</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-800 dark:text-purple-300 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Productividad
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                ${analytics.avgProductivity.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-500 mt-1">Por movimiento</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-red-100 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-800 dark:text-orange-300 flex items-center gap-2">
                <Gauge className="w-4 h-4" />
                Consistencia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                {analytics.consistencyScore.toFixed(1)}%
              </div>
              <p className="text-xs text-orange-600 dark:text-orange-500 mt-1">Estabilidad</p>
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

        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <TabsTrigger
              value="performance"
              className="text-gray-700 dark:text-gray-300 data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-300"
            >
              ⚡ Rendimiento
            </TabsTrigger>
            <TabsTrigger
              value="trends"
              className="text-gray-700 dark:text-gray-300 data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-300"
            >
              📈 Tendencias
            </TabsTrigger>
            <TabsTrigger
              value="comparison"
              className="text-gray-700 dark:text-gray-300 data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-300"
            >
              🔍 Comparación
            </TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <Target className="w-5 h-5" />
                    ROI por Ciclo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <FinanceChart
                      type="bar"
                      data={chartData.performanceData}
                      keys={["roi"]}
                      colors={["#3b82f6"]}
                      indexBy="name"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <Zap className="w-5 h-5" />
                    Eficiencia por Ciclo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <FinanceChart
                      type="line"
                      data={chartData.performanceData.map((d) => ({ name: d.name, value: d.efficiency }))}
                      colors={["#10b981"]}
                      keys={["value"]}
                      indexBy="name"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <Activity className="w-5 h-5" />
                    Productividad vs Burn Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <FinanceChart
                      type="bar"
                      data={chartData.performanceData}
                      keys={["productivity", "burnRate"]}
                      colors={["#8b5cf6", "#ef4444"]}
                      indexBy="name"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <Eye className="w-5 h-5" />
                    Métricas Clave
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        ${analytics.totalBalance.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Balance Total</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        {analytics.totalActiveDays}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Días Activos</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {analytics.avgInvestmentRatio.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Ratio Inversión</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                        ${analytics.avgBurnRate.toFixed(0)}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Burn Rate/Día</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <BarChart3 className="w-5 h-5" />
                  Evolución Financiera por Ciclos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <FinanceChart
                    type="bar"
                    data={chartData.trendData}
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
                  <TrendingUp className="w-5 h-5" />
                  Tendencia del Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <FinanceChart
                    type="line"
                    data={chartData.trendData.map((d) => ({ name: d.name, value: d.balance }))}
                    colors={["#3b82f6"]}
                    keys={["value"]}
                    indexBy="name"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6">
            {analytics.bestCycle && analytics.worstCycle && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
                  <CardHeader>
                    <CardTitle className="text-green-800 dark:text-green-300 flex items-center gap-2">
                      <Award className="w-5 h-5" />🏆 Mejor Ciclo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-700 dark:text-green-400 mb-2">
                        Ciclo {analytics.bestCycle.cycle.cycleNumber}
                      </div>
                      <div className="text-sm text-green-600 dark:text-green-500">
                        {format(analytics.bestCycle.cycle.workStart, "d MMM", { locale: es })} -{" "}
                        {format(analytics.bestCycle.cycle.workEnd, "d MMM", { locale: es })}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                        <div className="font-bold text-green-600 dark:text-green-400">
                          ${analytics.bestCycle.balance.toLocaleString()}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">Balance</div>
                      </div>
                      <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                        <div className="font-bold text-green-600 dark:text-green-400">
                          {analytics.bestCycle.efficiency.toFixed(1)}%
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">Eficiencia</div>
                      </div>
                      <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                        <div className="font-bold text-green-600 dark:text-green-400">
                          {analytics.bestCycle.roi.toFixed(1)}%
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">ROI</div>
                      </div>
                      <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                        <div className="font-bold text-green-600 dark:text-green-400">
                          {analytics.bestCycle.activeDays}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">Días Activos</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-800">
                  <CardHeader>
                    <CardTitle className="text-red-800 dark:text-red-300 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />📉 Ciclo a Mejorar
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-700 dark:text-red-400 mb-2">
                        Ciclo {analytics.worstCycle.cycle.cycleNumber}
                      </div>
                      <div className="text-sm text-red-600 dark:text-red-500">
                        {format(analytics.worstCycle.cycle.workStart, "d MMM", { locale: es })} -{" "}
                        {format(analytics.worstCycle.cycle.workEnd, "d MMM", { locale: es })}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                        <div className="font-bold text-red-600 dark:text-red-400">
                          ${analytics.worstCycle.balance.toLocaleString()}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">Balance</div>
                      </div>
                      <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                        <div className="font-bold text-red-600 dark:text-red-400">
                          {analytics.worstCycle.efficiency.toFixed(1)}%
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">Eficiencia</div>
                      </div>
                      <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                        <div className="font-bold text-red-600 dark:text-red-400">
                          {analytics.worstCycle.roi.toFixed(1)}%
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">ROI</div>
                      </div>
                      <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                        <div className="font-bold text-red-600 dark:text-red-400">
                          {analytics.worstCycle.activeDays}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">Días Activos</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <Brain className="w-5 h-5" />
                  Análisis Comparativo Detallado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300">📊 Rendimiento General</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Ciclos analizados:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{cycleAnalysis.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Tasa de crecimiento:</span>
                        <span
                          className={`font-medium ${analytics.growthRate >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                        >
                          {analytics.growthRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Consistencia:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {analytics.consistencyScore.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300">💰 Métricas Financieras</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">ROI promedio:</span>
                        <span
                          className={`font-medium ${analytics.avgROI >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                        >
                          {analytics.avgROI.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Eficiencia promedio:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {analytics.avgEfficiency.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Ratio de inversión:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {analytics.avgInvestmentRatio.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300">⚡ Productividad</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Productividad promedio:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          ${analytics.avgProductivity.toFixed(0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Burn rate promedio:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          ${analytics.avgBurnRate.toFixed(0)}/día
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Días activos totales:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {analytics.totalActiveDays}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
</merged_code>
