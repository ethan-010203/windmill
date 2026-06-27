<script lang="ts">
	import { ArrowLeft, ArrowRight } from 'lucide-svelte'
	import Button from '../common/button/Button.svelte'
	import { createEventDispatcher } from 'svelte'
	import Alert from '../common/alert/Alert.svelte'

	interface Props {
		activeIndex?: number | undefined;
		totalSteps?: number | undefined;
	}

	let { activeIndex = undefined, totalSteps = undefined }: Props = $props();

	const dispatch = createEventDispatcher()
</script>

<div class="flex flex-col gap-4 w-full pt-4">
	{#if activeIndex === 0}
		<Alert size="xs" title="帮助">
			<li>教程进行时界面不可直接操作，请在每一步点击下一步</li>
			<li>你也可以使用方向键切换步骤</li>
		</Alert>
	{/if}
	<div class="flex flex-row gap-2 justify-between w-full items-center">
		{#if activeIndex !== undefined && totalSteps !== undefined}
			<div class="text-xs">
				第 {activeIndex + 1} / {totalSteps} 步
			</div>
		{/if}
		<div class="flex flex-row gap-2">
			<Button
				size="xs2"
				color="light"
				startIcon={{ icon: ArrowLeft }}
				on:click={() => {
					dispatch('previous')
				}}
			>
				上一步
			</Button>
			<Button
				size="xs2"
				variant="accent"
				endIcon={{ icon: ArrowRight }}
				on:click={() => {
					dispatch('next')
				}}
			>
				下一步
			</Button>
		</div>
	</div>
</div>
