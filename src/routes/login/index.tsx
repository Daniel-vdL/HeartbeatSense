import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { LoginForm, type LoginValues } from "@/components/ui/login-form"

export const Route = createFileRoute('/login/')({
  component: Page,
})

export default function Page() {
  const router = useRouter()

  const loginMutation = useMutation<unknown, Error, LoginValues>({
    mutationFn: async ({ email, password }: LoginValues) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const fallback = `${response.status} ${response.statusText}`.trim()
        const text = await response.text().catch(() => "")
        try {
          const parsed = text ? (JSON.parse(text) as { message?: string }) : {}
          throw new Error(parsed.message ?? fallback)
        } catch {
          throw new Error(text || fallback || "Login failed")
        }
      }

      return response.json()
    },
    onSuccess: async () => {
      await router.navigate({ to: "/home" })
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
 
