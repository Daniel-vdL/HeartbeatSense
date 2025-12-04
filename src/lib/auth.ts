const STORAGE_KEY = 'hb_authenticated'
const STORAGE_USER_KEY = 'hb_user'
const STORAGE_TOKEN_KEY = 'hb_token'
const VALIDATION_MAX_AGE_MS = 5 * 60 * 1000 // 5 minutes
export type LatestMeasurement = {
  value?: string
  deviceId?: string
  createdAt?: string
} | null

export type StoredUser = {
  firstName?: string
  firstname?: string
  FirstName?: string
  lastName?: string
  name?: string
  username?: string
  email?: string
  number?: string
  gender?: string
  dateOfBirth?: string
  height?: number | string
  weight?: number | string
  bloodType?: string
  latestMeasurement?: LatestMeasurement
}

let lastValidationTime = 0
let inFlightValidation: Promise<boolean> | null = null

export const auth = {
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false
    const isFlagSet = window.localStorage.getItem(STORAGE_KEY) === 'true'
    const hasToken = !!window.localStorage.getItem(STORAGE_TOKEN_KEY)
    const hasUser = !!window.localStorage.getItem(STORAGE_USER_KEY)
    return isFlagSet && hasToken && hasUser
  },
  setAuthenticated(value: boolean) {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false')
  },
  setToken(token: string | null) {
    if (typeof window === 'undefined') return
    if (!token) {
      window.localStorage.removeItem(STORAGE_TOKEN_KEY)
      return
    }
    window.localStorage.setItem(STORAGE_TOKEN_KEY, token)
  },
  getToken(): string | null {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(STORAGE_TOKEN_KEY)
  },
  setUser(user: unknown) {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user))
    } catch {
      // ignore storage errors
    }
  },
  getUser<T = StoredUser>(): T | null {
    if (typeof window === 'undefined') return null
    const raw = window.localStorage.getItem(STORAGE_USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  },
  getDisplayName(): string {
    const user = this.getUser()
    return (
      user?.firstName ||
      user?.firstname ||
      user?.FirstName ||
      user?.name ||
      user?.username ||
      user?.email ||
      ''
    )
  },
  getAge(): number | null {
    const user = this.getUser()
    if (!user?.dateOfBirth) return null
    const date = new Date(user.dateOfBirth)
    if (Number.isNaN(date.getTime())) return null
    const diff = Date.now() - date.getTime()
    const ageDate = new Date(diff)
    return Math.abs(ageDate.getUTCFullYear() - 1970)
  },
  async refreshUserFromApi(): Promise<StoredUser | null> {
    const token = this.getToken()
    if (!token) return null
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      })

      if (!response.ok) {
        return null
      }

      const data = (await response.json()) as StoredUser & { token?: string }
      this.setUser({
        firstName:
          data.firstName ?? data.firstname ?? data.FirstName ?? undefined,
        lastName: data.lastName,
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
        this.setToken(data.token)
      }

      return this.getUser()
    } catch {
      return null
    }
  },
  async validateSession(): Promise<boolean> {
    const token = this.getToken()
    if (!token) {
      this.clear()
      return false
    }

    const now = Date.now()
    const isFresh = now - lastValidationTime < VALIDATION_MAX_AGE_MS
    const hasUser = !!this.getUser()

    if (isFresh && hasUser) {
      return true
    }

    if (inFlightValidation) {
      return inFlightValidation
    }

    inFlightValidation = (async () => {
      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
        })

        if (!response.ok) {
          // 401/403/404/etc -> beschouw als ongeldig
          lastValidationTime = 0
          inFlightValidation = null
          this.clear()
          return false
        }

        const data = (await response.json()) as StoredUser & { token?: string }

        this.setUser({
          firstName:
            data.firstName ?? data.firstname ?? data.FirstName ?? undefined,
          lastName: data.lastName,
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
          this.setToken(data.token)
        }

        lastValidationTime = Date.now()
        inFlightValidation = null
        return true
      } catch {
        lastValidationTime = 0
        inFlightValidation = null
        this.clear()
        return false
      }
    })()

    return inFlightValidation
  },
  markValidatedNow() {
    lastValidationTime = Date.now()
  },
  clear() {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(STORAGE_KEY)
    window.localStorage.removeItem(STORAGE_USER_KEY)
    window.localStorage.removeItem(STORAGE_TOKEN_KEY)
    lastValidationTime = 0
    inFlightValidation = null
  },
}
