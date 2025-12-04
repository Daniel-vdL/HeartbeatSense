import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import type React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export type LoginValues = {
  email: string
  password: string
}

type LoginFormProps = Omit<React.ComponentProps<'div'>, 'onSubmit'> & {
  onSubmit: (values: LoginValues) => void
  isLoading?: boolean
  error?: string
}

export function LoginForm({
  className,
  onSubmit,
  isLoading = false,
  error,
  ...props
}: LoginFormProps) {
  const [values, setValues] = useState<LoginValues>({
    email: '',
    password: '',
  })

  const handleChange =
    (field: keyof LoginValues) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setValues((current) => ({ ...current, [field]: event.target.value }))
    }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit(values)
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={values.email}
                  onChange={handleChange('email')}
                  disabled={isLoading}
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <a
                    href="#"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  ></a>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={values.password}
                  onChange={handleChange('password')}
                  disabled={isLoading}
                />
              </Field>
              <Field>
                {error ? (
                  <FieldDescription className="text-sm text-red-500">
                    {error}
                  </FieldDescription>
                ) : null}
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? 'Logging in...' : 'Login'}
                </Button>
                {/* removed extra outline button to simplify form */}
                <FieldDescription className="text-center">
                  Don&apos;t have an account?{' '}
                  <Link to="/signup" className="underline underline-offset-4">
                    Sign up
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
