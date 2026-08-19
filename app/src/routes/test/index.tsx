import { createFileRoute, Link, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/test/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>
		<div>테스트 목록 "/test"!</div>
		<Link to="/test/$id" params={{ id: "11" }}>
    	11번 상세로 이동
    </Link>
		<Outlet />
	</div>
}
