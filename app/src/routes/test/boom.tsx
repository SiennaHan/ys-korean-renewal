import { useLottieEffect } from '@/components/effect/lottie-effect-provider'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/test/boom')({
  component: RouteComponent,
})

function RouteComponent() {
	const lottieEffect = useLottieEffect()
	const boom = () => {
		lottieEffect.playCelebration();
	}
  return <div>
		<div>lottie effect test</div>
		<div>
			<button onClick={boom}>폭죽</button>
		</div>
	</div>
}
