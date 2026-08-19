import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/flashcard')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/flashcard"!</div>
}
