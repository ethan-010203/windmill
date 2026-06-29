<script lang="ts">
	import ScheduleEditorInner from '$lib/components/triggers/schedules/ScheduleEditorInner.svelte'
	import Description from '$lib/components/Description.svelte'
	import { onMount } from 'svelte'
	let scheduleEditor = $state<ScheduleEditorInner | null>(null)
	let {
		selectedTrigger,
		isFlow,
		path,
		defaultValues = undefined,
		schema,
		customLabel = undefined,
		...restProps
	} = $props()

	function openScheduleEditor(isFlow: boolean, isDraft: boolean) {
		if (isDraft) {
			scheduleEditor?.openNew(isFlow, path, defaultValues)
		} else {
			scheduleEditor?.openEdit(selectedTrigger.path, isFlow, defaultValues)
		}
	}

	onMount(() => {
		selectedTrigger?.type === 'schedule' &&
			scheduleEditor &&
			openScheduleEditor(isFlow, selectedTrigger.isDraft ?? false)
	})
</script>

<ScheduleEditorInner
	useDrawer={false}
	bind:this={scheduleEditor}
	hideTarget
	allowDraft
	trigger={selectedTrigger}
	draftSchema={schema}
	{customLabel}
	{...restProps}
>
	{#snippet docDescription()}
		<div class="flex flex-col gap-2 pb-4">
			<Description>使用 cron 表达式按周期自动运行脚本和流程。</Description>
		</div>
	{/snippet}
</ScheduleEditorInner>
<!-- hideTarget
	hidePath
    {header} -->
