import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { User, Heart, Calendar, Activity, FileText, TrendingUp } from 'lucide-react'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { auth } from "@/lib/auth"

export const Route = createFileRoute('/dossier/')({
  component: RouteComponent,
  beforeLoad: async () => {
    const isValid = await auth.validateSession()
    if (!isValid) {
      throw redirect({ to: "/login" })
    }
  },
})

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/10 last:border-0">
      <div className="text-sm text-white/80">{label}</div>
      <div className="text-sm text-white font-medium">{value}</div>
    </div>
  )
}

function RouteComponent() {
  const bg = 'linear-gradient(135deg, #6b5b9f 0%, #8b7db8 50%, #9b8dc8 100%)'
  const displayName = auth.getDisplayName()

  return (
    <main className="min-h-screen flex flex-col font-sans" style={{ background: bg }}>
      <header className="p-6">
        <div className="text-white text-sm opacity-80">Welkom terug,</div>
        <h1 className="brand-title text-white text-2xl font-bold">{displayName}</h1>
      </header>

      <div className="flex-1 px-4 sm:px-8 pb-16">
        <div className="max-w-6xl mx-auto pt-8">
          <div className="flex justify-center">
            <h2 className="brand-title text-white text-3xl sm:text-4xl font-semibold text-center">
              Heartbeat Sense
            </h2>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-center mt-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-2xl">
              <Link to="/home" className="block">
                <div className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl transition-all bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm shadow-lg`}>
                  <div className="bg-red-300/60 p-3 rounded-xl flex items-center justify-center">
                    <Heart size={28} />
                  </div>
                  <span className="text-sm font-medium text-center">Start meten</span>
                </div>
              </Link>

              <Link to="/activiteit" className="block">
                <div className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl transition-all bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm shadow-lg`}>
                  <div className="bg-red-300/60 p-3 rounded-xl flex items-center justify-center">
                    <Activity size={28} />
                  </div>
                  <span className="text-sm font-medium text-center">Activiteit</span>
                </div>
              </Link>

              <Link to="/dossier" className="block">
                <div className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl transition-all bg-white text-purple-600 shadow-xl scale-105 hover:bg-white/30`}>
                  <div className="bg-purple-100 p-3 rounded-xl flex items-center justify-center">
                    <FileText size={28} />
                  </div>
                  <span className="text-sm font-bold text-center">Mijn Dossier</span>
                </div>
              </Link>

              <Link to="/overzicht" className="block">
                <div className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl transition-all bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm shadow-lg`}>
                  <div className="bg-red-300/60 p-3 rounded-xl flex items-center justify-center">
                    <TrendingUp size={28} />
                  </div>
                  <span className="text-sm font-semibold text-center">Overzicht</span>
                </div>
              </Link> 
            </div>
          </div>
          <div className="mt-8 border-b border-white/20 text-white text-center font-['Consolas'] text-3xl font-bold"> Mijn Dossier</div>

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
                    <StatRow label="Leeftijd:" value={<span>32 jaar</span>} />
                    <StatRow label="Lengte:" value={<span>175 cm</span>} />
                    <StatRow label="Gewicht:" value={<span>70 kg</span>} />
                    <StatRow label="Bloedgroep:" value={<span>A+</span>} />
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
                    <StatRow label="Rusthartslag:" value={<span>68 BPM</span>} />
                    <StatRow label="Max hartslag:" value={<span>165 BPM</span>} />
                    <StatRow label="Bloeddruk:" value={<span>120/80</span>} />
                    <StatRow label="Laatste controle:" value={<span>2 weken geleden</span>} />
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
                  <Link to="/overzicht" className="block">
                    <div className="flex items-center justify-between bg-black/20 rounded-xl p-4 hover:bg-black/30 transition-colors border border-white/5">
                      <div>
                        <div className="text-sm text-white font-medium">10 nov 2025</div>
                        <div className="text-xs text-white/60">14:30</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-white/80">Rust</div>
                        <div className="text-xl text-pink-200 font-bold font-mono">72 BPM</div>
                      </div>
                    </div>
                  </Link>
                  
                   <Link to="/overzicht" className="block">
                    <div className="flex items-center justify-between bg-black/20 rounded-xl p-4 hover:bg-black/30 transition-colors border border-white/5">
                      <div>
                        <div className="text-sm text-white font-medium">09 nov 2025</div>
                        <div className="text-xs text-white/60">09:15</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-white/80">Ochtend</div>
                        <div className="text-xl text-pink-200 font-bold font-mono">65 BPM</div>
                      </div>
                    </div>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}
