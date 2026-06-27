<script lang="ts">
	import Modal2 from '../common/modal/Modal2.svelte'
	import Button from '../common/button/Button.svelte'
	import Label from '../Label.svelte'
	import TextInput from '../text_input/TextInput.svelte'
	import { AIMode, getVisibleAIModes } from '../copilot/chat/AIChatManager.svelte'
	import { ExternalLink } from 'lucide-svelte'
	import { Alert } from '../common'

	const MAX_CUSTOM_PROMPT_LENGTH = 5000

	interface Props {
		open?: boolean
		customPrompts: Record<string, string>
		onSave?: () => void | Promise<void>
		onReset: () => void
		hasChanges: boolean
		scope?: 'user' | 'workspace' | 'instance'
		// Restrict the editor to a subset of modes (defaults to all visible modes)
		modes?: AIMode[]
		// Render the prompts read-only: inputs disabled, no Save/Reset, empty modes hidden
		readOnly?: boolean
		// Custom explanation shown in the read-only Alert (overrides the default text)
		readOnlyReason?: string
		title?: string
		// Portal target for the modal (defaults to #content, present on settings pages)
		target?: string
		// When set, render a link to the full AI settings page in the footer
		settingsHref?: string
		fixedHeight?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
	}

	let {
		open = $bindable(false),
		customPrompts = $bindable(),
		onSave,
		onReset,
		hasChanges,
		scope = 'user',
		modes = undefined,
		readOnly = false,
		readOnlyReason = undefined,
		title = '自定义 AI 系统提示词',
		target = '#content',
		settingsHref = undefined,
		fixedHeight = 'xxl'
	}: Props = $props()

	const placeholders: Record<AIMode, string> = {
		[AIMode.SCRIPT]: '输入用于脚本生成和编辑的自定义要求',
		[AIMode.FLOW]: '输入用于流程创建和自动化的自定义要求',
		[AIMode.APP]: '输入用于界面和应用开发的自定义要求',
		[AIMode.NAVIGATOR]: '输入用于导航和操作指引的自定义要求',
		[AIMode.API]: '输入用于 API 交互和集成的自定义要求',
		[AIMode.GLOBAL]: '输入用于工作空间草稿辅助的自定义要求',
		[AIMode.ASK]: '输入用于常规问题和辅助的自定义要求'
	}

	const modeLabels: Record<AIMode, string> = {
		[AIMode.SCRIPT]: '脚本模式',
		[AIMode.FLOW]: '流程模式',
		[AIMode.APP]: '应用模式',
		[AIMode.NAVIGATOR]: '导航模式',
		[AIMode.API]: 'API 模式',
		[AIMode.GLOBAL]: '全局模式',
		[AIMode.ASK]: '问答模式'
	}

	let visibleModes = $derived(modes ?? getVisibleAIModes())
	// In read-only mode, only show modes that actually have a prompt configured
	let displayModes = $derived(
		readOnly
			? visibleModes.filter((mode) => (customPrompts[mode] ?? '').trim().length > 0)
			: visibleModes
	)
	// A single prompt (e.g. the global-chat quick settings) doesn't need per-mode framing
	let singleMode = $derived(displayModes.length === 1)

	let saving = $state(false)

	async function handleSave() {
		if (saving) return
		saving = true
		try {
			// onSave may be async (e.g. the workspace round-trip); await it so the modal stays
			// open while the save is in flight and only closes on success. A failing onSave is
			// expected to surface its own toast and throw, leaving the modal open.
			await onSave?.()
			open = false
		} catch {
			// keep the modal open; onSave already reported the error
		} finally {
			saving = false
		}
	}

	function handleReset() {
		onReset()
	}
</script>

<Modal2 bind:isOpen={open} {title} fixedWidth="md" {fixedHeight} {target}>
	<div class="flex flex-col gap-6 h-full px-1 w-full">
		<div class="grow min-h-0 overflow-y-auto" style="scrollbar-gutter: stable;">
			{#if readOnly}
				<div class="mb-6">
					<Alert type="info" title="只读" size="xs">
						{#if readOnlyReason}
							{readOnlyReason}
						{:else if scope === 'workspace'}
							只有工作空间管理员可以编辑工作空间 AI 提示词。它会应用于全部工作空间成员。
						{:else}
							此提示词为只读。
						{/if}
					</Alert>
				</div>
			{:else}
				<div class="text-xs text-secondary mb-6">
					{#if scope === 'workspace'}
						{#if singleMode}
							自定义工作空间系统提示词。它会应用于全部工作空间成员。
						{:else}
							为每个 AI 模式自定义系统提示词。这些提示词会应用于全部工作空间成员。
						{/if}
					{:else if scope === 'instance'}
						{#if singleMode}
							自定义系统提示词。它会应用于使用实例 AI 默认配置的工作空间。
						{:else}
							为每个 AI 模式自定义系统提示词。这些提示词会应用于使用实例 AI 默认配置的工作空间。
						{/if}
					{:else if singleMode}
						自定义你的系统提示词。它会保存在浏览器本地，并与工作空间级提示词一起生效。
					{:else}
						为每个 AI 模式自定义系统提示词。这些提示词会保存在浏览器本地，并与工作空间级提示词一起生效。
					{/if}
				</div>
			{/if}

			{#if readOnly && displayModes.length === 0}
				<div class="text-xs text-secondary">尚未配置工作空间提示词。</div>
			{/if}
			{#each displayModes as mode (mode)}
				<div class="flex flex-col gap-2 pb-4 last:border-b-0">
					<Label
						label={modeLabels[mode]}
						for={`custom-prompt-${mode}`}
						headless={displayModes.length === 1}
					>
						<TextInput
							bind:value={customPrompts[mode]}
							underlyingInputEl="textarea"
							inputProps={{
								placeholder: placeholders[mode],
								rows: 3,
								maxlength: MAX_CUSTOM_PROMPT_LENGTH,
								id: `custom-prompt-${mode}`,
								readonly: readOnly
							}}
							class="min-h-12 resize-y"
							size="sm"
						/>
						{#if !readOnly}
							<div class="flex justify-end mt-1">
								<span class="text-2xs text-hint">
									{(customPrompts[mode] ?? '').length}/{MAX_CUSTOM_PROMPT_LENGTH} 个字符
								</span>
							</div>
						{/if}
					</Label>
				</div>
			{/each}
		</div>

		{#if !readOnly}
			<div class="flex justify-between items-center gap-2">
				<div>
					{#if settingsHref}
						<Button
							href={settingsHref}
							target="_blank"
							variant="subtle"
							size="sm"
							endIcon={{ icon: ExternalLink }}
						>
							AI 设置
						</Button>
					{/if}
				</div>
				<div class="flex gap-2">
					<Button
						size="sm"
						variant="default"
						disabled={!hasChanges || saving}
						onclick={handleReset}
					>
						重置
					</Button>
					{#if onSave}
						<Button
							size="sm"
							variant="accent"
							disabled={!hasChanges}
							loading={saving}
							onclick={handleSave}
						>
							保存提示词
						</Button>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</Modal2>
