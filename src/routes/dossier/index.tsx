import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router'
import { User, Heart, Calendar, Activity, FileText, TrendingUp, LogOut, ChevronRight } from 'lucide-react'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { auth, type StoredUser } from '@/lib/auth'
import { loadDossierData, type DossierData } from '@/lib/dossierData'

type ApiMeasurement = {
  value?: string
  deviceId?: string
  createdAt?: string
}

type MeasurementDisplay = {
  date: string
  time: string
  label: string
  value: string
}

export const Route = createFileRoute('/dossier/')({
  component: RouteComponent,
  beforeLoad: async () => {
    const isValid = await auth.validateSession()
    if (!isValid) {
      throw redirect({ to: "/login" })
    }
  },
})

function StatRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/10 last:border-0">
      <div className="text-sm text-white/80">{label}</div>
      <div className="text-sm text-white font-medium">{value}</div>
    </div>
  )
}

const placeholder = 'Nog niet ingevuld'

const formatNumberWithUnit = (value: number | string | null | undefined, unit: string) => {
  if (value === null || value === undefined || value === "") return null
  const numeric = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(numeric)) return null
  return `${numeric}${unit}`
}

const apiMeasurementToDisplay = (item: ApiMeasurement): MeasurementDisplay => {
  const created = item.createdAt ? new Date(item.createdAt) : null
  const date = created
    ? created.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })
    : ''
  const time = created ? created.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) : ''
  return {
    date,
    time,
    label: item.deviceId ? `Device ${item.deviceId}` : 'Laatste meting',
    value: item.value ? `${item.value} BPM` : '',
  }
}

function RouteComponent() {
  const router = useRouter()
  const bg = 'linear-gradient(135deg, #6b5b9f 0%, #8b7db8 50%, #9b8dc8 100%)'
  const displayName = auth.getDisplayName()
  const [dossierData, setDossierData] = useState<DossierData>(() => loadDossierData())
  const [user, setUser] = useState<StoredUser | null>(() => auth.getUser())
  const [measurementItems, setMeasurementItems] = useState<MeasurementDisplay[]>([])

  useEffect(() => {
    setDossierData(loadDossierData())
  }, [])

  useEffect(() => {
    auth.refreshUserFromApi().then((fresh) => {
      if (!fresh && !auth.isAuthenticated()) {
        router.navigate({ to: "/login" })
        return
      }
      if (fresh) {
        setUser(fresh)
      }
    })
  }, [router])

  useEffect(() => {
    const fetchMeasurements = async () => {
      const token = auth.getToken()
      if (!token) return
      try {
        const response = await fetch("/api/measurements/latest?limit=5", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        })
        if (response.status === 401 || response.status === 403) {
          auth.clear()
          await router.navigate({ to: "/login" })
          return
        }
        if (!response.ok) return
        const data = (await response.json()) as { items?: ApiMeasurement[] }
        const fromApi = (data.items ?? [])
          .filter((item) => item.value)
          .map(apiMeasurementToDisplay)
        if (fromApi.length) {
          setMeasurementItems(fromApi.slice(0, 5))
          return
        }
        // fallback: latestMeasurement from profile if available
        const latest = auth.getUser()?.latestMeasurement
        if (latest?.value) {
          setMeasurementItems([apiMeasurementToDisplay(latest)])
        }
      } catch {
        // ignore fetch errors, keep existing state
      }
    }
    fetchMeasurements()
  }, [router])

  const personalInfo = useMemo(() => {
    const height = formatNumberWithUnit(user?.height, ' cm') ?? dossierData.personal.height
    const weight = formatNumberWithUnit(user?.weight, ' kg') ?? dossierData.personal.weight
    const bloodType = user?.bloodType ?? dossierData.personal.bloodType
    const age = auth.getAge()
    const birthDate =
      user?.dateOfBirth && !Number.isNaN(new Date(user.dateOfBirth).getTime())
        ? new Date(user.dateOfBirth).toLocaleDateString('nl-NL', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
          })
        : ''
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim()
    const phone = user?.number ?? ''
    return {
      fullName: fullName || placeholder,
      phone: phone || placeholder,
      age: age ? `${age} jaar` : placeholder,
      birthDate: birthDate || placeholder,
      height: height || placeholder,
      weight: weight || placeholder,
      bloodType: bloodType || placeholder,
    }
  }, [
    dossierData.personal,
    user?.bloodType,
    user?.dateOfBirth,
    user?.firstName,
    user?.height,
    user?.lastName,
    user?.number,
    user?.weight,
  ])

  const heartInfo = useMemo(() => {
    return {
      restingRate: dossierData.heart.restingRate || placeholder,
      maxRate: dossierData.heart.maxRate || placeholder,
      bloodPressure: dossierData.heart.bloodPressure || placeholder,
      lastCheck: dossierData.heart.lastCheck || placeholder,
    }
  }, [dossierData.heart])

  const recentMeasurements: MeasurementDisplay[] = measurementItems.length
    ? measurementItems
    : dossierData.measurements

  const handleLogout = async () => {
    auth.clear()
    await router.navigate({ to: "/login" })
  }

  return (
    <main className="min-h-screen flex flex-col font-sans" style={{ background: bg }}>
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
        <h1 className="brand-title text-white text-2xl font-bold">{displayName}</h1>
      </header>

      <div className="flex-1 px-4 sm:px-8 pb-16">
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
                <div className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl transition-all bg-white/20 text-white hover:bg-white/30 shadow-lg">
                  <div className="bg-red-300/60 p-3 rounded-xl flex items-center justify-center">
                    <Heart size={32} />
                  </div>
                  <span className="text-sm font-medium text-center">Start meten</span>
                </div>
              </Link>

              <Link to="/activiteit" className="block">
                <div className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl transition-all bg-white/20 text-white hover:bg-white/30 shadow-lg">
                  <div className="bg-red-300/60 p-3 rounded-xl flex items-center justify-center">
                    <Activity size={32} />
                  </div>
                  <span className="text-sm font-medium text-center">Activiteit</span>
                </div>
              </Link>

              <Link to="/dossier" className="block">
                <div className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl transition-all bg-white text-purple-600 hover:bg-white/30 shadow-lg">
                  <div className="bg-red-300/60 p-3 rounded-xl flex items-center justify-center">
                    <FileText size={32} />
                  </div>
                  <span className="text-sm font-medium text-center">Mijn Dossier</span>
                </div>
              </Link>

              <Link to="/overzicht" className="block">
                <div className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl transition-all bg-white/20 text-white hover:bg-white/30 shadow-lg">
                  <div className="bg-red-300/60 p-3 rounded-xl flex items-center justify-center">
                    <TrendingUp size={32} />
                  </div>
                  <span className="text-sm font-medium text-center">Overzicht</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
          <div className="mt-8 border-b border-white/20 text-white text-center font-['Consolas'] text-3xl font-bold max-w-6xl mx-auto">Mijn Dossier</div>
          <div className="mt-4 flex justify-end max-w-6xl mx-auto">
            <Link
              to="/dossier/edit"
              className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg bg-red-300/60 hover:bg-red-300/80 text-white font-medium transition-colors"
            >
              <FileText size={16} />
              Gegevens bewerken
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
           
              <Card className="bg-white/10 border-white/20 hover:bg-white/20 hover:scale-[1.01] transition-all backdrop-blur-md h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="bg-[#AD3535] rounded-lg p-2 shadow-md">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-white">Persoonlijke Info</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mt-2 space-y-1">
                    <StatRow label="Naam:" value={<span>{personalInfo.fullName}</span>} />
                    <StatRow label="Telefoon:" value={<span>{personalInfo.phone}</span>} />
                    <StatRow label="Leeftijd:" value={<span>{personalInfo.age}</span>} />
                    <StatRow label="Geboortedatum:" value={<span>{personalInfo.birthDate}</span>} />
                    <StatRow label="Lengte:" value={<span>{personalInfo.height}</span>} />
                    <StatRow label="Gewicht:" value={<span>{personalInfo.weight}</span>} />
                    <StatRow label="Bloedgroep:" value={<span>{personalInfo.bloodType}</span>} />
                  </div>
                </CardContent>
              </Card>
            

           
              <Card className="bg-white/10 border-white/20 hover:bg-white/20 hover:scale-[1.01] transition-all backdrop-blur-md h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="bg-[#AD3535] rounded-lg p-2 shadow-md">
                      <Heart className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-white">Hartgezondheid</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mt-2 space-y-1">
                    <StatRow label="Rusthartslag:" value={<span>{heartInfo.restingRate}</span>} />
                    <StatRow label="Max hartslag:" value={<span>{heartInfo.maxRate}</span>} />
                    <StatRow label="Bloeddruk:" value={<span>{heartInfo.bloodPressure}</span>} />
                    <StatRow label="Laatste controle:" value={<span>{heartInfo.lastCheck}</span>} />
                  </div>
                </CardContent>
              </Card>
            
          </div>

          <div className="mt-8">
            <Card className="bg-white/10 border-white/20 backdrop-blur-md">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-pink-200 rounded-lg p-2 shadow-md">
                    <Calendar className="w-6 h-6 text-[#AD3535]" />
                  </div>
                  <CardTitle className="text-white">Recente Metingen</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mt-4 flex flex-col gap-3">
                  {recentMeasurements.map((measurement, index) => (
                    <Link
                      to="/overzicht"
                      key={`${measurement.date}-${measurement.time}-${measurement.label}-${index}`}
                      className="block"
                    >
                      <div className="flex items-center justify-between bg-black/20 rounded-xl p-4 hover:bg-black/30 transition-colors border border-white/5">
                        <div>
                          <div className="text-sm text-white font-medium">{measurement.date || placeholder}</div>
                          <div className="text-xs text-white/60">{measurement.time || placeholder}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-sm text-white/80">{measurement.label || placeholder}</div>
                          <div className="flex items-center gap-2 text-xl text-pink-200 font-bold font-mono">
                            <span>{measurement.value || placeholder}</span>
                            <ChevronRight className="w-4 h-4 text-white/60" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                  {!recentMeasurements.length ? (
                    <div className="text-sm text-white/70">Nog geen metingen beschikbaar.</div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
    </main>
  )
}
