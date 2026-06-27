<script lang="ts">
	import Toggle from '$lib/components/Toggle.svelte'
	import Tooltip from '$lib/components/Tooltip.svelte'
	import type { FlowModule } from '$lib/gen'
	import { SecondsInput } from '$lib/components/common'

	import Section from '$lib/components/Section.svelte'

	interface Props {
		flowModule: FlowModule
		disabled?: boolean
	}

	let { flowModule = $bindable(), disabled = false }: Props = $props()

	let enabled = $derived(flowModule.delete_after_secs != null)
</script>

<Section label="Delete after completion">
	{#snippet header()}
		<Tooltip>
			流程完成后，此步骤的日志、参数和结果会在指定延迟后被完全删除。流程运行期间，它们可能会暂时在界面中可见。
			<br />
			这同样适用于执行失败的流程步骤：错误信息也将不可访问。
			<br />
			<br />
			删除不可恢复。设置为 0 表示立即删除。
			{#if disabled}
				<br />
				<br />
				当前部署未开放此选项。
			{/if}
		</Tooltip>
	{/snippet}

	<Toggle
		{disabled}
		size="sm"
		checked={enabled}
		on:change={() => {
			if (enabled) {
				flowModule.delete_after_secs = undefined
			} else {
				flowModule.delete_after_secs = 0
			}
		}}
		options={{
			right: 'Delete logs, arguments and results after the flow is complete'
		}}
	/>
	{#if enabled}
		<div class="mt-2">
			<SecondsInput bind:seconds={flowModule.delete_after_secs} {disabled} size="sm" />
		</div>
	{/if}
</Section>
