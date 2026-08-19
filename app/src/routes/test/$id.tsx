import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/test/$id')({
  component: RouteComponent,
})

function RouteComponent() {
	const { id } = Route.useParams() // 여기서 파라미터를 가져옵니다.
	// 또는: const { id } = useParams({ from: '/test/$id' })
	console.log('id', id)
  return (
    <div>
      <h2>Test 상세 페이지</h2>
      <p>현재 선택된 Test ID: {id}</p>
    </div>
  );
}
