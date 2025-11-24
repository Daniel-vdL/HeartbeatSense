import { createFileRoute, Link } from '@tanstack/react-router'
import { User, Heart, Calendar, Activity, FileText, TrendingUp } from 'lucide-react'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const Route = createFileRoute('/activiteit/')({
  component: RouteComponent,
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
  const bg = 'linear-gradient(135deg, #6b5b9f 0%, #8b7db8 50%, #9b8dc8 100%)'

  return (
    <main className="min-h-screen flex flex-col" style={{ background: bg }}>
      <header className="p-6">
        <div className="text-white text-sm opacity-80">Welkom terug,</div>
        <h1 className="brand-title text-white text-2xl font-bold">User</h1>
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
                <div className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl transition-all bg-white/20 text-white hover:bg-white/30`}>
                  <div className="bg-red-300/60 p-3 rounded-xl flex items-center justify-center">
                    <Heart size={32} />
                  </div>
                  <span className="text-sm font-medium text-center">Start meten</span>
                </div>
              </Link>

            <Link to="/activiteit" className="block"> {/* AANGEPAST: Was to="/" */}
              <div className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl transition-all bg-white text-purple-600 hover:bg-white/30`}>
                <div className="bg-red-300/60 p-3 rounded-xl flex items-center justify-center">
                  <Activity size={32} />
                </div>
                <span className="text-sm font-medium text-center">Activiteit</span>
              </div>
            </Link>

              <Link to="/dossier" className="block">
                <div className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl transition-all bg-white/20 text-white hover:bg-white/30`}>
                  <div className="bg-red-300/60 p-3 rounded-xl flex items-center justify-center">
                    <FileText size={32} />
                  </div>
                  <span className="text-sm font-medium text-center">Mijn Dossier</span>
                </div>
              </Link>

              <Link to="/overzicht" className="block">
                <div className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl transition-all bg-white/20 text-white hover:bg-white/30`}>
                  <div className="bg-red-300/60 p-3 rounded-xl flex items-center justify-center">
                    <TrendingUp size={32} />
                  </div>
                  <span className="text-sm font-medium text-center">Overzicht</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-8 border-b border-white/20 text-white text-center font-['Consolas'] text-3xl font-bold"> Mijn Activiteit</div>

        <div className="max-w-6xl mx-auto pt-6">
          <div className="bg-white/5 rounded-lg p-6 mt-6">
            <Table className="text-white">
              <TableCaption className="text-white/80">A list of your recent invoices.</TableCaption>
              <TableHeader>
                <TableRow className="border-white/20">
                  <TableHead className="w-[100px] text-white">Tijd</TableHead>
                  <TableHead className="text-white">Bpm</TableHead>
                  <TableHead className="text-white">Tag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="border-white/20 hover:bg-white/10">
                  <TableCell className="font-medium text-white">09:30</TableCell>
                  <TableCell className="text-white">80 Bpm</TableCell>
                  <TableCell className="text-white">Rust</TableCell>
                </TableRow>
                <TableRow className="border-white/20 hover:bg-white/10">
                  <TableCell className="font-medium text-white">10:00</TableCell>
                  <TableCell className="text-white">85 Bpm</TableCell>
                  <TableCell className="text-white">Rust</TableCell>
                </TableRow>
                <TableRow className="border-white/20 hover:bg-white/10">
                  <TableCell className="font-medium text-white">10:30</TableCell>
                  <TableCell className="text-white">100 Bpm</TableCell>
                  <TableCell className="text-white">Actief</TableCell>
                </TableRow>
                <TableRow className="border-white/20 hover:bg-white/10">
                  <TableCell className="font-medium text-white">11:00</TableCell>
                  <TableCell className="text-white">90 Bpm</TableCell>
                  <TableCell className="text-white">Actief</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </main>
  )
}
