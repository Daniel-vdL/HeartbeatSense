import React, { useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Activity, FileText, Heart, LogOut, TrendingUp, User } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { auth } from "@/lib/auth"

// --- ROUTE SETUP ---
export const Route = createFileRoute('/overzicht/')({
  component: RouteComponent,
  beforeLoad: async () => {
    const isValid = await auth.validateSession()
    if (!isValid) {
      throw redirect({ to: "/login" })
    }
  },
})

function RouteComponent() {
  const router = useRouter()
  const bg = 'linear-gradient(135deg, #6b5b9f 0%, #8b7db8 50%, #9b8dc8 100%)'
  const displayName = auth.getDisplayName()
  const handleLogout = async () => {
    auth.clear()
    await router.navigate({ to: "/login" })
  }

  // --- JOUW LOGICA ---
  const { data: measurements, isLoading, error } = useQuery({
    queryKey: ['measurements', 'overview'],
    queryFn: async () => {
      const token = auth.getToken()
      if (!token) throw new Error("No auth token")
      const params = new URLSearchParams({ limit: "500" })
      const response = await fetch(`/api/measurements/latest?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      })
      if (!response.ok) {
        throw new Error(`Failed to fetch measurements (${response.status})`)
      }
      return (await response.json()) as {
        items: Array<{
          value: string | number
          deviceId?: string
          createdAt: string
        }>
      }
    },
    refetchInterval: 15_000,
    staleTime: 10_000,
  })

  const parsed = useMemo(() => {
    const items = measurements?.items ?? []
    const normalized = items
      .map((m) => ({
        ...m,
        bpm: Number(m.value),
        date: new Date(m.createdAt),
      }))
      .filter((m) => Number.isFinite(m.bpm))
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    const todayPoints = new Map<string, { sum: number; count: number }>()
    const dataByDay = new Map<string, Array<{ time: string; bpm: number }>>()

    normalized.forEach((m) => {
      const dayKey = m.date.toISOString().split('T')[0]
      const timeLabel = `${m.date.getHours()}:${m.date.getMinutes().toString().padStart(2, '0')}`
      const arr = dataByDay.get(dayKey) ?? []
      arr.push({ time: timeLabel, bpm: m.bpm })
      dataByDay.set(dayKey, arr)
    })

    const hourlyByDay: Record<string, Array<{ time: string; bpm: number }>> = {}
    Array.from(dataByDay.entries()).forEach(([day, points]) => {
      hourlyByDay[day] = points
        .map((p) => ({ ...p, bpm: Math.round(p.bpm) }))
        .sort((a, b) => {
          const [ah, am] = a.time.split(':').map(Number)
          const [bh, bm] = b.time.split(':').map(Number)
          return ah === bh ? am - bm : ah - bh
        })
    })

    const todayData = hourlyByDay[todayStart.toISOString().split('T')[0]] ?? []

    const weekLabels = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za']
    const weekPoints = new Map<string, { sum: number; count: number }>()
    normalized.forEach((m) => {
      const label = weekLabels[m.date.getDay()]
      const bucket = weekPoints.get(label) ?? { sum: 0, count: 0 }
      bucket.sum += m.bpm
      bucket.count += 1
      weekPoints.set(label, bucket)
    })

    const chartWeekData = weekLabels.map((label) => {
      const bucket = weekPoints.get(label)
      return {
        day: label,
        hartslag: bucket ? Math.round(bucket.sum / bucket.count) : 0,
        stappen: bucket ? bucket.count : 0,
      }
    })

    const latest = normalized.at(-1) ?? null
    const avgBpm =
      normalized.length > 0
        ? Math.round(
            normalized.reduce((sum, m, _, arr) => sum + m.bpm / arr.length, 0),
          )
        : null

    const totalSamples = normalized.length
    const days = Array.from(dataByDay.keys()).sort((a, b) => b.localeCompare(a))

    return {
      dailyHeartRateData: todayData,
      chartWeekData,
      latestBpm: latest ? latest.bpm : null,
      latestDate: latest ? latest.date : null,
      avgBpm,
      totalSamples,
      dataByDay: hourlyByDay,
      days,
    }
  }, [measurements])

  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  useEffect(() => {
    if (parsed.days.length > 0) {
      setSelectedDay((prev) => prev ?? parsed.days[0])
    }
  }, [parsed.days])

  const dayLabel = selectedDay
    ? new Date(selectedDay).toLocaleDateString()
    : 'Geen datum'
  const selectedHourlyData =
    (selectedDay && parsed.dataByDay[selectedDay]) || []
  const selectedAvgBpm = useMemo(() => {
    if (!selectedHourlyData.length) return null
    const total = selectedHourlyData.reduce((sum, m) => sum + m.bpm, 0)
    return Math.round(total / selectedHourlyData.length)
  }, [selectedHourlyData])
  const selectedSteps = useMemo(() => {
    return selectedHourlyData.length
  }, [selectedHourlyData])
  const selectedActiveMinutes = useMemo(() => {
    return Math.round(selectedHourlyData.length / 2)
  }, [selectedHourlyData])

  const chartWeekData = parsed.chartWeekData
  const dailyHeartRateData = parsed.dailyHeartRateData
  const stats = {
    weekAverageHeartRate: parsed.avgBpm ?? 0,
    weekAverageSteps: Math.round((parsed.totalSamples ?? 0) / 7),
    weekTotalActiveMinutes: Math.round((parsed.totalSamples ?? 0) / 2),
  }
  const heartRateChange = 0
  const stepsChange = 0

  // --- RENDER ---
  return (
    <main className="min-h-screen flex flex-col" style={{ background: bg }}>
      <div className="fixed top-6 right-6 z-40">
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-300/60 hover:bg-red-300/80 text-white font-medium transition-colors"
        >
          <LogOut size={18} />
          Uitloggen
        </button>
      </div>
      <header className="p-6">
        <div className="text-white text-sm opacity-80">Welkom terug,</div>
        <h1 className="brand-title text-white text-2xl font-bold">{displayName}</h1>
      </header>

      <div className="flex-1 px-4 sm:px-8 pb-16">
        <div className="max-w-6xl mx-auto pt-8">
          <div className="flex justify-center">
            <h2 className="brand-title text-white text-3xl sm:text-4xl font-semibold">
              Heartbeat Sense
            </h2>
          </div>

          {/* Navigation Buttons (Behouden van vorige versie) */}
          <div className="flex justify-center mt-8 mb-12">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-2xl">
              <Link to="/home" className="block">
                <div className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl transition-all bg-white/20 text-white shadow-lg">
                  <div className="bg-red-300/60 p-3 rounded-xl flex items-center justify-center">
                    <Heart size={32} />
                  </div>
                  <span className="text-sm font-medium text-center">Start meten</span>
                </div>
              </Link>

              <Link to="/activiteit" className="block">
                <div className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl transition-all bg-white/20 text-white hover:bg-white/30">
                  <div className="bg-red-300/60 p-3 rounded-xl flex items-center justify-center">
                    <Activity size={32} />
                  </div>
                  <span className="text-sm font-medium text-center">Activiteit</span>
                </div>
              </Link>

              <Link to="/dossier" className="block">
                <div className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl transition-all bg-white/20 text-white hover:bg-white/30">
                  <div className="bg-red-300/60 p-3 rounded-xl flex items-center justify-center">
                    <FileText size={32} />
                  </div>
                  <span className="text-sm font-medium text-center">Mijn Dossier</span>
                </div>
              </Link>

              <Link to="/overzicht" className="block">
                <div className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl transition-all bg-white text-purple-600 hover:bg-white/30">
                  <div className="bg-red-300/60 p-3 rounded-xl flex items-center justify-center">
                    <TrendingUp size={32} />
                  </div>
                  <span className="text-sm font-medium text-center">Overzicht</span>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* --- JOUW OVERZICHT SECTIE --- */}
        <div className="w-full max-w-6xl mx-auto">
          <h2 className="text-3xl text-white mb-8 text-center font-['Consolas']">Mijn Overzicht</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 text-center">
              <div className="text-5xl text-white mb-2">
                {isLoading ? '...' : selectedAvgBpm ?? '—'}
              </div>
              <div className="text-white/80">Gem. Hartslag (geselecteerde dag)</div>
              <div className="text-sm text-white/60 mt-2">{dayLabel}</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 text-center">
              <div className="text-5xl text-white mb-2">
                {isLoading ? '...' : selectedSteps.toLocaleString()}
              </div>
              <div className="text-white/80">Stappen (geselecteerde dag)</div>
              <div className="text-sm text-white/60 mt-2">{dayLabel}</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 text-center">
              <div className="text-5xl text-white mb-2">
                {isLoading ? '...' : selectedActiveMinutes}
              </div>
              <div className="text-white/80">Actieve minuten (geselecteerde dag)</div>
              <div className="text-sm text-white/60 mt-2">{dayLabel}</div>
            </div>
          </div>

          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h3 className="text-2xl text-white">Hartslag per dag</h3>
              <div className="flex items-center gap-2">
                <label className="text-white/80 text-sm" htmlFor="day-select">
                  Kies dag:
                </label>
                <select
                  id="day-select"
                  className="bg-white/10 text-white rounded-lg px-3 py-2 border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
                  value={selectedDay ?? ''}
                  onChange={(e) => setSelectedDay(e.target.value)}
                >
                  {parsed.days.map((day) => (
                    <option key={day} value={day} className="text-black">
                      {new Date(day).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={selectedHourlyData}>
                <defs>
                  <linearGradient id="colorBpm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#AD3535" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#AD3535" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="time" stroke="rgba(255,255,255,0.6)" />
                <YAxis stroke="rgba(255,255,255,0.6)" domain={[0, 200]} tickCount={9} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(107, 91, 159, 0.9)', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: 'white'
                  }} 
                />
                <Area type="monotone" dataKey="bpm" stroke="#AD3535" strokeWidth={3} fillOpacity={1} fill="url(#colorBpm)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6">
            <h3 className="text-2xl text-white mb-4">Weekoverzicht</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartWeekData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="day" stroke="rgba(255,255,255,0.6)" />
                <YAxis yAxisId="left" stroke="rgba(255,255,255,0.6)" />
                <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.6)" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(107, 91, 159, 0.9)', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: 'white'
                  }} 
                />
                <Line yAxisId="left" type="monotone" dataKey="hartslag" stroke="#AD3535" strokeWidth={3} name="Hartslag" dot={{ r: 4, fill: '#AD3535' }} />
                <Line yAxisId="right" type="monotone" dataKey="stappen" stroke="#FFA1A1" strokeWidth={3} name="Stappen" dot={{ r: 4, fill: '#FFA1A1' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </main>
  )
}
