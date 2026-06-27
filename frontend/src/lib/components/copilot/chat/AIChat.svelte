<script lang="ts">
	import AIChatDisplay from './AIChatDisplay.svelte'
	import { untrack } from 'svelte'
	import { type ScriptLang } from '$lib/gen'
	import { aiUserDisabled, dbSchemas, userStore, workspaceStore } from '$lib/stores'
	import { AIMode } from './AIChatManager.svelte'
	import { getAiChatManager } from './aiChatManagerContext'

	const aiChatManager = getAiChatManager()
	import { base } from '$lib/base'
	import HideButton from '$lib/components/apps/editor/settingsPanel/HideButton.svelte'
	import { SUPPORTED_CHAT_SCRIPT_LANGUAGES } from './script/core'
	import { copilotInfo } from '$lib/aiStore'

	let {
		hideHeader = false,
		hideModeSelector = false,
		forceDisabled = false,
		forceDisabledMessage = '',
		wideLayout = false,
		emptyHint,
		inputPreface
	}: {
		hideHeader?: boolean
		hideModeSelector?: boolean
		// External "you can't type here" override. Used by sessions when
		// the session's committed workspace was deleted/archived so the
		// chat is effectively read-only until the user moves or discards
		// the session. Wins over the internal disabled derivation.
		forceDisabled?: boolean
		forceDisabledMessage?: string
		// Forwarded to AIChatDisplay. When true, the messages / input
		// columns are centered in a max-w-3xl px-8 box. Sessions opt
		// in; the narrow global-chat panel leaves it off.
		wideLayout?: boolean
		emptyHint?: import('svelte').Snippet
		inputPreface?: import('svelte').Snippet
	} = $props()

	const isAdmin = $derived($userStore?.is_admin || $userStore?.is_super_admin)
	const hasCopilot = $derived($copilotInfo.enabled)
	const disabled = $derived(
		forceDisabled ||
			!hasCopilot ||
			(aiChatManager.mode === AIMode.SCRIPT &&
				aiChatManager.scriptEditorOptions?.lang &&
				!SUPPORTED_CHAT_SCRIPT_LANGUAGES.includes(aiChatManager.scriptEditorOptions.lang))
	)
	const disabledMessage = $derived(
		forceDisabled
			? forceDisabledMessage
			: !hasCopilot
				? $aiUserDisabled
					? '你的账号设置中已关闭平台 AI'
					: isAdmin
						? `请先在[工作区设置](${base}/workspace_settings?tab=ai)中启用平台 AI 后再使用对话`
						: '请联系管理员在当前工作区启用平台 AI 后再使用对话'
				: aiChatManager.mode === AIMode.SCRIPT &&
					  aiChatManager.scriptEditorOptions?.lang &&
					  !SUPPORTED_CHAT_SCRIPT_LANGUAGES.includes(aiChatManager.scriptEditorOptions.lang)
					? `平台 AI 暂不支持 ${aiChatManager.scriptEditorOptions.lang} 语言。`
					: ''
	)

	const suggestions = [
		'Where can I see my latest runs?',
		'How do I trigger a script with a webhook endpoint?',
		'How can I connect to a database?',
		'How do I schedule a recurring job?'
	]

	export async function generateStep(moduleId: string, lang: ScriptLang, instructions: string) {
		aiChatManager.generateStep(moduleId, lang, instructions)
	}

	export async function sendRequest(
		options: {
			removeDiff?: boolean
			addBackCode?: boolean
			instructions?: string
			mode?: AIMode
			lang?: ScriptLang | 'bunnative'
			isPreprocessor?: boolean
		} = {}
	) {
		aiChatManager.sendRequest(options)
	}

	export function focusInput() {
		aiChatDisplay?.focusInput()
	}

	const historyManager = aiChatManager.historyManager

	let aiChatDisplay: AIChatDisplay | undefined = $state(undefined)

	$effect(() => {
		aiChatManager.listenForDbSchemasChanges($dbSchemas)
	})

	$effect(() => {
		aiChatManager.listenForContextChange($dbSchemas, $workspaceStore)
	})

	$effect(() => {
		aiChatManager.updateMode(untrack(() => aiChatManager.mode))
	})
</script>

<svelte:window
	onkeydown={(e) => {
		if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
			e.preventDefault()
			aiChatManager.toggleOpen()
			aiChatDisplay?.focusInput()
		}
	}}
/>

{#snippet headerLeft()}
	<HideButton
		hidden={false}
		direction="right"
		panelName="AI"
		shortcut="L"
		size="md"
		on:click={() => aiChatManager.toggleOpen()}
	/>
{/snippet}

<AIChatDisplay
	bind:this={aiChatDisplay}
	pastChats={historyManager.getPastChats()}
	bind:selectedContext={
		() => aiChatManager.contextManager.getSelectedContext(),
		(sc) => aiChatManager.contextManager.setSelectedContext(sc)
	}
	availableContext={aiChatManager.mode === AIMode.APP
		? aiChatManager.getAppAvailableContext()
		: aiChatManager.contextManager.getAvailableContext()}
	messages={aiChatManager.currentReply || aiChatManager.currentReasoning
		? [
				...aiChatManager.displayMessages,
				{
					role: 'assistant',
					content: aiChatManager.currentReply,
					...(aiChatManager.currentReasoning ? { reasoning: aiChatManager.currentReasoning } : {}),
					streaming: true,
					contextElements: aiChatManager.contextManager
						.getSelectedContext()
						.filter((c) => c.type === 'code')
				}
			]
		: aiChatManager.displayMessages}
	saveAndClear={aiChatManager.saveAndClear}
	deletePastChat={(id) => {
		historyManager.deletePastChat(id)
	}}
	loadPastChat={(id) => {
		aiChatManager.loadPastChat(id)
	}}
	askAi={aiChatManager.askAi}
	{headerLeft}
	hasDiff={aiChatManager.scriptEditorOptions &&
		!!aiChatManager.scriptEditorOptions.lastDeployedCode &&
		aiChatManager.scriptEditorOptions.lastDeployedCode !== aiChatManager.scriptEditorOptions.code}
	diffMode={aiChatManager.scriptEditorOptions?.diffMode ?? false}
	{disabled}
	{disabledMessage}
	{suggestions}
	{hideHeader}
	{hideModeSelector}
	{wideLayout}
	{emptyHint}
	{inputPreface}
></AIChatDisplay>
