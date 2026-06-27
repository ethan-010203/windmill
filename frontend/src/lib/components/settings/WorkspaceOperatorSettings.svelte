<script lang="ts">
	import { Button } from '$lib/components/common'
	import ToggleButtonGroup from '$lib/components/common/toggleButton-v2/ToggleButtonGroup.svelte'
	import ToggleButton from '$lib/components/common/toggleButton-v2/ToggleButton.svelte'
	import DataTable from '$lib/components/table/DataTable.svelte'
	import Section from '$lib/components/Section.svelte'
	import Head from '$lib/components/table/Head.svelte'
	import Cell from '$lib/components/table/Cell.svelte'
	import { WorkspaceService } from '$lib/gen'
	import { workspaceStore } from '$lib/stores'
	import { sendUserToast } from '$lib/toast'
	import { SaveIcon, EyeIcon, EyeOffIcon } from 'lucide-svelte'
	import { untrack } from 'svelte'

	let operatorWorkspaceSettings = $state({
		runs: true,
		schedules: true,
		resources: true,
		variables: true,
		assets: true,
		triggers: true,
		audit_logs: true,
		groups: true,
		folders: true,
		workers: true
	})

	let originalSettings = $state({ ...untrack(() => operatorWorkspaceSettings) })
	let isChanged = $state(false)
	let currentWorkspace: string | null = $state(null)

	async function saveSettings() {
		console.log('Saving operator settings:', operatorWorkspaceSettings)
		try {
			await WorkspaceService.updateOperatorSettings({
				workspace: $workspaceStore!,
				requestBody: operatorWorkspaceSettings
			})
			originalSettings = { ...operatorWorkspaceSettings }
			isChanged = false
			sendUserToast('操作员设置已保存', false)
		} catch (error) {
			console.error('Error updating operator settings:', error)
			sendUserToast('保存操作员设置失败', true)
		}
	}

	const descriptions = {
		runs: { title: '运行记录', description: '查看运行记录' },
		schedules: { title: '定时任务', description: '查看定时任务' },
		resources: { title: '资源', description: '查看资源' },
		variables: { title: '变量', description: '查看变量' },
		assets: { title: '资产', description: '查看资产' },
		triggers: { title: '触发器', description: '查看所有触发器（HTTP、WebSocket、Kafka）' },
		audit_logs: { title: '审计日志', description: '查看审计日志' },
		groups: { title: '用户组', description: '查看用户组和组成员' },
		folders: { title: '文件夹', description: '查看文件夹' },
		workers: { title: 'Worker', description: '查看 Worker 和 Worker 组' }
	}

	$effect(() => {
		if ($workspaceStore && $workspaceStore !== currentWorkspace) {
			;(async () => {
				currentWorkspace = $workspaceStore
				const settings = await WorkspaceService.getSettings({
					workspace: $workspaceStore
				})
				if (settings.operator_settings !== null) {
					operatorWorkspaceSettings = {
						...operatorWorkspaceSettings,
						...(settings.operator_settings ?? {})
					}
					originalSettings = { ...operatorWorkspaceSettings }
				}
			})()
		}
	})

	$effect(() => {
		isChanged = JSON.stringify(operatorWorkspaceSettings) !== JSON.stringify(originalSettings)
	})

	const allDisabled = $derived(
		Object.values(operatorWorkspaceSettings).every((value) => value === false)
	)
	const allEnabled = $derived(
		Object.values(operatorWorkspaceSettings).every((value) => value === true)
	)
</script>

<Section
	label="操作员设置"
	collapsable={true}
	tooltip="配置操作员在当前工作空间中可以看到的栏目。"
	description="配置操作员在当前工作空间中可以看到的栏目。"
>
	{#snippet action()}
		<Button
			on:click={saveSettings}
			startIcon={{ icon: SaveIcon }}
			disabled={!isChanged}
			variant="accent"
		>
			保存操作员设置
		</Button>
	{/snippet}

	<DataTable tableFixed={true} size="xs">
		<Head>
			<tr>
				<Cell head first>栏目</Cell>
				<Cell head>说明</Cell>
				<Cell head last>
					<ToggleButtonGroup
						bind:selected={
							() => (allDisabled ? 'false' : allEnabled ? 'true' : ''),
							(v) => {
								Object.keys(operatorWorkspaceSettings).forEach((key) => {
									if (v === 'true') operatorWorkspaceSettings[key] = true
									if (v === 'false') operatorWorkspaceSettings[key] = false
								})
							}
						}
					>
						{#snippet children({ item })}
							<ToggleButton icon={EyeIcon} small={true} value={'true'} label="全部启用" {item} />
							<ToggleButton
								icon={EyeOffIcon}
								small={true}
								value={'false'}
								label="全部禁用"
								{item}
							/>
						{/snippet}
					</ToggleButtonGroup>
				</Cell>
			</tr>
		</Head>
		<tbody class="divide-y bg-surface">
			{#each Object.entries(descriptions) as [key, { title, description }]}
				<tr>
					<Cell first>{title}</Cell>
					<Cell>{description}</Cell>
					<Cell last class="pl-8">
						<ToggleButtonGroup
							selected={operatorWorkspaceSettings[key] ? 'on' : 'off'}
							on:selected={({ detail }) => (operatorWorkspaceSettings[key] = detail === 'on')}
						>
							{#snippet children({ item })}
								<ToggleButton icon={EyeIcon} small={true} value={'on'} label="开" {item} />
								<ToggleButton icon={EyeOffIcon} small={true} value={'off'} label="关" {item} />
							{/snippet}
						</ToggleButtonGroup>
					</Cell>
				</tr>
			{/each}
		</tbody>
	</DataTable>
</Section>
