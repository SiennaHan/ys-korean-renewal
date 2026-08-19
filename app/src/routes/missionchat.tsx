import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/missionchat')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/missionchat"!</div>
}
