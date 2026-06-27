<script lang="ts">
	import { workspaceStore, usersWorkspaceStore, workspaceColor } from '$lib/stores'
	import Button from '../common/button/Button.svelte'
	import { sendUserToast } from '$lib/toast'
	import { WorkspaceService } from '$lib/gen'
	import Modal from '../common/modal/Modal.svelte'
	import { Pen } from 'lucide-svelte'
	import Toggle from '$lib/components/Toggle.svelte'

	let { open = false }: { open?: boolean } = $props()

	let colorEnabled = $state(false)
	let editingColor = $state<string | undefined>(undefined)
	let lastWorkspace = $state<string | undefined>(undefined)

	$effect(() => {
		if ($workspaceStore !== lastWorkspace) {
			lastWorkspace = $workspaceStore
			editingColor = $workspaceColor ?? undefined
			colorEnabled = !!$workspaceColor
		}
	})

	$effect(() => {
		if (colorEnabled && !editingColor) {
			generateRandomColor()
		}
	})

	function generateRandomColor() {
		const randomColor =
			'#' +
			Math.floor(Math.random() * 16777215)
				.toString(16)
				.padStart(6, '0')
		editingColor = randomColor
	}

	async function changeWorkspaceColor() {
		const colorToSave = colorEnabled && editingColor ? editingColor : undefined
		open = false
		await WorkspaceService.changeWorkspaceColor({
			workspace: $workspaceStore!,
			requestBody: {
				color: colorToSave
			}
		})

		usersWorkspaceStore.set(await WorkspaceService.listUserWorkspaces())
			sendUserToast(`工作区颜色已更新。`)
	}
</script>

<div class="flex flex-col gap-1">
	<p class="font-semibold text-xs text-emphasis">工作区颜色</p>
	<p class="text-xs text-secondary font-normal">
		用于在工作区列表中识别当前工作区的颜色
	</p>
	<div class="flex flex-row gap-0.5 items-center">
		{#if $workspaceColor}
			<div
				class="w-10 h-6 rounded-md border border-gray-300 dark:border-gray-600"
				style="background-color: {$workspaceColor}"
			></div>
		{:else}
			<span class="text-xs font-normal text-primary">未设置颜色</span>
		{/if}
		<Button
			on:click={() => {
				open = true
			}}
			unifiedSize="sm"
			variant="subtle"
			iconOnly
			startIcon={{
				icon: Pen
			}}
		/>
	</div>
</div>

<Modal bind:open title="修改工作空间颜色">
	<div class="flex flex-col gap-4">
		<label class="block">
			<span class="text-secondary text-sm">工作空间颜色</span>
			<div class="flex items-center gap-2">
				<Toggle bind:checked={colorEnabled} options={{ right: '启用' }} />
				{#if colorEnabled}
					<input class="w-10" type="color" bind:value={editingColor} disabled={!colorEnabled} />
				{/if}
				<input
					type="text"
					class="w-24 text-sm"
					bind:value={editingColor}
					disabled={!colorEnabled}
				/>
				<Button on:click={generateRandomColor} size="xs" disabled={!colorEnabled}>随机</Button>
			</div>
		</label>
	</div>

	{#snippet actions()}
		<Button
			size="sm"
			variant="accent"
			on:click={() => {
				changeWorkspaceColor()
			}}
		>
			Save
		</Button>
	{/snippet}
</Modal>
