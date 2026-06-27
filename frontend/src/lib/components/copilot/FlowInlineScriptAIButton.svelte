<script lang="ts">
	import { autoPlacement } from '@floating-ui/core'
	import Popover from '$lib/components/meltComponents/Popover.svelte'
	import Button from '../common/button/Button.svelte'
	import { ExternalLink, WandSparkles } from 'lucide-svelte'
	import { base } from '$lib/base'
	import { twMerge } from 'tailwind-merge'
	import { aiChatManager, AIMode } from './chat/AIChatManager.svelte'
	import { copilotInfo } from '$lib/aiStore'
	import type { ComponentProps } from 'svelte'

	interface Props {
		moduleId?: string
		btnProps?: ComponentProps<typeof Button>
	}

	const { moduleId, btnProps }: Props = $props()

	const aiChatScriptModeClasses = $derived(
		aiChatManager.mode === AIMode.SCRIPT && aiChatManager.isOpen
			? 'dark:bg-violet-900 bg-violet-100'
			: ''
	)
</script>

{#snippet button(onClick?: () => void)}
	<Button
		size="xs"
		color="light"
		btnClasses={twMerge('!px-2', aiChatScriptModeClasses)}
		{onClick}
		iconOnly
		title="打开 AI 对话"
		startIcon={{ icon: WandSparkles, classes: 'text-ai' }}
		{...btnProps}
	/>
{/snippet}

{#if $copilotInfo.enabled}
	{@render button(() => {
		aiChatManager.openChat()
		const availableContext = aiChatManager.contextManager.getAvailableContext()
		aiChatManager.contextManager.setSelectedModuleContext(moduleId, availableContext)
	})}
{:else}
	<Popover
		floatingConfig={{
			middleware: [
				autoPlacement({
					allowedPlacements: ['bottom-start', 'bottom-end', 'top-start', 'top-end', 'top', 'bottom']
				})
			]
		}}
	>
		{#snippet trigger()}
			{@render button()}
		{/snippet}
		{#snippet content({ close })}
			<div class="p-4">
				<p class="text-sm">
					请先在<a
						href="{base}/workspace_settings?tab=ai"
						target="_blank"
						class="inline-flex flex-row items-center gap-1"
					>
						工作区设置 <ExternalLink size={16} />
					</a>中启用平台 AI。
				</p>
			</div>
		{/snippet}
	</Popover>
{/if}
