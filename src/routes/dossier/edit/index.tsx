import {  useEffect, useState } from 'react'
import {
  Link,
  createFileRoute,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import { ArrowLeft, Save, User } from 'lucide-react'
import type {FormEvent} from 'react';

import type { StoredUser } from '@/lib/auth'
import type {DossierData} from '@/lib/dossierData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { auth } from '@/lib/auth'
import {
  
  defaultDossierData,
  loadDossierData,
  saveDossierData
} from '@/lib/dossierData'

type UserResponse = {
  token?: string
  firstName?: string
  lastname?: string
  lastName?: string
  email?: string
  number?: string
  gender?: string
  dateOfBirth?: string
  height?: number | string
  weight?: number | string
  bloodType?: string
  latestMeasurement?: {
    value?: string
    deviceId?: string
    createdAt?: string
  } | null
}

export const Route = createFileRoute('/dossier/edit/')({
  component: RouteComponent,
  beforeLoad: async () => {
    const isValid = await auth.validateSession()
    if (!isValid) {
      throw redirect({ to: '/login' })
    }
  },
})

function RouteComponent() {
  const router = useRouter()
  const [profile, setProfile] = useState<StoredUser | null>(() =>
    auth.getUser(),
  )
  const [dossierData, setDossierData] = useState<DossierData>(() =>
    loadDossierData(),
  )
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [formValues, setFormValues] = useState(() => ({
    firstName: '',
    lastName: '',
    number: '',
    dateOfBirth: '',
    gender: '',
    height: '',
    weight: '',
    bloodType: '',
  }))
  const bg = 'linear-gradient(135deg, #6b5b9f 0%, #8b7db8 50%, #9b8dc8 100%)'

  const normalizeDateInput = (value?: string) => {
    if (!value) return ''
    return value.includes('T') ? value.split('T')[0] : value
  }

  useEffect(() => {
    const stored = loadDossierData()
    setDossierData(stored)
    setFormValues({
      firstName: profile?.firstName ?? '',
      lastName: profile?.lastName ?? '',
      number: profile?.number ?? '',
      dateOfBirth: normalizeDateInput(profile?.dateOfBirth),
      gender: profile?.gender ?? '',
      height: stored.personal.height,
      weight: stored.personal.weight,
      bloodType: stored.personal.bloodType,
    })
  }, [])

  useEffect(() => {
    auth.refreshUserFromApi().then((userProfile) => {
      if (userProfile) {
        setProfile(userProfile)
        setFormValues((prev) => ({
          ...prev,
          firstName: userProfile.firstName || prev.firstName,
          lastName: userProfile.lastName || prev.lastName,
          number: userProfile.number || prev.number,
          dateOfBirth:
            normalizeDateInput(userProfile.dateOfBirth) || prev.dateOfBirth,
          gender: userProfile.gender || prev.gender,
          height:
            userProfile.height !== undefined
              ? `${userProfile.height}`
              : prev.height,
          weight:
            userProfile.weight !== undefined
              ? `${userProfile.weight}`
              : prev.weight,
          bloodType: userProfile.bloodType || prev.bloodType,
        }))
      }
    })
  }, [])

  const updateField = (field: keyof typeof formValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }))
  }

  const toNumericOrString = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    const numeric = Number(trimmed.replace(',', '.'))
    if (Number.isFinite(numeric)) return numeric
    return null
  }

  const validateNumberString = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    return /^\d+$/.test(trimmed) ? trimmed : null
  }

  const validateDate = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    const parsed = new Date(trimmed)
    if (Number.isNaN(parsed.getTime())) return null
    // keep input as provided; backend expects ISO string
    return trimmed
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setApiError(null)
    const token = auth.getToken()
    if (!token) {
      auth.clear()
      await router.navigate({ to: '/login' })
      return
    }

    const body: Record<string, unknown> = {}
    const effectiveFirstName = (
      formValues.firstName ||
      profile?.firstName ||
      ''
    ).trim()
    const effectiveLastName = (
      formValues.lastName ||
      profile?.lastName ||
      ''
    ).trim()
    const effectiveGender =
      (formValues.gender || profile?.gender || '').trim() || undefined
    const effectiveDob = validateDate(
      formValues.dateOfBirth || normalizeDateInput(profile?.dateOfBirth) || '',
    )

    const heightValue = toNumericOrString(
      formValues.height ||
        (profile?.height !== undefined ? String(profile.height) : ''),
    )
    const weightValue = toNumericOrString(
      formValues.weight ||
        (profile?.weight !== undefined ? String(profile.weight) : ''),
    )

    if (heightValue === null || weightValue === null) {
      setApiError(
        'Gebruik alleen cijfers voor lengte/gewicht (eventueel met punt of komma).',
      )
      setSaving(false)
      return
    }

    const numberValue = validateNumberString(
      formValues.number || profile?.number || '',
    )
    if (!effectiveFirstName || !effectiveLastName) {
      setApiError('Voornaam en achternaam zijn verplicht.')
      setSaving(false)
      return
    }
    if (numberValue === null) {
      setApiError('Telefoonnummer mag alleen cijfers bevatten.')
      setSaving(false)
      return
    }
    if (numberValue === undefined) {
      setApiError('Telefoonnummer is verplicht.')
      setSaving(false)
      return
    }
    if (effectiveDob === null) {
      setApiError('Geboortedatum is ongeldig. Gebruik formaat YYYY-MM-DD.')
      setSaving(false)
      return
    }

    // Altijd verplichte velden meesturen
    body.firstName = effectiveFirstName
    body.lastName = effectiveLastName
    body.number = numberValue
    if (effectiveDob !== undefined) body.dateOfBirth = effectiveDob

    if (effectiveGender) body.gender = effectiveGender
    if (heightValue !== undefined) body.height = heightValue
    if (weightValue !== undefined) body.weight = weightValue
    if (formValues.bloodType || profile?.bloodType)
      body.bloodType = formValues.bloodType || profile?.bloodType

    if (Object.keys(body).length === 0) {
      setApiError('Geen velden om op te slaan. Vul iets in en probeer opnieuw.')
      setSaving(false)
      return
    }

    try {
      const response = await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(body),
      })

      if (response.status === 401 || response.status === 403) {
        auth.clear()
        await router.navigate({ to: '/login' })
        return
      }

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        setApiError(text || `${response.status} ${response.statusText}`)
        return
      }

      const data = (await response.json()) as UserResponse
      auth.setUser({
        firstName: data.firstName,
        lastName: data.lastName ?? data.lastname,
        email: data.email,
        number: data.number,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth,
        height: data.height,
        weight: data.weight,
        bloodType: data.bloodType,
        latestMeasurement: data.latestMeasurement ?? null,
      })
      if (data.token) {
        auth.setToken(data.token)
      }
      setProfile(auth.getUser())
      const updated: DossierData = {
        personal: {
          height:
            data.height !== undefined ? `${data.height}` : formValues.height,
          weight:
            data.weight !== undefined ? `${data.weight}` : formValues.weight,
          bloodType: data.bloodType ?? formValues.bloodType,
        },
        heart: dossierData.heart,
        measurements: dossierData.measurements,
      }
      saveDossierData(updated)
      setDossierData(updated)
      await router.navigate({ to: '/dossier' })
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Onbekende fout')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setFormValues({
      firstName: '',
      lastName: '',
      number: '',
      dateOfBirth: '',
      gender: '',
      height: '',
      weight: '',
      bloodType: '',
    })
    const reset: DossierData = {
      ...defaultDossierData,
    }
    saveDossierData(reset)
    setDossierData(reset)
  }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: bg }}>
      <header className="p-6 flex items-center justify-between">
        <div>
          <div className="text-white text-sm opacity-80">Mijn Dossier</div>
          <h1 className="brand-title text-white text-3xl font-bold">
            Gegevens bewerken
          </h1>
        </div>
        <Link
          to="/dossier"
          className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white font-medium transition-colors"
        >
          <ArrowLeft size={16} />
          Terug
        </Link>
      </header>

      <form
        onSubmit={handleSubmit}
        className="flex-1 px-4 sm:px-8 pb-16 max-w-5xl mx-auto w-full space-y-6"
      >
        <Card className="bg-white/10 border-white/20 backdrop-blur-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-[#AD3535] rounded-lg p-2 shadow-md">
                <User className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-white">Persoonlijke Info</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="Voornaam"
              value={formValues.firstName}
              onChange={(val) => updateField('firstName', val)}
            />
            <InputField
              label="Achternaam"
              value={formValues.lastName}
              onChange={(val) => updateField('lastName', val)}
            />
            <InputField
              label="Telefoonnummer"
              value={formValues.number}
              onChange={(val) => updateField('number', val)}
            />
            <InputField
              label="Geboortedatum"
              value={formValues.dateOfBirth}
              onChange={(val) => updateField('dateOfBirth', val)}
              inputType="date"
            />
            <SelectField
              label="Geslacht"
              value={formValues.gender}
              onChange={(val) => updateField('gender', val)}
              options={[
                { value: '', label: 'Kies...' },
                { value: 'male', label: 'Man' },
                { value: 'female', label: 'Vrouw' },
                { value: 'other', label: 'Anders' },
              ]}
            />
            <InputField
              label="Lengte (cm)"
              value={formValues.height}
              onChange={(val) => updateField('height', val)}
            />
            <InputField
              label="Gewicht (kg)"
              value={formValues.weight}
              onChange={(val) => updateField('weight', val)}
            />
            <SelectField
              label="Bloedgroep"
              value={formValues.bloodType}
              onChange={(val) => updateField('bloodType', val)}
              options={[
                { value: '', label: 'Kies...' },
                { value: 'AB+', label: 'AB+' },
                { value: 'AB-', label: 'AB-' },
                { value: 'A+', label: 'A+' },
                { value: 'A-', label: 'A-' },
                { value: 'B+', label: 'B+' },
                { value: 'B-', label: 'B-' },
                { value: 'O+', label: 'O+' },
                { value: 'O-', label: 'O-' },
              ]}
            />
          </CardContent>
        </Card>

        {apiError ? <p className="text-sm text-red-200">{apiError}</p> : null}

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={handleReset}
            className="w-full sm:w-auto cursor-pointer px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors border border-white/20"
          >
            Reset naar standaard
          </button>
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto cursor-pointer flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-red-300/80 hover:bg-red-300 text-white font-semibold transition-colors shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      </form>
    </main>
  )
}

function InputField({
  label,
  value,
  onChange,
  disabled = false,
  inputType = 'text',
}: {
  label: string
  value: string
  onChange?: (value: string) => void
  disabled?: boolean
  inputType?: string
}) {
  return (
    <label className="flex flex-col gap-1 text-white text-sm">
      <span className="text-white/80">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        disabled={disabled}
        type={inputType}
        className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        placeholder={`Voer ${label.toLowerCase()} in`}
      />
    </label>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string
  value: string
  onChange?: (value: string) => void
  options: Array<{ value: string; label: string }>
  disabled?: boolean
}) {
  return (
    <label className="flex flex-col gap-1 text-white text-sm">
      <span className="text-white/80">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        disabled={disabled}
        className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder:text-white/60 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40 transition-colors disabled:opacity-70 disabled:cursor-not-allowed appearance-none"
        style={{
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          backgroundImage:
            'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.08))',
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="text-black">
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}
