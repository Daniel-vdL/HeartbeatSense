import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router'
import { User, Heart, Calendar, Activity, FileText, TrendingUp, LogOut } from 'lucide-react'
import { BPMMonitor } from "@/components/BPMMonitor"
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { auth } from "@/lib/auth"

export const Route = createFileRoute('/home/')({
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
        <h1 className="brand-title text-white text-2xl font-bold">{displayName}</h1>
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
                <div className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl transition-all bg-white text-purple-600 shadow-lg hover:bg-white/30 shadow-lg`}>
                  <div className="bg-red-300/60 p-3 rounded-xl flex items-center justify-center">
                    <Heart size={32} />
                  </div>
                  <span className="text-sm font-medium text-center">Start meten</span>
                </div>
              </Link>

              <Link to="/activiteit" className="block"> 
                <div className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl transition-all bg-white/20 text-white hover:bg-white/30 shadow-lg`}>
                  <div className="bg-red-300/60 p-3 rounded-xl flex items-center justify-center">
                    <Activity size={32} />
                  </div>
                  <span className="text-sm font-medium text-center">Activiteit</span>
                </div>
              </Link>

              <Link to="/dossier" className="block">
                <div className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl transition-all bg-white/20 text-white hover:bg-white/30 shadow-lg`}>
                  <div className="bg-red-300/60 p-3 rounded-xl flex items-center justify-center">
                    <FileText size={32} />
                  </div>
                  <span className="text-sm font-medium text-center">Mijn Dossier</span>
                </div>
              </Link>

              <Link to="/overzicht" className="block">
                <div className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl transition-all bg-white/20 text-white hover:bg-white/30 shadow-lg`}>
                  <div className="bg-red-300/60 p-3 rounded-xl flex items-center justify-center">
                    <TrendingUp size={32} />
                  </div>
                  <span className="text-sm font-medium text-center">Overzicht</span>
                </div>
              </Link>
            </div>
          </div>
          <div className="mt-25">
            <BPMMonitor />
          </div> 
        </div>
      </div>
    </main>
  )
}
