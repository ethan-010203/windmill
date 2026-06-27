<script lang="ts">
	import { workspaceStore } from '$lib/stores'
	import Button from '../common/button/Button.svelte'
	import Drawer from '../common/drawer/Drawer.svelte'
	import DrawerContent from '../common/drawer/DrawerContent.svelte'
	import { sendUserToast } from '$lib/toast'
	import { WorkspaceService } from '$lib/gen'
	import type { QuotaInfo } from '$lib/gen'
	import { untrack } from 'svelte'
	import { Trash2 } from 'lucide-svelte'

	type ResourceType = 'scripts' | 'flows' | 'apps'

	let quotas:
		| {
				scripts: QuotaInfo
				flows: QuotaInfo
				apps: QuotaInfo
				variables: QuotaInfo
				resources: QuotaInfo
		  }
		| undefined = $state(undefined)

	let loading = $state(false)
	let pruning = $state(false)
	let drawer: Drawer | undefined = $state()
	let pruneTarget: ResourceType | undefined = $state(undefined)

	$effect(() => {
		if ($workspaceStore) {
			untrack(() => loadQuotas())
		}
	})

	async function loadQuotas() {
		loading = true
		try {
			quotas = await WorkspaceService.getCloudQuotas({ workspace: $workspaceStore! })
		} catch (e) {
			sendUserToast(`加载配额失败：${e}`, true)
		} finally {
			loading = false
		}
	}

	function openPruneDrawer(type: ResourceType) {
		pruneTarget = type
		drawer?.openDrawer()
	}

	async function confirmPrune() {
		if (!pruneTarget) return
		pruning = true
		try {
			const result = await WorkspaceService.pruneVersions({
				workspace: $workspaceStore!,
				requestBody: { resource_type: pruneTarget }
			})
			sendUserToast(`已清理 ${result.pruned} 个旧版本`)
			drawer?.closeDrawer()
			await loadQuotas()
		} catch (e) {
			sendUserToast(`清理失败：${e}`, true)
		} finally {
			pruning = false
		}
	}

	function getPrunableCount(type: ResourceType): number {
		if (!quotas) return 0
		return quotas[type].prunable
	}

	function getPruneDescription(type: ResourceType): string {
		switch (type) {
			case 'scripts':
				return '这将永久删除所有非 HEAD 脚本版本（旧编辑记录）。每个脚本的最新部署版本会保留。由于每次脚本编辑都会创建计入限制的新记录，此操作会直接释放配额空间。'
			case 'flows':
				return '这将永久删除所有非 HEAD 流程版本。每个流程只保留最新版本。此操作会释放存储空间，但不会减少流程数量（配额按唯一流程计数，而不是按版本计数）。'
			case 'apps':
				return '这将永久删除所有非 HEAD 应用版本。每个应用只保留最新版本。此操作会释放存储空间，但不会减少应用数量（配额按唯一应用计数，而不是按版本计数）。'
		}
	}

	const rows: { label: string; key: keyof NonNullable<typeof quotas>; prunable: boolean }[] = [
		{ label: '脚本', key: 'scripts', prunable: true },
		{ label: '流程', key: 'flows', prunable: true },
		{ label: '应用', key: 'apps', prunable: true },
		{ label: '变量', key: 'variables', prunable: false },
		{ label: '资源', key: 'resources', prunable: false }
	]
</script>

<div class="flex flex-col gap-2">
	<p class="font-semibold text-xs text-emphasis">配额</p>
	<p class="text-xs text-secondary font-normal">
		当前工作区的使用量和限制。可清理旧版本释放空间。
	</p>

	{#if loading && !quotas}
		<p class="text-xs text-tertiary">加载中...</p>
	{:else if quotas}
		<div class="border rounded-md overflow-hidden">
			<table class="w-full text-xs">
				<thead>
					<tr class="bg-surface-secondary border-b">
						<th class="text-left px-3 py-2 text-secondary font-medium">资源</th>
						<th class="text-left px-3 py-2 text-secondary font-medium">用量</th>
						<th class="text-right px-3 py-2 text-secondary font-medium">操作</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as row (row.key)}
						{@const info = quotas[row.key]}
						<tr class="border-b last:border-b-0">
							<td class="px-3 py-2 text-primary font-medium">{row.label}</td>
							<td class="px-3 py-2">
								<span
									class={info.used >= info.limit ? 'text-red-500 font-semibold' : 'text-primary'}
								>
									{info.used}
								</span>
								<span class="text-tertiary">/ {info.limit}</span>
							</td>
							<td class="px-3 py-2 text-right">
								{#if row.prunable && info.prunable > 0}
									<Button
										unifiedSize="sm"
										variant="default"
										startIcon={{ icon: Trash2 }}
										on:click={() => openPruneDrawer(row.key as ResourceType)}
									>
										清理 {info.prunable} 个旧版本
									</Button>
								{:else if row.prunable}
									<span class="text-tertiary">没有旧版本</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<Drawer bind:this={drawer}>
	<DrawerContent title="清理旧版本" on:close={drawer?.closeDrawer}>
		{#if pruneTarget}
			<div class="flex flex-col gap-4">
				<p class="text-sm text-primary">
					即将清理 <span class="font-semibold">{getPrunableCount(pruneTarget)}</span>
					个旧版本。
				</p>
				<p class="text-xs text-secondary">
					{getPruneDescription(pruneTarget)}
				</p>
				<p class="text-xs text-red-500 font-medium">此操作无法撤销。</p>
			</div>
		{/if}
		{#snippet actions()}
			<Button variant="accent" on:click={confirmPrune} disabled={pruning}>
				{pruning ? '清理中...' : '确认清理'}
			</Button>
		{/snippet}
	</DrawerContent>
</Drawer>
