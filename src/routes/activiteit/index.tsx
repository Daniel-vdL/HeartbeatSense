import { useEffect, useMemo, useState } from 'react'
import {
  Link,
  createFileRoute,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import {
  Activity,
  Calendar,
  FileText,
  Heart,
  Info,
  LogOut,
  Plus,
  TrendingUp,
  User,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { auth } from '@/lib/auth'

const HALF_HOUR_MS = 30 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

type ApiMeasurement = {
  id?: string
  value?: string
  deviceId?: string
  createdAt?: string
  activityId?: number | null
}

type ActivityEntry = {
  slotKey: string
  time: string
  bpm: string
  tag: string
  createdAt: string
  dateLabel: string
  measurementId?: string
  activityId?: number | null
}

const TAG_STORAGE_KEY = 'heartbeat:activityTags'

const loadTags = (): Record<string, string> => {
  try {
    const raw = window.localStorage.getItem(TAG_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

const saveTags = (tags: Record<string, string>) => {
  try {
    window.localStorage.setItem(TAG_STORAGE_KEY, JSON.stringify(tags))
  } catch {
    // ignore storage errors
  }
}

type ActivityItem = {
  id: number
  title: string
  type?: string
  description?: string
  createdAt?: string
}

export const Route = createFileRoute('/activiteit/')({
  component: RouteComponent,
  beforeLoad: async () => {
    const isValid = await auth.validateSession()
    if (!isValid) {
      throw redirect({ to: '/login' })
    }
  },
})

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2">
      <div className="text-sm text-white/80">{label}</div>
      <div className="text-sm text-white">{value}</div>
    </div>
  )
}

function RouteComponent() {
  const router = useRouter()
  const bg = 'linear-gradient(135deg, #6b5b9f 0%, #8b7db8 50%, #9b8dc8 100%)'
  const displayName = auth.getDisplayName()
  const [measurements, setMeasurements] = useState<Array<ApiMeasurement>>([])
  const [allMeasurements, setAllMeasurements] = useState<Array<ApiMeasurement>>([])
  const [tags, setTags] = useState<Record<string, string>>(() =>
    typeof window !== 'undefined' ? loadTags() : {},
  )
  const [showHistory, setShowHistory] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    const now = new Date()
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  })
  const [historyTab, setHistoryTab] = useState<'day' | 'all'>('day')
  const [activities, setActivities] = useState<Array<ActivityItem>>([])
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [activityForm, setActivityForm] = useState({
    title: '',
    type: '',
    description: '',
  })
  const [savingActivity, setSavingActivity] = useState(false)
  const [activityError, setActivityError] = useState<string | null>(null)
  const [showActivityDetail, setShowActivityDetail] = useState(false)
  const [activityDetailForm, setActivityDetailForm] =
    useState<ActivityItem | null>(null)
  const [deletingActivity, setDeletingActivity] = useState(false)
  const handleLogout = async () => {
    auth.clear()
    await router.navigate({ to: '/login' })
  }

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null

    const fetchMeasurements = async () => {
      const token = auth.getToken()
      if (!token) return
      try {
        const since = selectedDay.toISOString()
        const response = await fetch(
          `/api/measurements/latest?limit=500&since=${encodeURIComponent(since)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          },
        )
        if (response.status === 401 || response.status === 403) {
          auth.clear()
          await router.navigate({ to: '/login' })
          return
        }
        if (!response.ok) return
        const data = (await response.json()) as { items?: Array<ApiMeasurement> }
        const normalized = (data.items ?? []).map((m) => ({
          ...m,
          id: m.id ? String(m.id) : undefined,
        }))
        setMeasurements(normalized)
      } catch {
        // ignore fetch errors
      }
    }
    fetchMeasurements()
    interval = setInterval(fetchMeasurements, 15000)
    return () => {
      clearInterval(interval)
    }
  }, [router, selectedDay])

  useEffect(() => {
    const fetchAllMeasurements = async () => {
      const token = auth.getToken()
      if (!token) return
      try {
        const response = await fetch(`/api/measurements/latest?limit=1000`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })
        if (response.status === 401 || response.status === 403) {
          auth.clear()
          await router.navigate({ to: '/login' })
          return
        }
        if (!response.ok) return
        const data = (await response.json()) as { items?: Array<ApiMeasurement> }
        const normalized = (data.items ?? []).map((m) => ({
          ...m,
          id: m.id ? String(m.id) : undefined,
        }))
        setAllMeasurements(normalized)
      } catch {
        // ignore fetch errors
      }
    }
    fetchAllMeasurements()
  }, [router])

  useEffect(() => {
    const fetchActivities = async () => {
      const token = auth.getToken()
      if (!token) return
      try {
        const response = await fetch(`/api/activities`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })
        if (response.status === 401 || response.status === 403) {
          auth.clear()
          await router.navigate({ to: '/login' })
          return
        }
        if (!response.ok) return
        const data = (await response.json()) as Array<ActivityItem>
        setActivities(data)
      } catch {
        // ignore fetch errors
      }
    }
    fetchActivities()
  }, [router])

  const computeEntries = (
    items: Array<ApiMeasurement>,
    tagMap: Record<string, string>,
    dayFilter?: Date,
  ): Array<ActivityEntry> => {
    const slotStats = new Map<
      string,
      {
        sum: number
        count: number
        lastCreated: string
        slotStartLabel: string
        slotStartIso: string
        dateLabel: string
      }
    >()

    const sorted = [...items].sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return db - da
    })

    for (const item of sorted) {
      if (!item.createdAt || !item.value) continue
      const numeric = Number(item.value)
      if (!Number.isFinite(numeric)) continue
      const date = new Date(item.createdAt)

      if (dayFilter) {
        const dayStart = dayFilter.getTime()
        const dayEnd = dayFilter.getTime() + DAY_MS
        if (date.getTime() < dayStart || date.getTime() >= dayEnd) continue
      }

      const slotTs = Math.floor(date.getTime() / HALF_HOUR_MS) * HALF_HOUR_MS
      const slotKey = new Date(slotTs).toISOString()
      const slotStart = new Date(slotTs)
      const time = slotStart.toLocaleTimeString('nl-NL', {
        hour: '2-digit',
        minute: '2-digit',
      })
      const dateLabel = slotStart.toLocaleDateString('nl-NL', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      })
      const existing = slotStats.get(slotKey)
      if (existing) {
        existing.sum += numeric
        existing.count += 1
        if (
          new Date(item.createdAt).getTime() >
          new Date(existing.lastCreated).getTime()
        ) {
          existing.lastCreated = item.createdAt
        }
      } else {
        slotStats.set(slotKey, {
          sum: numeric,
          count: 1,
          lastCreated: item.createdAt,
          slotStartLabel: time,
          slotStartIso: slotStart.toISOString(),
          dateLabel,
        })
      }
    }

    const entries = Array.from(slotStats.entries())
      .map(([slotKey, stat]) => {
        const avg = Math.round(stat.sum / stat.count)
        const representative = sorted.find((m) => {
          const d = m.createdAt ? new Date(m.createdAt).getTime() : 0
          return (
            d >= new Date(slotKey).getTime() &&
            d < new Date(slotKey).getTime() + HALF_HOUR_MS
          )
        })
        const activityLabel = representative?.activityId
          ? (activities.find((a) => a.id === representative.activityId)
              ?.title ?? 'Geen activiteit')
          : 'Geen activiteit'
        return {
          slotKey,
          time: stat.slotStartLabel,
          bpm: `${avg} Bpm`,
          tag: activityLabel,
          activityId: representative?.activityId ?? null,
          measurementId: representative?.id,
          createdAt: stat.slotStartIso,
          dateLabel: stat.dateLabel,
        }
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )

    return entries
  }

  const dayEntries = useMemo(
    () => computeEntries(measurements, tags, selectedDay),
    [measurements, tags, selectedDay, activities],
  )
  const allEntries = useMemo(
    () => computeEntries(allMeasurements, tags),
    [allMeasurements, tags, activities],
  )

  const visibleEntries = dayEntries.slice(0, 5)

  const handleLinkActivity = async (
    measurementId: string,
    activityId: number | null,
  ) => {
    const token = auth.getToken()
    if (!token) return
    try {
      const response = await fetch(
        `/api/measurements/${measurementId}/activity`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify(activityId),
        },
      )
      if (response.status === 401 || response.status === 403) {
        auth.clear()
        await router.navigate({ to: '/login' })
        return
      }
      if (!response.ok) return
      const updated = (await response.json()) as ApiMeasurement
      const updatedId = updated.id ? String(updated.id) : measurementId
      setMeasurements((prev) =>
        prev.map((m) =>
          (m.id && updatedId && String(m.id) === updatedId) ||
          (m.createdAt && m.createdAt === updated.createdAt)
            ? { ...m, activityId: updated.activityId, id: updatedId }
            : m,
        ),
      )
      setAllMeasurements((prev) =>
        prev.map((m) =>
          (m.id && updatedId && String(m.id) === updatedId) ||
          (m.createdAt && m.createdAt === updated.createdAt)
            ? { ...m, activityId: updated.activityId, id: updatedId }
            : m,
        ),
      )
    } catch {
      // ignore errors for now
    }
  }

  const handleDateChange = (value: string) => {
    if (!value) return
    const parts = value.split('-').map(Number)
    if (parts.length === 3) {
      const [y, m, d] = parts
      const utcDate = new Date(Date.UTC(y, m - 1, d))
      setSelectedDay(utcDate)
    }
  }

  const handleCreateActivity = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()
    if (!activityForm.title.trim() || !activityForm.description.trim()) {
      setActivityError('Titel en beschrijving zijn verplicht.')
      return
    }
    setSavingActivity(true)
    setActivityError(null)
    const token = auth.getToken()
    if (!token) {
      setActivityError('Sessie verlopen, log opnieuw in.')
      setSavingActivity(false)
      return
    }
    try {
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          title: activityForm.title,
          type: activityForm.type,
          description: activityForm.description,
        }),
      })
      if (response.status === 401 || response.status === 403) {
        setActivityError('Sessie verlopen, log opnieuw in.')
        setSavingActivity(false)
        return
      }
      if (!response.ok) {
        const text = await response.text().catch(() => '')
        setActivityError(text || `${response.status} ${response.statusText}`)
        return
      }
      const created = (await response.json()) as ActivityItem
      setActivities((prev) => [created, ...prev])
      setShowActivityModal(false)
      setActivityForm({ title: '', type: '', description: '' })
    } catch (error) {
      setActivityError(
        error instanceof Error ? error.message : 'Onbekende fout',
      )
    } finally {
      setSavingActivity(false)
    }
  }

  const handleOpenActivityDetail = (activityId: number | null) => {
    if (!activityId) return
    const act = activities.find((a) => a.id === activityId)
    if (!act) return
    setActivityDetailForm({ ...act })
    setShowActivityDetail(true)
    setActivityError(null)
  }

  const handleUpdateActivity = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()
    if (!activityDetailForm) return
    if (
      !activityDetailForm.title.trim() ||
      !activityDetailForm.description?.trim()
    ) {
      setActivityError('Titel en beschrijving zijn verplicht.')
      return
    }
    setSavingActivity(true)
    setActivityError(null)
    const token = auth.getToken()
    if (!token) {
      setActivityError('Sessie verlopen, log opnieuw in.')
      setSavingActivity(false)
      return
    }
    try {
      const response = await fetch(`/api/activities/${activityDetailForm.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          title: activityDetailForm.title,
          type: activityDetailForm.type,
          description: activityDetailForm.description,
        }),
      })
      if (response.status === 401 || response.status === 403) {
        setActivityError('Sessie verlopen, log opnieuw in.')
        setSavingActivity(false)
        return
      }
      if (!response.ok) {
        const text = await response.text().catch(() => '')
        setActivityError(text || `${response.status} ${response.statusText}`)
        return
      }
      const updated = (await response.json()) as ActivityItem
      setActivities((prev) =>
        prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)),
      )
      setShowActivityDetail(false)
    } catch (error) {
      setActivityError(
        error instanceof Error ? error.message : 'Onbekende fout',
      )
    } finally {
      setSavingActivity(false)
    }
  }

  const handleDeleteActivity = () => {
    if (!activityDetailForm) return
    setDeletingActivity(true)
    setActivityError(null)
    // Geen DELETE endpoint beschikbaar: ontkoppel lokaal en verwijder uit UI
    setActivities((prev) => prev.filter((a) => a.id !== activityDetailForm.id))
    setMeasurements((prev) =>
      prev.map((m) =>
        m.activityId === activityDetailForm.id ? { ...m, activityId: null } : m,
      ),
    )
    setAllMeasurements((prev) =>
      prev.map((m) =>
        m.activityId === activityDetailForm.id ? { ...m, activityId: null } : m,
      ),
    )
    setShowActivityDetail(false)
    setDeletingActivity(false)
  }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: bg }}>
      <div className="fixed top-6 right-6 z-40">
        <button
          type="button"
          onClick={handleLogout}
          className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg bg-red-300/60 hover:bg-red-300/80 text-white font-medium transition-colors"
        >
          <LogOut size={18} />
          Uitloggen
        </button>
      </div>
      <header className="p-6">
        <div className="text-white text-sm opacity-80">Welkom terug,</div>
        <h1 className="brand-title text-white text-2xl font-bold">
          {displayName}
        </h1>
      </header>

      <div className="flex-1 px-8 pb-16">
        <div className="max-w-6xl mx-auto pt-8">
          <div className="flex justify-center">
            <h2 className="brand-title text-white text-3xl sm:text-4xl font-semibold">
              Heartbeat Sense
            </h2>
          </div>

          {/* Navigation Buttons (same as Home) */}
          <div className="flex justify-center mt-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-2xl">
              <Link to="/home" className="block">
                <div
                  className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl transition-all bg-white/20 text-white hover:bg-white/30 shadow-lg`}
                >
                  <div className="bg-red-300/60 p-3 rounded-xl flex items-center justify-center">
                    <Heart size={32} />
                  </div>
                  <span className="text-sm font-medium text-center">
                    Start meten
                  </span>
                </div>
              </Link>

              <Link to="/activiteit" className="block">
                {' '}
                {/* AANGEPAST: Was to="/" */}
                <div
                  className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl transition-all bg-white text-purple-600 hover:bg-white/30 shadow-lg`}
                >
                  <div className="bg-red-300/60 p-3 rounded-xl flex items-center justify-center">
                    <Activity size={32} />
                  </div>
                  <span className="text-sm font-medium text-center">
                    Activiteit
                  </span>
                </div>
              </Link>

              <Link to="/dossier" className="block">
                <div
                  className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl transition-all bg-white/20 text-white hover:bg-white/30 shadow-lg`}
                >
                  <div className="bg-red-300/60 p-3 rounded-xl flex items-center justify-center">
                    <FileText size={32} />
                  </div>
                  <span className="text-sm font-medium text-center">
                    Mijn Dossier
                  </span>
                </div>
              </Link>

              <Link to="/overzicht" className="block">
                <div
                  className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl transition-all bg-white/20 text-white hover:bg-white/30 shadow-lg`}
                >
                  <div className="bg-red-300/60 p-3 rounded-xl flex items-center justify-center">
                    <TrendingUp size={32} />
                  </div>
                  <span className="text-sm font-medium text-center">
                    Overzicht
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-8 border-b border-white/20 text-white text-center font-['Consolas'] text-3xl font-bold">
          {' '}
          Mijn Activiteit
        </div>

        <div className="max-w-6xl mx-auto pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white text-lg font-semibold">Activiteitslog</h3>

            <div className="flex items-center gap-3 text-white/70 text-sm">
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-white">
                <span>Datum</span>
                <input
                  type="date"
                  className="bg-transparent text-white border border-white/30 rounded px-2 py-1"
                  value={selectedDay.toISOString().slice(0, 10)}
                  onChange={(e) => handleDateChange(e.target.value)}
                />
              </label>
              <Button
                variant="ghost"
                className="text-white bg-red-300/60 hover:bg-red-300/80"
                onClick={() => setShowActivityModal(true)}
              >
                <Plus className="w-4 h-4 mr-1" /> Nieuwe activiteit
              </Button>
              <Button
                variant="ghost"
                className="text-white bg-red-300/60 hover:bg-red-300/80"
                onClick={() => setShowHistory(true)}
              >
                Historie
              </Button>
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-6 mt-6">
            <Table className="text-white">
              <TableCaption className="text-white/80">
                A list of your recent readings.
              </TableCaption>
              <TableHeader>
                <TableRow className="border-white/20">
                  <TableHead className="w-[100px] text-white">Tijd</TableHead>
                  <TableHead className="text-white">Bpm</TableHead>
                  <TableHead className="text-white">Activiteit</TableHead>
                  <TableHead className="text-white text-right">Info</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleEntries.map((entry) => (
                  <TableRow
                    key={entry.slotKey}
                    className="border-white/20 hover:bg-white/10"
                  >
                    <TableCell className="font-medium text-white">
                      {entry.time}
                    </TableCell>
                    <TableCell className="text-white">{entry.bpm}</TableCell>
                    <TableCell className="text-white">
                      <select
                        value={entry.activityId ?? ''}
                        onChange={(e) => {
                          const val = e.target.value
                          const id = val ? Number(val) : null
                          if (entry.measurementId) {
                            handleLinkActivity(entry.measurementId, id)
                          }
                        }}
                        disabled={!entry.measurementId}
                        className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40 transition-colors appearance-none"
                        style={{
                          WebkitAppearance: 'none',
                          MozAppearance: 'none',
                          backgroundImage:
                            'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.08))',
                        }}
                      >
                        <option value="" className="text-black">
                          Geen activiteit
                        </option>
                        {activities.map((act) => (
                          <option
                            key={act.id}
                            value={act.id}
                            className="text-black"
                          >
                            {act.title}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        className="text-white bg-white/10 hover:bg-white/20 px-2 py-2"
                        onClick={() =>
                          handleOpenActivityDetail(entry.activityId ?? null)
                        }
                        disabled={!entry.activityId}
                      >
                        <Info className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!visibleEntries.length ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-white/70 text-center"
                    >
                      Geen metingen gevonden.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {showHistory ? (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white/10 border border-white/20 rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-white/20">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  className={`text-white px-3 py-1 rounded ${historyTab === 'day' ? 'bg-red-300/60' : 'bg-white/10 hover:bg-white/20'}`}
                  onClick={() => setHistoryTab('day')}
                >
                  Geselecteerde dag
                </Button>
                <Button
                  variant="ghost"
                  className={`text-white px-3 py-1 rounded ${historyTab === 'all' ? 'bg-red-300/60' : 'bg-white/10 hover:bg-white/20'}`}
                  onClick={() => setHistoryTab('all')}
                >
                  Alle metingen
                </Button>
              </div>
              <Button
                variant="ghost"
                className="text-white bg-red-300/60 hover:bg-red-300/80"
                onClick={() => setShowHistory(false)}
              >
                Sluiten
              </Button>
            </div>
            <div className="p-4 overflow-auto max-h-[70vh]">
              <Table className="text-white">
                <TableHeader>
                  <TableRow className="border-white/20">
                    <TableHead className="w-[100px] text-white">Tijd</TableHead>
                    <TableHead className="text-white">Datum</TableHead>
                    <TableHead className="text-white">
                      Bpm (gemiddeld)
                    </TableHead>
                    <TableHead className="text-white">Activiteit</TableHead>
                    <TableHead className="text-white text-right">
                      Info
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(historyTab === 'day' ? dayEntries : allEntries).map(
                    (entry) => (
                      <TableRow
                        key={entry.slotKey}
                        className="border-white/20 hover:bg-white/10"
                      >
                        <TableCell className="font-medium text-white">
                          {entry.time}
                        </TableCell>
                        <TableCell className="text-white">
                          {entry.dateLabel}
                        </TableCell>
                        <TableCell className="text-white">
                          {entry.bpm}
                        </TableCell>
                        <TableCell className="text-white">
                          {entry.tag}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            className="text-white bg-white/10 hover:bg-white/20 px-2 py-2"
                            onClick={() =>
                              handleOpenActivityDetail(entry.activityId ?? null)
                            }
                            disabled={!entry.activityId}
                          >
                            <Info className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ),
                  )}
                  {(historyTab === 'day' ? dayEntries : allEntries).length ===
                  0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-white/70 text-center"
                      >
                        Geen metingen gevonden.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      ) : null}

      {showActivityModal ? (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white/10 border border-white/20 rounded-2xl max-w-xl w-full shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-white/20">
              <div className="text-white font-semibold">Nieuwe activiteit</div>
              <Button
                variant="ghost"
                className="text-white bg-red-300/60 hover:bg-red-300/80"
                onClick={() => setShowActivityModal(false)}
              >
                Sluiten
              </Button>
            </div>
            <form
              onSubmit={handleCreateActivity}
              className="p-4 flex flex-col gap-3"
            >
              <label className="flex flex-col gap-1 text-white text-sm">
                <span className="text-white/80">Titel</span>
                <input
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder:text-white/60 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40 transition-colors"
                  value={activityForm.title}
                  onChange={(e) =>
                    setActivityForm((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-white text-sm">
                <span className="text-white/80">Type</span>
                <input
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder:text-white/60 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40 transition-colors"
                  value={activityForm.type}
                  onChange={(e) =>
                    setActivityForm((prev) => ({
                      ...prev,
                      type: e.target.value,
                    }))
                  }
                  placeholder="bijv. Rust, Wandeling, Workout"
                />
              </label>
              <label className="flex flex-col gap-1 text-white text-sm">
                <span className="text-white/80">Beschrijving</span>
                <textarea
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder:text-white/60 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40 transition-colors"
                  value={activityForm.description}
                  onChange={(e) =>
                    setActivityForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                  required
                />
              </label>
              {activityError ? (
                <p className="text-sm text-red-200">{activityError}</p>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-white bg-white/10 hover:bg-white/20"
                  onClick={() => setShowActivityModal(false)}
                >
                  Annuleren
                </Button>
                <Button
                  type="submit"
                  className="bg-red-300/60 hover:bg-red-300/80 text-white"
                  disabled={savingActivity}
                >
                  {savingActivity ? 'Opslaan...' : 'Opslaan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showActivityDetail && activityDetailForm ? (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white/10 border border-white/20 rounded-2xl max-w-xl w-full shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-white/20">
              <div className="text-white font-semibold">
                Activiteit bewerken
              </div>
              <Button
                variant="ghost"
                className="text-white bg-red-300/60 hover:bg-red-300/80"
                onClick={() => setShowActivityDetail(false)}
              >
                Sluiten
              </Button>
            </div>
            <form
              onSubmit={handleUpdateActivity}
              className="p-4 flex flex-col gap-3"
            >
              <label className="flex flex-col gap-1 text-white text-sm">
                <span className="text-white/80">Titel</span>
                <input
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder:text-white/60 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40 transition-colors"
                  value={activityDetailForm.title}
                  onChange={(e) =>
                    setActivityDetailForm((prev) =>
                      prev ? { ...prev, title: e.target.value } : prev,
                    )
                  }
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-white text-sm">
                <span className="text-white/80">Type</span>
                <input
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder:text-white/60 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40 transition-colors"
                  value={activityDetailForm.type ?? ''}
                  onChange={(e) =>
                    setActivityDetailForm((prev) =>
                      prev ? { ...prev, type: e.target.value } : prev,
                    )
                  }
                  placeholder="bijv. Rust, Wandeling, Workout"
                />
              </label>
              <label className="flex flex-col gap-1 text-white text-sm">
                <span className="text-white/80">Beschrijving</span>
                <textarea
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder:text-white/60 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40 transition-colors"
                  value={activityDetailForm.description ?? ''}
                  onChange={(e) =>
                    setActivityDetailForm((prev) =>
                      prev ? { ...prev, description: e.target.value } : prev,
                    )
                  }
                  rows={3}
                  required
                />
              </label>
              {activityError ? (
                <p className="text-sm text-red-200">{activityError}</p>
              ) : null}
              <div className="flex justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-white bg-red-300/60 hover:bg-red-300/80"
                  onClick={handleDeleteActivity}
                  disabled={deletingActivity}
                >
                  {deletingActivity ? 'Verwijderen...' : 'Verwijderen'}
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-white bg-white/10 hover:bg-white/20"
                    onClick={() => setShowActivityDetail(false)}
                  >
                    Annuleren
                  </Button>
                  <Button
                    type="submit"
                    className="bg-red-300/60 hover:bg-red-300/80 text-white"
                    disabled={savingActivity}
                  >
                    {savingActivity ? 'Opslaan...' : 'Opslaan'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  )
}
