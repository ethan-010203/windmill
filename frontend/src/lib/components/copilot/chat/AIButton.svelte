<script lang="ts">
	import { base } from '$lib/base'
	import { copilotInfo } from '$lib/aiStore'
	import { aiUserDisabled } from '$lib/stores'
	import Popover from '$lib/components/meltComponents/Popover.svelte'
	import DarkPopover from '$lib/components/Popover.svelte'
	import { ExternalLink, WandSparkles } from 'lucide-svelte'
	import { getModifierKey } from '$lib/utils'
	import Button from '$lib/components/common/button/Button.svelte'

	let {
		togglePanel,
		btnClasses
	}: {
		togglePanel: () => void
		btnClasses?: string
	} = $props()
</script>

{#if $copilotInfo.enabled}
	<DarkPopover>
		{#snippet text()}
			<div class="flex flex-row gap-1">
				显示 AI 面板。

				<div class="flex flex-row items-center !text-md opacity-60 gap-0 font-normal">
					{getModifierKey()}L
				</div>
			</div>
		{/snippet}
		{@render button({ onPress: () => togglePanel() })}
	</DarkPopover>
{:else}
	<Popover placement="bottom" class="h-full">
		{#snippet trigger()}
			{@render button({ onPress: () => togglePanel() })}
		{/snippet}
		{#snippet content()}
			<div class="block text-primary p-4">
				{#if $aiUserDisabled}
					<p class="text-sm">你的账号设置中已关闭平台 AI。</p>
				{:else}
					<p class="text-sm"
						>请先在<a
							href="{base}/workspace_settings?tab=ai"
							target="_blank"
							class="inline-flex flex-row items-center gap-1"
							>工作区设置 <ExternalLink size={16} /></a>中启用平台 AI。
						></p
					>
				{/if}
			</div>
		{/snippet}
	</Popover>
{/if}

{#snippet button({ onPress }: { onPress: () => void })}
	<Button
		unifiedSize="sm"
		color="light"
		variant="default"
		onClick={onPress}
		startIcon={{ icon: WandSparkles }}
		iconOnly
		{btnClasses}
	>
		AI 面板
	</Button>
{/snippet}
