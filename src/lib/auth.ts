const STORAGE_KEY = "hb_authenticated"
const STORAGE_USER_KEY = "hb_user"
const STORAGE_TOKEN_KEY = "hb_token"

export const auth = {
  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false
    const isFlagSet = window.localStorage.getItem(STORAGE_KEY) === "true"
    const hasToken = !!window.localStorage.getItem(STORAGE_TOKEN_KEY)
    const hasUser = !!window.localStorage.getItem(STORAGE_USER_KEY)
    return isFlagSet && hasToken && hasUser
  },
  setAuthenticated(value: boolean) {
    if (typeof window === "undefined") return
    window.localStorage.setItem(STORAGE_KEY, value ? "true" : "false")
  },
  setToken(token: string | null) {
    if (typeof window === "undefined") return
    if (!token) {
      window.localStorage.removeItem(STORAGE_TOKEN_KEY)
      return
    }
    window.localStorage.setItem(STORAGE_TOKEN_KEY, token)
  },
  getToken(): string | null {
    if (typeof window === "undefined") return null
    return window.localStorage.getItem(STORAGE_TOKEN_KEY)
  },
  setUser(user: unknown) {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user))
    } catch {
      // ignore storage errors
    }
  },
  getUser<T = Record<string, unknown>>(): T | null {
    if (typeof window === "undefined") return null
    const raw = window.localStorage.getItem(STORAGE_USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  },
  getDisplayName(): string {
    const user = this.getUser<{
      firstName?: string
      firstname?: string
      FirstName?: string
      lastName?: string
      name?: string
      username?: string
      email?: string
    }>()
    return (
      user?.firstName ||
      user?.firstname ||
      user?.FirstName ||
      user?.name ||
      user?.username ||
      user?.email ||
      ""
    )
  },
  async validateSession(): Promise<boolean> {
    const token = this.getToken()
    if (!token) {
      this.clear()
      return false
    }

    try {
      const response = await fetch("/api/auth/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      })

      if (!response.ok) {
        this.clear()
        return false
      }

      const data = (await response.json()) as {
        firstName?: string
        firstname?: string
        FirstName?: string
        lastName?: string
        email?: string
        token?: string
      }

      this.setUser({
        firstName:
          data.firstName ?? data.firstname ?? data.FirstName ?? undefined,
        lastName: data.lastName,
        email: data.email,
      })

      if (data.token) {
        this.setToken(data.token)
      }

      return true
    } catch {
      this.clear()
      return false
    }
  },
  clear() {
    if (typeof window === "undefined") return
    window.localStorage.removeItem(STORAGE_KEY)
    window.localStorage.removeItem(STORAGE_USER_KEY)
    window.localStorage.removeItem(STORAGE_TOKEN_KEY)
  },
}
