import { createFileRoute, redirect } from '@tanstack/react-router'

// Dit is de 'root' route (localhost:3000/)
export const Route = createFileRoute('/')({
  // Voordat de pagina laadt, stuur direct door naar /home
  beforeLoad: () => {
    throw redirect({
      to: '/home',
    })
  },
})