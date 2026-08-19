import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/jamolist')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/jamolist"!</div>
}
