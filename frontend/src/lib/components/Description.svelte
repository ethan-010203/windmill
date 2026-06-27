<script lang="ts">
	import { ExternalLink } from 'lucide-svelte'
	import { base } from '$app/paths'
	import { twMerge } from 'tailwind-merge'


	interface Props {
		link?: string | undefined;
		class?: string;
		children?: import('svelte').Snippet;
	}

	let { link = undefined, class: className = '', children }: Props = $props();
	
</script>

<div class={twMerge('text-xs text-primary font-normal', className)}>
	{@render children?.()}
	{#if link}
		<a href={`${base}/tutorials`} class="whitespace-nowrap"
			>查看说明 <ExternalLink size={12} class="inline-block" /></a
		>
	{/if}
</div>
