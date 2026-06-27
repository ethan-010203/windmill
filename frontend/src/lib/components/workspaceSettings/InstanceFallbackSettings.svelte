<script lang="ts">
	import { type AIProvider, type InstanceAISummary } from '$lib/gen'
	import { AI_PROVIDERS } from '../copilot/lib'
	import Badge from '../common/badge/Badge.svelte'
	import Button from '../common/button/Button.svelte'
	import SettingCard from '../instanceSettings/SettingCard.svelte'

	interface Props {
		instanceAiSummary?: InstanceAISummary
		showWorkspaceOverrideEditor?: boolean
		onToggleOverride: () => void
	}

	let {
		instanceAiSummary = undefined,
		showWorkspaceOverrideEditor = false,
		onToggleOverride
	}: Props = $props()

	let sortedInstanceProviders = $derived(
		[...(instanceAiSummary?.providers ?? [])].sort((left, right) =>
			left.provider.localeCompare(right.provider)
		)
	)

	function getProviderLabel(provider: AIProvider): string {
		return AI_PROVIDERS[provider]?.label ?? provider
	}
</script>

{#if instanceAiSummary}
	<SettingCard label="当前实例 AI">
		<div class="flex flex-col gap-4 p-4 rounded-md border bg-surface-tertiary">
			<p class="text-xs text-secondary">
				此工作区当前正在使用下方实例 AI 默认设置。
			</p>

			<div class="flex flex-col gap-3">
				{#each sortedInstanceProviders as providerSummary (providerSummary.provider)}
					<div class="rounded-md border bg-surface p-3 flex flex-col gap-2">
						<div class="flex items-center gap-2">
							<span class="text-xs font-medium">
								{getProviderLabel(providerSummary.provider)}
							</span>
							<Badge color="blue">实例</Badge>
						</div>
						<div class="flex flex-wrap gap-1">
							{#each providerSummary.models as model (model)}
								<Badge color="gray">{model}</Badge>
							{/each}
						</div>
					</div>
				{/each}
			</div>

			{#if instanceAiSummary.default_model}
				<div class="text-xs text-secondary">
					默认对话模型：
					<span class="text-primary font-medium">{instanceAiSummary.default_model.model}</span>
					<span class="text-tertiary">
						({getProviderLabel(instanceAiSummary.default_model.provider)})
					</span>
				</div>
			{/if}

			{#if instanceAiSummary.metadata_model}
				<div class="text-xs text-secondary">
					元数据生成模型：
					<span class="text-primary font-medium">
						{instanceAiSummary.metadata_model.model}
					</span>
					<span class="text-tertiary">
						({getProviderLabel(instanceAiSummary.metadata_model.provider)})
					</span>
				</div>
			{/if}

			{#if instanceAiSummary.code_completion_model}
				<div class="text-xs text-secondary">
					代码补全模型：
					<span class="text-primary font-medium">
						{instanceAiSummary.code_completion_model.model}
					</span>
					<span class="text-tertiary">
						({getProviderLabel(instanceAiSummary.code_completion_model.provider)})
					</span>
				</div>
			{/if}
		</div>
	</SettingCard>
{/if}

<SettingCard label="工作区覆盖设置">
	<div class="flex flex-col gap-3 p-4 rounded-md border bg-surface-tertiary">
		<p class="text-xs text-secondary">
			仅当此工作区需要覆盖当前实例默认设置时，才创建工作区专用 AI 设置。
		</p>
		<div>
			<Button onclick={onToggleOverride} variant="default" unifiedSize="sm">
				{showWorkspaceOverrideEditor ? '隐藏覆盖表单' : '为此工作区覆盖'}
			</Button>
		</div>
	</div>
</SettingCard>
