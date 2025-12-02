import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dossier/edit/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/dossier/edit/"!</div>
}
