<script lang="ts">
	import {
		ResourceService,
		WorkspaceService,
		type AIConfig,
		type AIProvider,
		type GetCopilotSettingsStateResponse,
		type InstanceAISummary
	} from '$lib/gen'
	import { workspaceStore } from '$lib/stores'
	import { sendUserToast } from '$lib/toast'
	import { AI_PROVIDERS, fetchAvailableModels, providerSupportsWebSearch } from '../copilot/lib'
	import { supportsAutocomplete } from '../copilot/utils'
	import TestAiKey from '../copilot/TestAIKey.svelte'
	import Label from '../Label.svelte'
	import SettingsPageHeader from '../settings/SettingsPageHeader.svelte'
	import ResourcePicker from '../ResourcePicker.svelte'
	import Toggle from '../Toggle.svelte'
	import Select from '../select/Select.svelte'
	import Button from '../common/button/Button.svelte'
	import MultiSelect from '../select/MultiSelect.svelte'
	import { safeSelectItems } from '../select/utils.svelte'
	import Badge from '../common/badge/Badge.svelte'
	import Tooltip from '../Tooltip.svelte'
	import ModelTokenLimits from './ModelTokenLimits.svelte'
	import { setCopilotInfo } from '$lib/aiStore'
	import AIPromptsModal from '../settings/AIPromptsModal.svelte'
	import { Settings } from 'lucide-svelte'
	import { untrack } from 'svelte'
	import { slide } from 'svelte/transition'
	import SettingsFooter from './SettingsFooter.svelte'
	import InstanceFallbackSettings from './InstanceFallbackSettings.svelte'
	import SettingCard from '../instanceSettings/SettingCard.svelte'

	let {
		initialConfig = undefined,
		hasUnsavedChanges = $bindable(false),
		workspace = undefined,
		disableChatOffset = false,
		hasInstanceAiConfig = false,
		usesInstanceAiConfig = false,
		instanceAiSummary = undefined,
		customSave = undefined,
		onSave = undefined,
		title = '平台 AI',
		description = '平台 AI 可接入常用 AI 服务商和模型，为脚本、流程和应用编辑提供辅助能力。',
		link = undefined,
		promptScope = 'workspace'
	}: {
		initialConfig?: AIConfig | undefined
		hasUnsavedChanges?: boolean
		workspace?: string | undefined
		disableChatOffset?: boolean
		hasInstanceAiConfig?: boolean
		usesInstanceAiConfig?: boolean
		instanceAiSummary?: InstanceAISummary
		customSave?: (config: AIConfig) => Promise<void>
		onSave?: (info?: GetCopilotSettingsStateResponse) => void | Promise<void>
		title?: string
		description?: string
		link?: string
		promptScope?: 'workspace' | 'instance'
	} = $props()

	let effectiveWorkspace = $derived(workspace ?? $workspaceStore!)

	// --- Internal state ---
	let aiProviders: Exclude<AIConfig['providers'], undefined> = $state({})
	let codeCompletionModel: string | undefined = $state(undefined)
	let defaultModel: string | undefined = $state(undefined)
	let metadataModel: string | undefined = $state(undefined)
	let customPrompts: Record<string, string> = $state({})
	let maxTokensPerModel: Record<string, number> = $state({})
	let usingOpenaiClientCredentialsOauth = $state(false)
	let workspaceOverrideEditorOpened = $state(false)

	// --- Initial state for dirty tracking ---
	let initialAiProviders: Exclude<AIConfig['providers'], undefined> = $state({})
	let initialCodeCompletionModel: string | undefined = $state(undefined)
	let initialDefaultModel: string | undefined = $state(undefined)
	let initialMetadataModel: string | undefined = $state(undefined)
	let initialCustomPrompts: Record<string, string> = $state({})
	let initialMaxTokensPerModel: Record<string, number> = $state({})
	let initialPrompts: Record<string, string> = $state({})
	let lastLoadedConfigKey = $state<string | undefined>(undefined)

	function clone<T>(v: T): T {
		return JSON.parse(JSON.stringify(v))
	}

	function normalizeProviderSettings(
		providers: Exclude<AIConfig['providers'], undefined>
	): Exclude<AIConfig['providers'], undefined> {
		return Object.fromEntries(
			Object.entries(providers).map(([provider, config]) => [
				provider,
				providerSupportsWebSearch(provider as AIProvider)
					? { ...config, web_search_enabled: config.web_search_enabled ?? true }
					: config
			])
		)
	}

	function applyConfig(config: AIConfig | undefined) {
		aiProviders = normalizeProviderSettings(clone(config?.providers ?? {}))
		defaultModel = config?.default_model?.model
		metadataModel = config?.metadata_model?.model
		codeCompletionModel = config?.code_completion_model?.model
		customPrompts = clone(config?.custom_prompts ?? {})
		maxTokensPerModel = clone(config?.max_tokens_per_model ?? {})
		for (const mode of ['edit', 'fix', 'gen']) {
			if (!(mode in customPrompts)) {
				customPrompts[mode] = ''
			}
		}
	}

	function storeInitialState() {
		initialAiProviders = clone(aiProviders)
		initialDefaultModel = defaultModel
		initialMetadataModel = metadataModel
		initialCodeCompletionModel = codeCompletionModel
		initialCustomPrompts = clone(customPrompts)
		initialMaxTokensPerModel = clone(maxTokensPerModel)
		initialPrompts = clone(customPrompts)
	}

	export function loadFromConfig(config: AIConfig | undefined) {
		applyConfig(config)
		storeInitialState()
	}

	export function discard() {
		aiProviders = clone(initialAiProviders)
		defaultModel = initialDefaultModel
		metadataModel = initialMetadataModel
		codeCompletionModel = initialCodeCompletionModel
		customPrompts = clone(initialCustomPrompts)
		maxTokensPerModel = clone(initialMaxTokensPerModel)
	}

	$effect(() => {
		const configKey = JSON.stringify(initialConfig ?? {})
		if (configKey === lastLoadedConfigKey) {
			return
		}
		lastLoadedConfigKey = configKey
		untrack(() => {
			loadFromConfig(initialConfig)
		})
	})

	// Check if openai_client_credentials_oauth resource type exists
	async function loadOpenaiOauthFlag() {
		try {
			usingOpenaiClientCredentialsOauth = await ResourceService.existsResourceType({
				workspace: effectiveWorkspace,
				path: 'openai_client_credentials_oauth'
			})
		} catch {
			usingOpenaiClientCredentialsOauth = false
		}
	}
	loadOpenaiOauthFlag()

	// --- Dirty tracking ---
	let dirty = $derived(
		JSON.stringify(aiProviders) !== JSON.stringify(initialAiProviders) ||
			defaultModel !== initialDefaultModel ||
			metadataModel !== initialMetadataModel ||
			codeCompletionModel !== initialCodeCompletionModel ||
			JSON.stringify(customPrompts) !== JSON.stringify(initialCustomPrompts) ||
			JSON.stringify(maxTokensPerModel) !== JSON.stringify(initialMaxTokensPerModel)
	)

	$effect(() => {
		hasUnsavedChanges = dirty
	})

	// --- Model fetching ---
	let fetchedAiModels = $state(false)
	let availableAiModels = $state(
		Object.fromEntries(
			Object.keys(AI_PROVIDERS).map((provider) => [provider, AI_PROVIDERS[provider].defaultModels])
		) as Record<AIProvider, string[]>
	)

	let modalOpen = $state(false)
	let hasPromptsChanges = $derived(
		Array.from(new Set([...Object.keys(customPrompts), ...Object.keys(initialPrompts)])).some(
			(key) => {
				const currentValue = customPrompts[key] || ''
				const initialValue = initialPrompts[key] || ''
				return currentValue !== initialValue
			}
		)
	)
	let promptCount = $derived(
		Object.values(customPrompts).filter((p) => p?.trim().length > 0).length
	)
	let promptDescription = $derived(
		promptScope === 'instance'
			? 'Customize AI behavior with instance-level system prompts. These apply when a workspace uses instance AI defaults.'
			: 'Customize AI behavior with workspace-level system prompts. These apply to all workspace members.'
	)
	let showWorkspaceOverrideEditor = $derived(
		!usesInstanceAiConfig || Object.keys(aiProviders).length > 0 || workspaceOverrideEditorOpened
	)

	let selectedAiModels = $derived(Object.values(aiProviders).flatMap((p) => p.models))
	let modelProviderMap = $derived(
		Object.fromEntries(
			Object.entries(aiProviders).flatMap(([provider, config]) =>
				config.models.map((m) => [m, provider as AIProvider])
			)
		)
	)
	// Keep model selections valid: when a selected model is no longer in the
	// configured providers (provider disabled or model removed from the list),
	// clear it. The default chat model then falls back to the first configured
	// model rather than pointing at a model that no longer exists.
	$effect(() => {
		if (defaultModel && !selectedAiModels.includes(defaultModel)) {
			defaultModel = undefined
		}
		if (metadataModel && !selectedAiModels.includes(metadataModel)) {
			metadataModel = undefined
		}
		if (codeCompletionModel && !selectedAiModels.includes(codeCompletionModel)) {
			codeCompletionModel = undefined
		}
	})

	$effect(() => {
		;(async () => {
			if (fetchedAiModels) {
				return
			}
			for (const provider of Object.keys(aiProviders)) {
				try {
					const models = await fetchAvailableModels(
						aiProviders[provider].resource_path,
						effectiveWorkspace,
						provider as AIProvider
					)
					availableAiModels[provider] = models
				} catch (e) {
					console.error('failed to fetch models for provider', provider, e)
					availableAiModels[provider] = AI_PROVIDERS[provider].defaultModels
				}
			}
			fetchedAiModels = true
		})()
	})

	function resetPrompts() {
		customPrompts = { ...initialPrompts }
			sendUserToast('已恢复到上次保存的状态')
	}

	function buildConfig(): AIConfig {
		const code_completion_model =
			codeCompletionModel && modelProviderMap[codeCompletionModel]
				? { model: codeCompletionModel, provider: modelProviderMap[codeCompletionModel] }
				: undefined
		const default_model =
			defaultModel && modelProviderMap[defaultModel]
				? { model: defaultModel, provider: modelProviderMap[defaultModel] }
				: undefined
		const metadata_model =
			metadataModel && modelProviderMap[metadataModel]
				? { model: metadataModel, provider: modelProviderMap[metadataModel] }
				: undefined
		const custom_prompts: Record<string, string> = Object.entries(customPrompts)
			.filter(([_, prompt]) => prompt.trim().length > 0)
			.reduce((acc, [mode, prompt]) => ({ ...acc, [mode]: prompt }), {})

		return Object.keys(aiProviders ?? {}).length > 0
			? {
					providers: aiProviders,
					code_completion_model,
					default_model,
					metadata_model,
					custom_prompts: Object.keys(custom_prompts).length > 0 ? custom_prompts : undefined,
					max_tokens_per_model:
						Object.keys(maxTokensPerModel).length > 0 ? maxTokensPerModel : undefined
				}
			: {}
	}

	function isSaveDisabled(): boolean {
		return (
			!Object.values(aiProviders).every((p) => p.resource_path) ||
			(metadataModel != undefined && metadataModel.length === 0) ||
			(codeCompletionModel != undefined && codeCompletionModel.length === 0)
		)
	}

	export async function saveIfDirtyAndValid(): Promise<boolean> {
		if (!dirty) {
			return true
		}

		if (isSaveDisabled()) {
			sendUserToast('离开此页面前请先完成 AI 设置', true)
			return false
		}

		await editCopilotConfig()
		return true
	}

	async function editCopilotConfig(): Promise<void> {
		const config = buildConfig()
		let settingsState: GetCopilotSettingsStateResponse | undefined

		if (customSave) {
			await customSave(config)
		} else {
			const response = await WorkspaceService.editCopilotConfig({
				workspace: effectiveWorkspace,
				requestBody: config
			})
			setCopilotInfo(response.effective_ai_config)
			settingsState = {
				has_instance_ai_config: response.has_instance_ai_config,
				uses_instance_ai_config: response.uses_instance_ai_config,
				instance_ai_summary: response.instance_ai_summary
			}
			sendUserToast('AI 设置已更新')
		}
		storeInitialState()
		await onSave?.(settingsState)
	}

	async function onAiProviderChange(provider: AIProvider) {
		if (aiProviders[provider].resource_path) {
			try {
				const models = await fetchAvailableModels(
					aiProviders[provider].resource_path,
					effectiveWorkspace,
					provider as AIProvider
				)
				availableAiModels[provider] = models
			} catch (e) {
				console.error('failed to fetch models for provider', provider, e)
				availableAiModels[provider] = AI_PROVIDERS[provider].defaultModels
			}
		}

		if (
			aiProviders[provider]?.resource_path &&
			aiProviders[provider]?.models.length === 0 &&
			availableAiModels[provider].length > 0
		) {
			aiProviders[provider].models = availableAiModels[provider].slice(0, 1)
		}
	}

	const autocompleteModels = $derived(selectedAiModels.filter(supportsAutocomplete))
</script>

<SettingsPageHeader {title} {description} {link} />

<div class="flex flex-col gap-6 mt-4 pb-8">
	{#if usesInstanceAiConfig}
		<div
			class="p-3 border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 rounded-md text-xs text-secondary"
		>
			当前正在使用实例级 AI 设置。可在下方配置工作区专用设置进行覆盖。
		</div>
		<InstanceFallbackSettings
			{instanceAiSummary}
			{showWorkspaceOverrideEditor}
			onToggleOverride={() => (workspaceOverrideEditorOpened = !workspaceOverrideEditorOpened)}
		/>
	{:else if hasInstanceAiConfig && Object.keys(aiProviders).length > 0}
		<div
			class="p-3 border border-surface-hover bg-surface-secondary rounded-md text-xs text-secondary"
		>
			工作区 AI 设置会覆盖实例默认值。移除工作区设置后将使用实例默认值。
		</div>
	{/if}
	{#if showWorkspaceOverrideEditor}
		<SettingCard label="AI 提供商">
			<div class="flex flex-col gap-4 p-4 rounded-md border bg-surface-tertiary">
				{#each Object.entries(AI_PROVIDERS) as [provider, details] (provider)}
					<div class="flex flex-col">
						<div class="flex flex-row gap-2">
							<Toggle
								options={{
									right: details.label
								}}
								checked={!!aiProviders[provider]}
								on:change={(e) => {
									if (e.detail) {
										aiProviders = {
											...aiProviders,
											[provider]: {
												resource_path: '',
												models:
													availableAiModels[provider].length > 0
														? [availableAiModels[provider][0]]
														: [],
												...(providerSupportsWebSearch(provider as AIProvider)
													? { web_search_enabled: true }
													: {})
											}
										}
									} else {
										aiProviders = Object.fromEntries(
											Object.entries(aiProviders).filter(([key]) => key !== provider)
										)
										// Stale model selections are cleared reactively (see the validity $effect above).
									}
								}}
							/>
							{#if provider === 'anthropic'}
								<Badge color="blue">
									推荐
									<Tooltip>
										Anthropic 模型对工具调用的处理通常更稳定，适合作为 AI 对话模型。
									</Tooltip>
								</Badge>
							{/if}
						</div>

						{#if aiProviders[provider]}
							<div
								class="mb-4 flex flex-col gap-6 border p-4 rounded-md mt-2"
								transition:slide|local={{ duration: 150 }}
							>
							<Label label="资源">
									<div class="flex flex-row gap-1">
										<ResourcePicker
											selectFirst
											{workspace}
											{disableChatOffset}
											resourceType={provider === 'openai' && usingOpenaiClientCredentialsOauth
												? 'openai_client_credentials_oauth'
												: provider}
											initialValue={aiProviders[provider].resource_path}
											bind:value={
												() => aiProviders[provider].resource_path || undefined,
												(v) => {
													aiProviders[provider].resource_path = v ?? ''
													onAiProviderChange(provider as AIProvider)
												}
											}
										/>
										<TestAiKey
											aiProvider={provider as AIProvider}
											workspace={effectiveWorkspace}
											resourcePath={aiProviders[provider].resource_path}
											model={aiProviders[provider].models[0]}
										/>
									</div>
								</Label>

							<Label label="启用的模型">
									<MultiSelect
										items={safeSelectItems([
											...availableAiModels[provider],
											...aiProviders[provider].models
										])}
										bind:value={aiProviders[provider].models}
										placeholder="选择模型"
										onCreateItem={(item) =>
											(aiProviders[provider].models = [...aiProviders[provider].models, item])}
									/>
									<p class="text-2xs text-hint">
									如果没有看到需要的模型，可以在选择器中手动输入。
									</p>
								</Label>

								{#if providerSupportsWebSearch(provider as AIProvider)}
								<Label label="联网搜索">
										<Toggle
											options={{
										right: '启用原生联网搜索',
										rightTooltip:
											'在对话中自动使用提供商原生的联网搜索工具。'
											}}
											checked={aiProviders[provider].web_search_enabled !== false}
											on:change={(e) => {
												aiProviders[provider].web_search_enabled = e.detail
											}}
										/>
									</Label>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</SettingCard>

		<SettingCard label="默认对话模型">
			{#key Object.keys(aiProviders).length}
				<Select
					items={safeSelectItems(selectedAiModels)}
					bind:value={defaultModel}
					disabled={false}
					placeholder="选择默认模型"
					size="sm"
					class="max-w-lg"
					clearable
				/>
			{/key}
		</SettingCard>

		<SettingCard
			label="元数据生成模型"
			description="用于自动生成摘要、描述和工具名称。未设置时使用默认对话模型。"
		>
			{#key Object.keys(aiProviders).length}
				<Select
					items={safeSelectItems(selectedAiModels)}
					bind:value={metadataModel}
					disabled={false}
					placeholder="使用默认对话模型"
					size="sm"
					class="max-w-lg"
					clearable
				/>
			{/key}
		</SettingCard>

		<!-- Code completion group for animation purposes -->
		<div>
			<SettingCard label="代码补全">
				<Toggle
					on:change={(e) => {
						if (e.detail) {
							codeCompletionModel = autocompleteModels[0] ?? ''
						} else {
							codeCompletionModel = undefined
						}
					}}
					checked={codeCompletionModel != undefined}
					disabled={autocompleteModels.length == 0}
					options={{
						right: '启用代码补全',
						rightTooltip:
							'当前支持使用 Mistral Codestral 和 DeepSeek FIM 模型进行代码补全。'
					}}
				/>
			</SettingCard>

			{#if codeCompletionModel != undefined}
				<div transition:slide|local={{ duration: 150 }} class="mt-6">
				<SettingCard label="代码补全模型">
						<Select
							items={safeSelectItems(autocompleteModels)}
							bind:value={codeCompletionModel}
							disabled={false}
						placeholder="选择代码补全模型"
							size="sm"
						/>
					</SettingCard>
				</div>
			{/if}
		</div>

		<ModelTokenLimits {aiProviders} bind:maxTokensPerModel />

		<SettingCard label="自定义系统提示词" description={promptDescription}>
			<div class="flex items-center gap-2 pt-1">
				<Button
					onclick={() => (modalOpen = true)}
					variant="default"
					unifiedSize="sm"
					startIcon={{ icon: Settings }}
					disabled={Object.keys(aiProviders ?? {}).length === 0}
				>
					配置 AI 提示词
				</Button>
				{#if promptCount > 0}
				<span class="text-xs text-secondary">（已配置 {promptCount} 项）</span>
				{/if}
				{#if hasPromptsChanges}
				<Badge color="yellow">未保存的更改</Badge>
				{/if}
			</div>
		</SettingCard>
	{/if}
</div>

<AIPromptsModal
	bind:open={modalOpen}
	bind:customPrompts
	onReset={resetPrompts}
	hasChanges={hasPromptsChanges}
	scope={promptScope}
/>

{#if showWorkspaceOverrideEditor}
	<SettingsFooter
		hasUnsavedChanges={dirty}
		onSave={editCopilotConfig}
		onDiscard={discard}
		saveLabel="保存 AI 设置"
		disabled={isSaveDisabled()}
	/>
{/if}
