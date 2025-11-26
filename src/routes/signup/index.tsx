import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { SignupForm, type SignupValues } from "@/components/signup-form"
import { auth } from "@/lib/auth"

type AuthResponse = {
  token: string
  firstName?: string
  lastName?: string
  email?: string
}

export const Route = createFileRoute('/signup/')({  
  component: SignupPage,
  beforeLoad: () => {
    if (auth.isAuthenticated()) {
      throw redirect({ to: "/home" })
    }
  },
})

export default function SignupPage() {
  const router = useRouter()

  const signupMutation = useMutation<AuthResponse, Error, SignupValues>({
    mutationFn: async (values) => {
      const sanitizedPhone = values.phone.replace(/\D/g, "")
      const payload = {
        firstName: values.firstName,
        lastName: values.lastName,
        age: Number(values.age) || values.age,
        gender: values.gender,
        email: values.email,
        number: sanitizedPhone ? Number(sanitizedPhone) : 0,
        password: values.password,
      }

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const fallback = `${response.status} ${response.statusText}`.trim()
        const text = await response.text().catch(() => "")
        try {
          const parsed = text ? (JSON.parse(text) as { message?: string }) : {}
          throw new Error(parsed.message ?? fallback)
        } catch {
          throw new Error(text || fallback || "Signup failed")
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
          "",
        lastName: data.lastName ?? "",
        email: data.email ?? "",
      }
      auth.setAuthenticated(true)
      auth.setToken(normalized.token)
      auth.setUser(normalized)
      auth.markValidatedNow()
      await router.navigate({ to: "/home" })
    },
  })

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignupForm
          onSubmit={(values: SignupValues) => signupMutation.mutate(values)}
          isLoading={signupMutation.isPending}
          error={signupMutation.error?.message}
        />
      </div>
    </div>
  )
}
