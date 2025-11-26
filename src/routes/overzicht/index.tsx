import React, { useState, useEffect } from 'react'
import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router'
import { User, Heart, Calendar, Activity, FileText, TrendingUp, LogOut } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { auth } from "@/lib/auth"

// --- MOCK DATA SERVICE (Zodat het werkt zonder jouw externe bestand) ---
// Als je jouw echte service weer wilt gebruiken, verwijder dit blok en uncomment je import.
const dataService = {
  getWeekData: () => [
    { averageHeartRate: 72, steps: 4500 },
    { averageHeartRate: 75, steps: 8000 },
    { averageHeartRate: 68, steps: 3000 },
    { averageHeartRate: 74, steps: 6000 },
    { averageHeartRate: 70, steps: 7500 },
    { averageHeartRate: 76, steps: 9000 },
    { averageHeartRate: 72, steps: 5000 },
  ],
  getStatistics: () => ({
    weekAverageHeartRate: 72,
    weekAverageSteps: 6142,
    weekTotalActiveMinutes: 340,
  }),
  getTodayActivity: () => {
    // Genereer wat nep data voor vandaag
    const measurements = [];
    const now = new Date();
    for (let i = 8; i < 18; i++) { // Van 8:00 tot 18:00
       measurements.push({ timestamp: new Date().setHours(i, 0, 0, 0), bpm: 60 + Math.floor(Math.random() * 40) })
    }
    return { measurements };
  }
};

interface DailyActivity {
    averageHeartRate?: number;
    steps: number;
}

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
  const [weekData, setWeekData] = useState<DailyActivity[]>([]);
  const [stats, setStats] = useState({
    weekAverageHeartRate: 0,
    weekAverageSteps: 0,
    weekTotalActiveMinutes: 0,
  });
  const [dailyHeartRateData, setDailyHeartRateData] = useState<any[]>([]);

  useEffect(() => {
    const loadData = () => {
      const data = dataService.getWeekData();
      const statistics = dataService.getStatistics();
      
      setWeekData(data);
      setStats({
        weekAverageHeartRate: statistics.weekAverageHeartRate,
        weekAverageSteps: statistics.weekAverageSteps,
        weekTotalActiveMinutes: statistics.weekTotalActiveMinutes,
      });

      // Genereer data voor vandaag per uur
      const today = dataService.getTodayActivity();
      const hourlyData: any[] = [];
      
      if (today.measurements.length > 0) {
        // Groepeer metingen per uur
        const measurementsByHour: { [key: string]: number[] } = {};
        
        today.measurements.forEach(m => {
          const hour = new Date(m.timestamp).getHours();
          const hourKey = `${hour}:00`;
          if (!measurementsByHour[hourKey]) {
            measurementsByHour[hourKey] = [];
          }
          measurementsByHour[hourKey].push(m.bpm);
        });

        // Maak data array
        Object.keys(measurementsByHour).sort().forEach(hour => {
          const bpms = measurementsByHour[hour];
          const avgBpm = Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length);
          hourlyData.push({ time: hour, bpm: avgBpm });
        });
      } else {
        // Gebruik placeholder data
        const hours = ['00:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'];
        hours.forEach(hour => {
          hourlyData.push({ time: hour, bpm: 68 });
        });
      }

      setDailyHeartRateData(hourlyData);
    };

    loadData();

    // Refresh elke 10 seconden
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const chartWeekData = weekData.map((day, index) => {
    const dayNames = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    
    return {
      day: dayNames[date.getDay()],
      hartslag: day.averageHeartRate || 0,
      stappen: day.steps,
    };
  });

  const lastWeekAvgHeartRate = weekData.length > 1 
    ? Math.round(weekData.slice(0, -1).reduce((sum, d) => sum + (d.averageHeartRate || 0), 0) / (weekData.length - 1))
    : stats.weekAverageHeartRate;

  const heartRateChange = lastWeekAvgHeartRate > 0
    ? (((stats.weekAverageHeartRate - lastWeekAvgHeartRate) / lastWeekAvgHeartRate) * 100).toFixed(0)
    : 0;

  const lastWeekSteps = weekData.length > 1
    ? Math.round(weekData.slice(0, -1).reduce((sum, d) => sum + d.steps, 0) / (weekData.length - 1))
    : stats.weekAverageSteps;

  const stepsChange = lastWeekSteps > 0
    ? (((stats.weekAverageSteps - lastWeekSteps) / lastWeekSteps) * 100).toFixed(0)
    : 0;

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
              <div className="text-5xl text-white mb-2">{stats.weekAverageHeartRate}</div>
              <div className="text-white/80">Gem. Hartslag (BPM)</div>
              <div className={`text-sm mt-2 ${Number(heartRateChange) >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {Number(heartRateChange) >= 0 ? '↑' : '↓'} {Math.abs(Number(heartRateChange))}% deze week
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 text-center">
              <div className="text-5xl text-white mb-2">{stats.weekAverageSteps.toLocaleString()}</div>
              <div className="text-white/80">Gem. Stappen/dag</div>
              <div className={`text-sm mt-2 ${Number(stepsChange) >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {Number(stepsChange) >= 0 ? '↑' : '↓'} {Math.abs(Number(stepsChange))}% deze week
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 text-center">
              <div className="text-5xl text-white mb-2">{stats.weekTotalActiveMinutes}</div>
              <div className="text-white/80">Actieve minuten</div>
              <div className="text-sm text-green-300 mt-2">Deze week</div>
            </div>
          </div>

          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 mb-6">
            <h3 className="text-2xl text-white mb-4">Hartslag Vandaag</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyHeartRateData}>
                <defs>
                  <linearGradient id="colorBpm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#AD3535" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#AD3535" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="time" stroke="rgba(255,255,255,0.6)" />
                <YAxis stroke="rgba(255,255,255,0.6)" domain={[50, 160]} />
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