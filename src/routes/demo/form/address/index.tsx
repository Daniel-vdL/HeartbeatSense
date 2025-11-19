import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/demo/form/address/')({
  component: Page,
})

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-2xl">
        <h2 className="text-2xl font-semibold">Demo — Address Form</h2>
        <p className="mt-4 text-sm text-muted-foreground">Placeholder for address form demo.</p>
      </div>
    </div>
  )
}
