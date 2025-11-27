import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { auth } from '@/lib/auth';

interface BPMMonitorProps {
  onMeasurementComplete?: (bpm: number, duration: number) => void;
  size?: 'small' | 'medium' | 'large';
  autoStart?: boolean;
}

export function BPMMonitor({ 
  onMeasurementComplete, 
  size = 'large',
  autoStart = false 
}: BPMMonitorProps) {
  const [isMonitoring, setIsMonitoring] = useState(autoStart);
  const [heartRate, setHeartRate] = useState(0);
  const [timer, setTimer] = useState(0);
  const [measurements, setMeasurements] = useState<number[]>([]);
  const [since, setSince] = useState<string | null>(null);

  const sizes = {
    small: { container: 'w-32 h-32', text: 'text-3xl', bpmText: 'text-sm', icon: 'w-4 h-4', iconContainer: 'w-8 h-8' },
    medium: { container: 'w-48 h-48', text: 'text-5xl', bpmText: 'text-lg', icon: 'w-6 h-6', iconContainer: 'w-12 h-12' },
    large: { container: 'w-64 h-64', text: 'text-7xl', bpmText: 'text-xl', icon: 'w-8 h-8', iconContainer: 'w-16 h-16' },
  };

  const currentSize = sizes[size];

  useQuery({
    queryKey: ['measurements', 'latest', since],
    queryFn: async () => {
      const token = auth.getToken();
      if (!token) {
        throw new Error('No auth token');
      }

      const params = new URLSearchParams({ limit: '100' });
      if (since) {
        params.set('since', since);
      }

      const response = await fetch(`/api/measurements/latest?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch measurements');
      }

      return (await response.json()) as {
        items: Array<{
          value: string | number;
          deviceId?: string;
          createdAt: string;
        }>;
      };
    },
    refetchInterval: 15_000,
    staleTime: 10_000,
    onSuccess: (data) => {
      const latestDate = data.items
        .map((m) => m.createdAt)
        .filter(Boolean)
        .sort()
        .pop();
      if (latestDate) {
        setSince(latestDate);
      }
    },
  });

  useEffect(() => {
    if (isMonitoring) {
      const interval = setInterval(() => {
        // Simuleer realistische hartslagwaarden tussen 60-100 bpm
        const baseRate = 75;
        const variation = Math.sin(Date.now() / 1000) * 10;
        const randomNoise = (Math.random() - 0.5) * 5;
        const newRate = Math.round(baseRate + variation + randomNoise);
        setHeartRate(newRate);
        setMeasurements(prev => [...prev, newRate]);
        setTimer(prev => prev + 1);
      }, 1000);

      return () => clearInterval(interval);
    } else {
      if (timer > 0 && measurements.length > 0) {
        const avgBpm = Math.round(measurements.reduce((a, b) => a + b, 0) / measurements.length);
        onMeasurementComplete?.(avgBpm, timer);
      }
      setTimer(0);
      setMeasurements([]);
    }
  }, [isMonitoring]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
    if (!isMonitoring) {
      setHeartRate(0);
    }
  };

  const getStatus = () => {
    if (heartRate < 60) return { text: 'Laag', color: 'text-blue-300' };
    if (heartRate < 100) return { text: 'Normaal', color: 'text-green-300' };
    if (heartRate < 140) return { text: 'Verhoogd', color: 'text-yellow-300' };
    return { text: 'Hoog', color: 'text-red-300' };
  };

  const status = getStatus();

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="relative">
        <div 
          className={`${currentSize.container} rounded-full border-8 border-white/30 flex items-center justify-center ${isMonitoring ? 'animate-pulse' : ''}`}
          style={{
            boxShadow: isMonitoring ? '0 0 40px rgba(173, 53, 53, 0.5)' : 'none',
            transition: 'box-shadow 0.3s ease'
          }}
        >
          <div className="text-center">
            <div className={`${currentSize.text} text-white mb-2`}>
              {heartRate}
            </div>
            <div className={`${currentSize.bpmText} text-white/80`}>BPM</div>
            {isMonitoring && heartRate > 0 && (
              <div className={`text-sm ${status.color} mt-1`}>{status.text}</div>
            )}
          </div>
        </div>
        <div 
          className={`absolute -top-2 -right-2 ${currentSize.iconContainer} bg-[#AD3535] rounded-full flex items-center justify-center ${isMonitoring ? 'animate-bounce' : ''}`}
        >
          <Heart className={`${currentSize.icon} text-white fill-white`} />
        </div>
      </div>

      {isMonitoring && (
        <div className="flex flex-col items-center gap-2">
          <div className="text-2xl text-white">
            {formatTime(timer)}
          </div>
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`w-2 h-8 rounded-full transition-all duration-300 ${
                  i < (heartRate / 30) ? 'bg-[#AD3535]' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      <button
        onClick={toggleMonitoring}
        className={`px-12 py-4 rounded-full text-xl transition-all ${
          isMonitoring
            ? 'bg-[#AD3535] text-white hover:bg-[#8b2a2a]'
            : 'bg-white text-[#6b5b9f] hover:bg-gray-100'
        }`}
      >
        {isMonitoring ? 'Stop Meting' : 'Start Meting'}
      </button>

      {!isMonitoring && heartRate > 0 && (
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 text-white">
          <p className="text-center">
            Laatste meting: <span className="text-2xl text-[#AD3535]">{heartRate} BPM</span>
          </p>
          {measurements.length > 5 && (
            <p className="text-sm text-center mt-2 opacity-80">
              Gemiddelde: {Math.round(measurements.reduce((a, b) => a + b, 0) / measurements.length)} BPM
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default BPMMonitor;
