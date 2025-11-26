import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select"
import { Link } from '@tanstack/react-router'

export type SignupValues = {
  firstName: string
  lastName: string
  age: string
  gender: string
  email: string
  phone: string
  password: string
  confirmPassword: string
}

type SignupFormProps = Omit<React.ComponentProps<typeof Card>, "onSubmit"> & {
  onSubmit: (values: SignupValues) => void
  isLoading?: boolean
  error?: string
}

export function SignupForm({
  onSubmit,
  isLoading = false,
  error,
  ...props
}: SignupFormProps) {
  const [values, setValues] = useState<SignupValues>({
    firstName: "",
    lastName: "",
    age: "",
    gender: "male",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  })
  const [localError, setLocalError] = useState<string | null>(null)

  const handleChange =
    (field: keyof SignupValues) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setValues((current) => ({ ...current, [field]: event.target.value }))
    }

  const handleSelectChange = (field: keyof SignupValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (values.password !== values.confirmPassword) {
      setLocalError("Passwords do not match")
      return
    }
    setLocalError(null)
    onSubmit(values)
  }

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Enter your information below to create your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="firstName">First Name</FieldLabel>
              <Input
                id="firstName"
                type="text"
                placeholder="John"
                required
                value={values.firstName}
                onChange={handleChange("firstName")}
                disabled={isLoading}
              />
              <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
              <Input
                id="lastName"
                type="text"
                placeholder="Doe"
                required
                value={values.lastName}
                onChange={handleChange("lastName")}
                disabled={isLoading}
              />
              <FieldLabel htmlFor="age">Age</FieldLabel>
              <Input
                id="age"
                type="number"
                placeholder="20"
                min={0} max={100}
                required
                value={values.age}
                onChange={handleChange("age")}
                disabled={isLoading}
              />

              <FieldLabel htmlFor="gender">Gender</FieldLabel>
              <Select
                value={values.gender}
                onValueChange={(val) => handleSelectChange("gender", val)}
              >
                <SelectTrigger id="gender" className="w-full">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select> 
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={values.email}
                onChange={handleChange("email")}
                disabled={isLoading}
              />
              <FieldDescription>
                We&apos;ll use this to contact you. We will not share your email
                with anyone else.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="phone">Phone number</FieldLabel>
              <Input
                id="phone"
                type="tel"
                placeholder="+31 6 12345678"
                required
                value={values.phone}
                onChange={handleChange("phone")}
                disabled={isLoading}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                required
                value={values.password}
                onChange={handleChange("password")}
                disabled={isLoading}
              />
              <FieldDescription>
                Must be at least 8 characters long.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">
                Confirm Password
              </FieldLabel>
              <Input
                id="confirm-password"
                type="password"
                required
                value={values.confirmPassword}
                onChange={handleChange("confirmPassword")}
                disabled={isLoading}
              />
              <FieldDescription>Please confirm your password.</FieldDescription>
            </Field>
            <FieldGroup>
              <Field>
                {localError ? (
                  <FieldDescription className="text-sm text-red-500">
                    {localError}
                  </FieldDescription>
                ) : null}
                {error ? (
                  <FieldDescription className="text-sm text-red-500">
                    {error}
                  </FieldDescription>
                ) : null}
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
                <FieldDescription className="px-6 text-center">
                  Already have an account?{' '}
                  <Link to="/login" className="underline underline-offset-4">
                    Login
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
