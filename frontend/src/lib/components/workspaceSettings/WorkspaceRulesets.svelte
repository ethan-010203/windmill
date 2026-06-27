<script lang="ts">
	import { Alert, Button, Drawer, DrawerContent, Skeleton } from '$lib/components/common'
	import Dropdown from '$lib/components/DropdownV2.svelte'
	import DataTable from '$lib/components/table/DataTable.svelte'
	import Head from '$lib/components/table/Head.svelte'
	import Cell from '$lib/components/table/Cell.svelte'
	import Row from '$lib/components/table/Row.svelte'
	import RulesetEditor from './RulesetEditor.svelte'
	import { enterpriseLicense, workspaceStore } from '$lib/stores'
	import { sendUserToast } from '$lib/toast'
	import { Plus, Pen, Trash } from 'lucide-svelte'
	import { untrack } from 'svelte'
	import { WorkspaceService, type ProtectionRuleset } from '$lib/gen'

	let rules: ProtectionRuleset[] | undefined = $state<ProtectionRuleset[] | undefined>(undefined)
	let selectedRule: ProtectionRuleset | undefined = $state(undefined)
	let ruleDrawer: Drawer | undefined = $state(undefined)

	async function loadRules() {
		if (!$workspaceStore) return

		try {
			rules = await WorkspaceService.listProtectionRules({ workspace: $workspaceStore })
		} catch (error) {
			console.error('Failed to load protection rules:', error)
			sendUserToast('加载保护规则失败', true)
			rules = []
		}
	}

	$effect(() => {
		if ($workspaceStore) {
			untrack(() => loadRules())
		}
	})

	async function deleteRule(name: string) {
		if (!$workspaceStore) return
		try {
			await WorkspaceService.deleteProtectionRule({
				workspace: $workspaceStore,
				ruleName: name
			})
			await loadRules()
			sendUserToast('保护规则已删除')
		} catch (error) {
			console.error('Failed to delete protection rule:', error)
			sendUserToast('删除保护规则失败', true)
		}
	}

	function getScopeSummary(bypassGroups: string[], bypassUsers: string[]): string {
		const groupCount = bypassGroups.length
		const userCount = bypassUsers.length
		const parts: string[] = []
	if (groupCount > 0) parts.push(`${groupCount} 个用户组`)
	if (userCount > 0) parts.push(`${userCount} 个用户`)
	return parts.length > 0 ? `${parts.join('，')} 可绕过` : '无绕过对象'
	}

	function getEnabledRulesCount(ruleConfig: ProtectionRuleset['rules']): number {
		return ruleConfig.length
	}

	const existingRuleNames = $derived(
		rules?.filter((r) => r.name !== selectedRule?.name).map((r) => r.name) ?? []
	)
</script>

<Drawer bind:this={ruleDrawer}>
	<DrawerContent
		title={selectedRule ? `保护规则：${selectedRule.name}` : '新建保护规则'}
		on:close={ruleDrawer?.closeDrawer}
	>
		<RulesetEditor
			rule={selectedRule}
			existingNames={existingRuleNames}
			onUpdate={() => {
				loadRules()
				ruleDrawer?.closeDrawer()
			}}
		/>
	</DrawerContent>
</Drawer>

{#if !$enterpriseLicense}
	<Alert type="warning" title="当前部署未开放工作区保护规则">
		工作区保护规则用于按用户组和用户配置更细粒度的治理与安全策略，当前部署未开放。
	</Alert>
	<div class="pb-4"></div>
{/if}

<div class="flex flex-row justify-between items-center mb-4">
	<div class="text-xs font-semibold text-emphasis">保护规则</div>
	<Button
		unifiedSize="md"
		variant="accent"
		startIcon={{ icon: Plus }}
		on:click={() => {
			selectedRule = undefined
			ruleDrawer?.openDrawer()
		}}
	>
		新建规则
	</Button>
</div>

<div class="relative mb-20">
	<DataTable containerClass="bg-surface-tertiary">
		<Head>
			<tr>
				<Cell head first>名称</Cell>
				<Cell head>绕过对象</Cell>
				<Cell head>规则</Cell>
				<Cell head last />
			</tr>
		</Head>
		<tbody class="divide-y">
			{#if rules === undefined}
				{#each new Array(3) as _}
					<tr>
						<td colspan="4">
							<Skeleton layout={[[2]]} />
						</td>
					</tr>
				{/each}
			{:else if rules.length === 0}
				<tr>
					<Cell first last colspan={4}>
						<div class="text-center py-8 text-secondary text-sm">
							尚未创建保护规则。点击“新建规则”创建第一条规则。
						</div>
					</Cell>
				</tr>
			{:else}
				{#each rules as rule (rule.name)}
					<Row
						hoverable
						on:click={() => {
							selectedRule = rule
							ruleDrawer?.openDrawer()
						}}
					>
						<Cell first>
							<div class="flex flex-col">
								<span class="text-emphasis text-xs font-semibold">{rule.name}</span>
							</div>
						</Cell>
						<Cell>
							<span class="text-xs text-secondary"
								>{getScopeSummary(rule.bypass_groups, rule.bypass_users)}</span
							>
						</Cell>
						<Cell>
							<span class="text-xs text-secondary">
								已启用 {getEnabledRulesCount(rule.rules)} 条
							</span>
						</Cell>
						<Cell last>
							<Dropdown
								items={[
									{
						displayName: '编辑规则',
										icon: Pen,
										action: (e) => {
											e?.stopPropagation()
											selectedRule = rule
											ruleDrawer?.openDrawer()
										}
									},
									{
						displayName: '删除',
										icon: Trash,
										type: 'delete',
										action: async () => {
											await deleteRule(rule.name)
										}
									}
								]}
							/>
						</Cell>
					</Row>
				{/each}
			{/if}
		</tbody>
	</DataTable>
</div>
