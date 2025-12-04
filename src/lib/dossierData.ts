export type PersonalInfo = {
  height: string
  weight: string
  bloodType: string
}

export type HeartHealth = {
  restingRate: string
  maxRate: string
  bloodPressure: string
  lastCheck: string
}

export type Measurement = {
  date: string
  time: string
  label: string
  value: string
}

export type DossierData = {
  personal: PersonalInfo
  heart: HeartHealth
  measurements: Array<Measurement>
}

const STORAGE_KEY = 'heartbeat:dossier'
const isBrowser = typeof window !== 'undefined'

export const defaultDossierData: DossierData = {
  personal: {
    height: '',
    weight: '',
    bloodType: '',
  },
  heart: {
    restingRate: '',
    maxRate: '',
    bloodPressure: '',
    lastCheck: '',
  },
  measurements: [
    { date: '', time: '', label: '', value: '' },
    { date: '', time: '', label: '', value: '' },
  ],
}

export function loadDossierData(): DossierData {
  if (!isBrowser) return defaultDossierData
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return defaultDossierData
    const parsed = JSON.parse(stored) as Partial<DossierData>
    return {
      personal: { ...defaultDossierData.personal, ...(parsed.personal ?? {}) },
      heart: { ...defaultDossierData.heart, ...(parsed.heart ?? {}) },
      measurements:
        parsed.measurements?.length && Array.isArray(parsed.measurements)
          ? parsed.measurements.map((m) => ({
              date: m.date || '',
              time: m.time || '',
              label: m.label || '',
              value: m.value || '',
            }))
          : defaultDossierData.measurements,
    }
  } catch (error) {
    // fallback to defaults if storage is corrupted
    console.error(
      'Kon dossier data niet laden, standaardwaarden gebruikt.',
      error,
    )
    return defaultDossierData
  }
}

export function saveDossierData(data: DossierData) {
  if (!isBrowser) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
