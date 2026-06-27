<script lang="ts">
	import Popover from '$lib/components/Popover.svelte'
	import { ButtonType } from '$lib/components/common'
	import Button from '$lib/components/common/button/Button.svelte'
	import { base } from '$app/paths'
	import { BookText, ExternalLink } from 'lucide-svelte'
	import { twMerge } from 'tailwind-merge'
	import { internalDocumentationLink } from '$lib/utils/internalLinks'

	interface Props {
		docLink: string
		btnClasses?: string | undefined
		size?: ButtonType.Size
	}

	let { docLink, btnClasses = undefined, size = 'xs' }: Props = $props()
	const href = $derived(internalDocumentationLink(docLink) ?? `${base}/tutorials`)
</script>

<Popover>
	{#snippet text()}
		<div class="flex flex-row gap-1">
			打开使用说明

			<ExternalLink size={16} />
		</div>
	{/snippet}
	<Button
		iconOnly
		startIcon={{
			icon: BookText
		}}
		{size}
		btnClasses={twMerge(
			'p-1 text-gray-300 hover:!text-gray-600 dark:text-gray-500 dark:hover:!text-gray-200 bg-transparent',
			btnClasses
		)}
		{href}
		color="light"
	/>
</Popover>
