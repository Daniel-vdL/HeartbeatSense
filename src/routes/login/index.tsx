import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import type {LoginValues} from '@/components/ui/login-form';
import { LoginForm  } from '@/components/ui/login-form'
import { auth } from '@/lib/auth'

type AuthResponse = {
  token: string
  firstName?: string
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

export const Route = createFileRoute('/login/')({
  component: Page,
  beforeLoad: () => {
    if (auth.isAuthenticated()) {
      throw redirect({ to: '/home' })
    }
  },
})

export default function Page() {
  const router = useRouter()

  const loginMutation = useMutation<AuthResponse, Error, LoginValues>({
    mutationFn: async ({ email, password }: LoginValues) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const fallback = `${response.status} ${response.statusText}`.trim()
        const text = await response.text().catch(() => '')
        try {
          const parsed = text ? (JSON.parse(text) as { message?: string }) : {}
          throw new Error(parsed.message ?? fallback)
        } catch {
          throw new Error(text || fallback || 'Login failed')
        }
      }

      return response.json() as Promise<AuthResponse>
    },
    onSuccess: async (data) => {
      const normalized = {
        token: data.token,
        firstName:
          data.firstName ??
          (data as Record<string, unknown>).firstname ??
          (data as Record<string, unknown>).FirstName ??
          '',
        lastName: data.lastName ?? '',
        email: data.email ?? '',
        number: (data as Record<string, unknown>).number ?? data.number ?? '',
        gender: (data as Record<string, unknown>).gender ?? data.gender,
        dateOfBirth:
          (data as Record<string, unknown>).dateOfBirth ??
          data.dateOfBirth ??
          '',
        height: (data as Record<string, unknown>).height ?? data.height,
        weight: (data as Record<string, unknown>).weight ?? data.weight,
        bloodType:
          (data as Record<string, unknown>).bloodType ?? data.bloodType,
        latestMeasurement: data.latestMeasurement ?? null,
      }
      auth.setAuthenticated(true)
      auth.setToken(normalized.token)
      auth.setUser(normalized)
      auth.markValidatedNow()
      await router.navigate({ to: '/home' })
    },
  })

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm
          onSubmit={(values: LoginValues) => loginMutation.mutate(values)}
          isLoading={loginMutation.isPending}
          error={loginMutation.error?.message}
        />
      </div>
    </div>
  )
}
