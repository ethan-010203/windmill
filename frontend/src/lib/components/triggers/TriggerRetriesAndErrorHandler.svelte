<script lang="ts">
	import type { ErrorHandler, Retry } from '$lib/gen'
	import { enterpriseLicense } from '$lib/stores'
	import { emptyString } from '$lib/utils'
	import Alert from '../common/alert/Alert.svelte'
	import ErrorOrRecoveryHandler from '../ErrorOrRecoveryHandler.svelte'
	import FlowRetries from '../flows/content/FlowRetries.svelte'
	import Tooltip from '../Tooltip.svelte'

	let {
		optionTabSelected,
		itemKind,
		can_write,
		errorHandlerSelected = $bindable(),
		error_handler_path = $bindable(),
		error_handler_args = $bindable(),
		retry = $bindable()
	}: {
		optionTabSelected: 'error_handler' | 'retries' | string
		itemKind: 'script' | 'flow'
		can_write: boolean
		errorHandlerSelected: ErrorHandler
		error_handler_path: string | undefined
		error_handler_args: Record<string, any>
		retry: Retry | undefined
	} = $props()
</script>

{#if ['error_handler', 'retries'].includes(optionTabSelected) && itemKind !== 'script'}
	<Alert type="info" title="仅脚本可用" class="mb-2">
		错误处理器和重试只适用于脚本。流程请使用内置的错误处理和重试配置。
	</Alert>
{:else if optionTabSelected === 'error_handler'}
	<ErrorOrRecoveryHandler
		isEditable={can_write}
		errorOrRecovery="error"
		showScriptHelpText={true}
		bind:handlerSelected={errorHandlerSelected}
		bind:handlerPath={error_handler_path}
		toggleText="出错时通知频道"
		customHandlerKind="script"
		bind:handlerExtraArgs={error_handler_args}
	>
		{#snippet customTabTooltip()}
			<Tooltip>
				<div class="flex gap-20 items-start mt-3">
					<div class="text-sm"
						>以下参数会传递给错误处理器：
						<ul class="mt-1 ml-2">
							<li><b>workspace_id</b>: 触发器所属工作区 ID。</li>
							<li><b>job_id</b>: 出错任务的 UUID。</li>
							<li><b>path</b>: 失败脚本或流程的路径。</li>
							<li><b>is_flow</b>: 执行对象是否为流程。</li>
							<li><b>trigger_path</b>: 触发器路径，格式为 trigger_type/trigger_path。</li>
							<li><b>error</b>: 错误详情。</li>
							<li><b>started_at</b>: 最近一次失败任务的开始时间。</li>
						</ul>
					</div>
				</div>
			</Tooltip>
		{/snippet}</ErrorOrRecoveryHandler
	>
{:else if optionTabSelected === 'retries'}
	{@const disabled = !can_write || emptyString($enterpriseLicense)}
	<FlowRetries bind:flowModuleRetry={retry} {disabled} />
{/if}
