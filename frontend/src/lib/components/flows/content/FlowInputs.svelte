<script lang="ts">
	import { Alert } from '$lib/components/common'
	import Tooltip from '$lib/components/Tooltip.svelte'

	import { createEventDispatcher, getContext, untrack } from 'svelte'
	import FlowScriptPicker from '../pickers/FlowScriptPicker.svelte'
	import WorkspaceScriptPicker from '../pickers/WorkspaceScriptPicker.svelte'
	import ToggleButtonGroup from '$lib/components/common/toggleButton-v2/ToggleButtonGroup.svelte'
	import ToggleButton from '$lib/components/common/toggleButton-v2/ToggleButton.svelte'
	import { Check, Code, Zap } from 'lucide-svelte'
	import SuspendDrawer from './SuspendDrawer.svelte'
	import { defaultScripts } from '$lib/stores'
	import { defaultScriptLanguages, processLangs } from '$lib/scripts'
	import type { SupportedLanguage } from '$lib/common'
	import DefaultScripts from '$lib/components/DefaultScripts.svelte'
	import type { FlowBuilderWhitelabelCustomUi } from '$lib/components/custom_ui'
	import { canHavePreprocessor } from '$lib/script_helpers'

	interface Props {
		failureModule: boolean
		preprocessorModule: boolean
		shouldDisableTriggerScripts?: boolean
		noEditor: boolean
		summary?: string | undefined
	}

	let {
		failureModule,
		preprocessorModule,
		shouldDisableTriggerScripts = false,
		noEditor,
		summary = $bindable(undefined)
	}: Props = $props()

	const dispatch = createEventDispatcher()
	let kind: 'script' | 'failure' | 'approval' | 'trigger' = $state(
		untrack(() => failureModule)
			? 'failure'
			: summary == 'Trigger'
				? 'trigger'
				: summary == 'Approval'
					? 'approval'
					: 'script'
	)
	let filter = $state('')

	let langs = $derived(
		processLangs(undefined, $defaultScripts?.order ?? Object.keys(defaultScriptLanguages))
			.map((l) => [defaultScriptLanguages[l], l])
			.filter(
				(x) => $defaultScripts?.hidden == undefined || !$defaultScripts.hidden.includes(x[1])
			) as [string, SupportedLanguage | 'docker'][]
	)

	function displayLang(lang: SupportedLanguage | 'docker', kind: string) {
		if (preprocessorModule) {
			return canHavePreprocessor(lang as SupportedLanguage)
		}

		if (failureModule || kind === 'trigger') {
			if (
				[
					'postgresql',
					'mysql',
					'bigquery',
					'snowflake',
					'mssql',
					'graphql',
					'duckdb',
					'oracledb'
				].includes(lang)
			) {
				return false
			}
			return true
		}

		if (kind === 'script') {
			return lang !== 'docker'
		}

		if (kind === 'approval') {
			if (
				[
					'postgresql',
					'mysql',
					'bigquery',
					'snowflake',
					'mssql',
					'graphql',
					'duckdb',
					'oracledb'
				].includes(lang)
			) {
				return false
			}
			return true
		}

		return false
	}

	let customUi: undefined | FlowBuilderWhitelabelCustomUi = getContext('customUi')
</script>

<div class="p-4 h-full flex flex-col" id="flow-editor-flow-inputs">
	{#if summary == 'Terminate flow'}
		<Alert type="info" title="流程将在这里停止"
			>这是一个带提前停止条件的占位步骤，表达式结果为 true 时会结束流程。</Alert
		>
	{:else}{#if !failureModule && !preprocessorModule}
			<div class="center-center">
				<div class="max-w-min">
					<ToggleButtonGroup bind:selected={kind}>
						{#snippet children({ item })}
							<ToggleButton
								value="script"
								icon={Code}
								label="动作"
								tooltip="动作脚本是普通执行步骤，不属于触发脚本或审批脚本。大多数脚本都属于这一类。"
								{item}
							/>
							{#if !shouldDisableTriggerScripts}
								<ToggleButton
										value="trigger"
										icon={Zap}
										label="触发"
										tooltip="通常作为第一个步骤使用，配合状态和定时任务监听外部系统变化，计算和上次运行之间的差异，再逐条处理。"
									{item}
								/>
							{/if}
							<ToggleButton
								value="approval"
								icon={Check}
								label="审批"
								tooltip="审批步骤会暂停流程，直到指定人员通过恢复接口或审批页面完成处理。"
								{item}
							/>
						{/snippet}
					</ToggleButtonGroup>
				</div>
			</div>
		{/if}
			{#if kind == 'trigger'}
				<div class="mt-2"></div>
				<Alert title="触发脚本" type="info">
					触发脚本用于从外部来源拉取数据，并返回上次运行以来新增的内容，不需要依赖外部 webhook。<br
					/><br />

					触发脚本通常和定时任务、状态数据一起使用，用来和上一次执行结果做对比，并在循环步骤中逐条处理新内容。如果没有新内容，流程会自动跳过。<br
					/><br />

					默认情况下，新增触发器会使用 15 分钟的执行间隔。
				</Alert>
			{/if}

			{#if kind == 'script' && !noEditor && !preprocessorModule}
				<div class="mt-2"></div>
				<Alert title="动作脚本" type="info">
					动作脚本是普通执行步骤，不属于触发脚本或审批脚本。大多数脚本都属于这一类。
				</Alert>
			{/if}

		{#if kind == 'approval'}
				{#if !noEditor}
					<div class="mt-2"></div>
					<Alert title="审批/提示步骤" type="info">
						审批/提示步骤会暂停流程，直到指定人员完成审批或填写表单。详细配置在该步骤的“高级”->“暂停”设置中。提示步骤是一种带输入内容的审批步骤，可以由调用方自行确认。<br
						/><br />
						需要辅助配置时，可打开
						<div class="inline-flex">
							<SuspendDrawer text="审批/提示步骤助手" />
						</div>
					</Alert>
				{:else}
					<div class="text-sm text-secondary">审批/提示步骤会暂停流程，直到指定人员完成处理。</div>
				{/if}
			{/if}
			<h3 class="pb-2 pt-4 flex gap-x-8 flex-wrap">
				<div>
					内联新增<span class="text-blue-500 dark:text-blue-400"
						>{kind == 'script'
							? '动作'
							: kind == 'trigger'
								? '触发'
								: kind == 'approval'
									? '审批'
									: kind}</span
					>
					脚本
					<Tooltip
					documentationLink={kind === 'script'
						? 'https://www.windmill.dev/docs/flows/editor_components#flow-actions'
						: kind === 'trigger'
							? 'https://www.windmill.dev/docs/flows/flow_trigger'
							: kind === 'approval'
								? 'https://www.windmill.dev/docs/flows/flow_approval'
								: 'https://www.windmill.dev/docs/getting_started/flows_quickstart#flow-editor'}
					>
						将脚本直接嵌入流程中，而不是先保存到工作区复用。后续仍然可以把内联脚本保存到工作区。
					</Tooltip>
			</div>
			<DefaultScripts />
		</h3>
		{#if noEditor}
			<div
					class="py-0.5 text-2xs {summary == undefined || summary == ''
						? 'text-red-600'
						: 'text-ternary'}"
					>请先填写摘要，系统会用它生成独立文件名。</div
				>
				<input class="w-full" type="text" bind:value={summary} placeholder="摘要" />
			<div class="pb-2"></div>
		{/if}
		<div class="flex flex-row flex-wrap gap-2" id="flow-editor-action-script">
			{#each langs.filter((lang) => customUi?.languages == undefined || customUi?.languages?.includes(lang?.[1])) as [label, lang] (lang)}
				{#if displayLang(lang, kind)}
					<FlowScriptPicker
						id={`flow-editor-action-script-${lang}`}
						disabled={noEditor && (summary == undefined || summary == '')}
						{label}
						lang={lang == 'docker' ? 'bash' : lang}
						on:click={() => {
							dispatch('new', {
								language: lang == 'docker' ? 'bash' : lang,
								kind,
								subkind: lang == 'docker' ? 'docker' : preprocessorModule ? 'preprocessor' : 'flow',
								summary
							})
						}}
					/>
				{/if}
			{/each}
		</div>

		{#if !failureModule && !preprocessorModule && customUi?.aiSandbox != false}
				<h3 class="pb-2 pt-4">AI 沙盒</h3>
			<div class="flex flex-row flex-wrap gap-2">
				<FlowScriptPicker
					label="Claude Code"
					lang="claudesandbox"
					on:click={() => {
						dispatch('new', {
							language: 'bun',
							kind,
							subkind: 'claudesandbox',
							summary
						})
					}}
				/>
			</div>
		{/if}

			<h3 class="mb-2 mt-6"
				>使用已有<span class="text-blue-500 dark:text-blue-400"
					>{kind == 'script'
						? '动作'
						: kind == 'trigger'
							? '触发'
							: kind == 'approval'
								? '审批'
								: kind}</span
				>脚本</h3
			>
			<WorkspaceScriptPicker displayLock bind:filter {kind} on:pick />
	{/if}
</div>
