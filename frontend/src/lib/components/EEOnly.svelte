<script lang="ts">
	import Tooltip from '$lib/components/meltComponents/Tooltip.svelte'
	import Badge from './common/badge/Badge.svelte'

	interface Props {
		children?: import('svelte').Snippet
	}

	let { children = undefined }: Props = $props()
</script>

<Tooltip>
	<Badge verySmall color="blue" class="px-2">受限</Badge>
	{#snippet text()}
		{#if children}
			{@render children()}
		{:else}
			当前部署未开放此功能
		{/if}
	{/snippet}
</Tooltip>
