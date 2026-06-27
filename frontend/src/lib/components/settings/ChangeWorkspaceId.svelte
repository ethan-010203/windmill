<script lang="ts">
	import { run } from 'svelte/legacy';

	import { workspaceStore, superadmin } from '$lib/stores'
	import Alert from '../common/alert/Alert.svelte'
	import Button from '../common/button/Button.svelte'
	import { sendUserToast } from '$lib/toast'
	import { WorkspaceService } from '$lib/gen'
	import Modal from '../common/modal/Modal.svelte'
	import { Pen } from 'lucide-svelte'
	import { isCloudHosted } from '$lib/cloud'

	let newName = $state('')
	let newId = $state('')
	let checking = $state(false)
	let errorId = $state('')



	async function validateName(id: string): Promise<void> {
		checking = true
		let exists = await WorkspaceService.existsWorkspace({ requestBody: { id } })
		if (exists) {
			errorId = 'ID already exists'
		} else if (id != '' && !/^\w+(-\w+)*$/.test(id)) {
			errorId = 'ID can only contain letters, numbers and dashes and must not finish by a dash'
		} else {
			errorId = ''
		}
		checking = false
	}

	let loading = $state(false)
	async function renameWorkspace() {
		try {
			loading = true
			await WorkspaceService.changeWorkspaceId({
				workspace: $workspaceStore!,
				requestBody: {
					new_name: newName,
					new_id: newId
				}
			})
			open = false

			sendUserToast(`Moved workspace to ${newName}. Old workspace archived. Reloading...`)
			await new Promise((resolve) => setTimeout(resolve, 1000))
			window.location.href = '/workspace_settings?tab=general&workspace=' + newId
		} catch (err) {
			sendUserToast(`Error renaming workspace: ${err}`, true)
		} finally {
			loading = false
		}
	}

	interface Props {
		open?: boolean;
	}

	let { open = $bindable(false) }: Props = $props();
	run(() => {
		newId = newName.toLowerCase().replace(/\s/gi, '-')
	});
	run(() => {
		validateName(newId)
	});
</script>

<div class="flex flex-col gap-1">
	<p class="font-semibold text-xs text-emphasis">工作区 ID</p>
	<p class="text-xs text-secondary font-normal">用于唯一标识工作区的路径标识</p>
	<div class="flex flex-row gap-0.5 items-center">
		<p class="text-xs font-normal text-primary">{$workspaceStore ?? ''}</p>
		{#if !isCloudHosted() || $superadmin}
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
		{/if}
	</div>
</div>

<Modal bind:open title="修改工作空间 ID">
	<div class="flex flex-col gap-4">
		<Alert type="warning" title="会发生什么">
			<ul class="list-disc list-inside text-xs mt-1 space-y-1">
				<li>所有内容（脚本、流程、应用、资源等）都会迁移到新的 ID</li>
				<li>旧工作空间会连同已完成任务、日志和审计历史一起归档</li>
				<li>正在运行的任务会被取消</li>
			</ul>
			<p class="text-xs mt-2">完成后请记得更新 Webhook 地址和 CLI 同步配置。</p>
		</Alert>
		<p class="text-secondary text-xs"
			>当前 ID <br /> <span class="text-emphasis">{$workspaceStore ?? ''}</span></p
		>
		<label class="flex flex-col gap-1">
			<span class="text-emphasis text-xs">新名称</span>
			<input type="text" bind:value={newName} />
		</label>
		<label class="block">
			<span class="text-emphasis text-xs">新 ID</span>
			<input type="text" bind:value={newId} />
			{#if errorId}
				<div class="text-red-500 text-xs mt-1">{errorId}</div>
			{/if}
		</label>
	</div>

	{#snippet actions()}
		<Button
			variant="accent"
			disabled={checking || errorId.length > 0 || !newName || !newId}
			{loading}
			on:click={() => {
				renameWorkspace()
			}}
		>
			Save
		</Button>
	{/snippet}
</Modal>
