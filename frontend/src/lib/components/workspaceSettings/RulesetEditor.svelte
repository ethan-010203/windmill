<script lang="ts">
	import { Section, Button, Badge } from '$lib/components/common'
	import Toggle from '$lib/components/Toggle.svelte'
	import Label from '$lib/components/Label.svelte'
	import Select from '$lib/components/select/Select.svelte'
	import TextInput from '$lib/components/text_input/TextInput.svelte'
	import { workspaceStore } from '$lib/stores'
	import {
		GroupService,
		UserService,
		WorkspaceService,
		type ProtectionRuleKind,
		type ProtectionRuleset
	} from '$lib/gen'
	import { sendUserToast } from '$lib/toast'
	import { clone } from '$lib/utils'
	import { untrack } from 'svelte'
	import { Save, X, Plus } from 'lucide-svelte'
	import { safeSelectItems } from '$lib/components/select/utils.svelte'

	interface Props {
		rule?: ProtectionRuleset
		existingNames?: string[]
		onUpdate?: () => void
	}

	let { rule, existingNames = [], onUpdate }: Props = $props()

	// Create mode vs Edit mode
	const isCreateMode = $derived(!rule)

	// Helper function to check if a rule is in the array
	const hasRule = (ruleKind: string) => rule?.rules?.includes(ruleKind as any) ?? false

	// Editable state
	let name = $state(untrack(() => rule)?.name ?? '')
	let disableDirectDeployment = $state(hasRule('DisableDirectDeployment'))
	let disableFork = $state(hasRule('DisableWorkspaceForking'))
	let restrictDeployToDeployers = $state(hasRule('RestrictDeployToDeployers'))
	let restrictAnonymousAppDeployment = $state(hasRule('RestrictAnonymousAppDeployment'))
	let selectedGroups = $state<string[]>(
		untrack(() => rule)?.bypass_groups?.map((g) => g.replace('g/', '')) ?? []
	)
	let selectedUsers = $state<string[]>(
		untrack(() => rule)?.bypass_users?.map((u) => u.replace('u/', '')) ?? []
	)

	// Initial state for unsaved changes tracking
	let initialName = $state(untrack(() => rule)?.name ?? '')
	let initialDisableDirectDeployment = $state(hasRule('DisableDirectDeployment'))
	let initialDisableFork = $state(hasRule('DisableWorkspaceForking'))
	let initialRestrictDeployToDeployers = $state(hasRule('RestrictDeployToDeployers'))
	let initialRestrictAnonymousAppDeployment = $state(hasRule('RestrictAnonymousAppDeployment'))
	let initialSelectedGroups = $state<string[]>(
		untrack(() => rule)?.bypass_groups
			? untrack(() => rule)!.bypass_groups.map((g) => g.replace('g/', ''))
			: []
	)
	let initialSelectedUsers = $state<string[]>(
		untrack(() => rule)?.bypass_users
			? untrack(() => rule)!.bypass_users.map((u) => u.replace('u/', ''))
			: []
	)

	// Available options
	let availableGroups = $state<string[]>([])
	let availableUsers = $state<string[]>([])

	// Temporary values for Select dropdowns
	let selectedGroupToAdd = $state<string | undefined>(undefined)
	let selectedUserToAdd = $state<string | undefined>(undefined)

	// Load available groups and users
	async function loadAvailableGroups() {
		const groups = await GroupService.listGroupNames({ workspace: $workspaceStore! })
		availableGroups = groups
	}

	async function loadAvailableUsers() {
		const users = await UserService.listUsernames({ workspace: $workspaceStore! })
		availableUsers = users
	}

	$effect(() => {
		if ($workspaceStore) {
			untrack(() => {
				loadAvailableGroups()
				loadAvailableUsers()
			})
		}
	})

	// Effect to add selected group
	$effect(() => {
		if (selectedGroupToAdd && !selectedGroups.includes(selectedGroupToAdd)) {
			selectedGroups = [...selectedGroups, selectedGroupToAdd]
			untrack(() => {
				selectedGroupToAdd = undefined // Reset for next selection
			})
		}
	})

	// Effect to add selected user
	$effect(() => {
		if (selectedUserToAdd && !selectedUsers.includes(selectedUserToAdd)) {
			selectedUsers = [...selectedUsers, selectedUserToAdd]
			untrack(() => {
				selectedUserToAdd = undefined // Reset for next selection
			})
		}
	})

	// Computed properties
	const hasUnsavedChanges = $derived(
		isCreateMode
			? name.trim() !== '' ||
					disableDirectDeployment ||
					disableFork ||
					restrictDeployToDeployers ||
					restrictAnonymousAppDeployment ||
					selectedGroups.length > 0 ||
					selectedUsers.length > 0
			: name !== initialName ||
					disableDirectDeployment !== initialDisableDirectDeployment ||
					disableFork !== initialDisableFork ||
					restrictDeployToDeployers !== initialRestrictDeployToDeployers ||
					restrictAnonymousAppDeployment !== initialRestrictAnonymousAppDeployment ||
					JSON.stringify([...selectedGroups].sort()) !==
						JSON.stringify([...initialSelectedGroups].sort()) ||
					JSON.stringify([...selectedUsers].sort()) !==
						JSON.stringify([...initialSelectedUsers].sort())
	)

	const nameError = $derived.by(() => {
		if (!name.trim()) return 'Name is required'
		if (isCreateMode) {
			if (existingNames.includes(name)) return 'Name already exists'
		} else {
			if (name !== initialName && existingNames.includes(name)) return 'Name already exists'
		}
		return undefined
	})

	const canSave = $derived(!nameError && hasUnsavedChanges)

	function removeGroup(group: string) {
		selectedGroups = selectedGroups.filter((g) => g !== group)
	}

	function removeUser(user: string) {
		selectedUsers = selectedUsers.filter((u) => u !== user)
	}

	async function create() {
		if (!canSave || !$workspaceStore) return

		try {
			await WorkspaceService.createProtectionRule({
				workspace: $workspaceStore,
				requestBody: {
					name,
					rules: [
						...(disableDirectDeployment ? ['DisableDirectDeployment' as ProtectionRuleKind] : []),
						...(disableFork ? ['DisableWorkspaceForking' as ProtectionRuleKind] : []),
						...(restrictDeployToDeployers
							? ['RestrictDeployToDeployers' as ProtectionRuleKind]
							: []),
						...(restrictAnonymousAppDeployment
							? ['RestrictAnonymousAppDeployment' as ProtectionRuleKind]
							: [])
					],
					bypass_groups: selectedGroups,
					bypass_users: selectedUsers
				}
			})

			sendUserToast('保护规则已创建')
			onUpdate?.()
		} catch (error) {
			console.error('Failed to create protection rule:', error)
			sendUserToast('创建保护规则失败', true)
		}
	}

	async function save() {
		if (!canSave || !$workspaceStore) return

		try {
			await WorkspaceService.updateProtectionRule({
				workspace: $workspaceStore,
				ruleName: initialName,
				requestBody: {
					rules: [
						...(disableDirectDeployment ? ['DisableDirectDeployment' as ProtectionRuleKind] : []),
						...(disableFork ? ['DisableWorkspaceForking' as ProtectionRuleKind] : []),
						...(restrictDeployToDeployers
							? ['RestrictDeployToDeployers' as ProtectionRuleKind]
							: []),
						...(restrictAnonymousAppDeployment
							? ['RestrictAnonymousAppDeployment' as ProtectionRuleKind]
							: [])
					],
					bypass_groups: selectedGroups,
					bypass_users: selectedUsers
				}
			})

			sendUserToast('保护规则已保存')

			// Update initial state
			initialName = name
			initialDisableDirectDeployment = disableDirectDeployment
			initialDisableFork = disableFork
			initialRestrictDeployToDeployers = restrictDeployToDeployers
			initialRestrictAnonymousAppDeployment = restrictAnonymousAppDeployment
			initialSelectedGroups = clone(selectedGroups)
			initialSelectedUsers = clone(selectedUsers)

			onUpdate?.()
		} catch (error) {
			console.error('Failed to save protection rule:', error)
			sendUserToast('保存保护规则失败', true)
		}
	}
</script>

<div class="flex flex-col gap-6 p-4">
	<!-- Name Section -->
	<span class="text-secondary text-sm">
		保护规则最多可能需要 1 分钟生效。
	</span>
	<Section label="规则名称" class="space-y-2">
		<TextInput
			size="md"
			bind:value={name}
			error={nameError}
			inputProps={{
				placeholder: '输入规则名称'
			}}
		/>
		{#if nameError}
			<div class="text-xs text-red-600">{nameError}</div>
		{/if}
	</Section>

	<!-- Bypass Permissions Section -->
	<Section
		label="绕过权限"
		description="选择可以绕过此规则限制的用户组或用户。被选中的对象不会受到下方规则约束。"
		class="space-y-4"
	>
		<!-- Groups -->
		<div class="flex flex-col gap-2">
			<Label class="text-xs">用户组</Label>
			<Select
				bind:value={selectedGroupToAdd}
				items={safeSelectItems(availableGroups.filter((g) => !selectedGroups.includes(g)))}
				placeholder="选择用户组..."
			/>
			{#if selectedGroups.length > 0}
				<div class="flex flex-wrap gap-2 mt-2">
					{#each selectedGroups as group (group)}
						<Badge color="blue" class="flex items-center gap-1">
							{group}
							<button
								type="button"
								onclick={() => removeGroup(group)}
								class="ml-1 hover:text-red-600"
							>
								<X size={14} />
							</button>
						</Badge>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Users -->
		<div class="flex flex-col gap-2">
			<Label class="text-xs">用户</Label>
			<Select
				bind:value={selectedUserToAdd}
				items={safeSelectItems(availableUsers.filter((u) => !selectedUsers.includes(u)))}
				placeholder="选择用户..."
			/>
			{#if selectedUsers.length > 0}
				<div class="flex flex-wrap gap-2 mt-2">
					{#each selectedUsers as user (user)}
						<Badge color="indigo" class="flex items-center gap-1">
							{user}
							<button
								type="button"
								onclick={() => removeUser(user)}
								class="ml-1 hover:text-red-600"
							>
								<X size={14} />
							</button>
						</Badge>
					{/each}
				</div>
			{/if}
		</div>
	</Section>

	<!-- Protection Rules Section -->
	<Section
		label="保护规则"
		description="配置需要强制执行的规则"
		class="space-y-4"
	>
		<div class="flex flex-col gap-4">
			<!-- Disable Direct Deployment -->
			<div class="flex flex-col gap-2">
				<Toggle
					bind:checked={disableDirectDeployment}
					options={{
						right: '禁用直接部署'
					}}
				/>
				<div class="text-xs text-secondary ml-6">
					用户必须通过副本或 Git 分支进行变更，不允许直接编辑。
				</div>
			</div>

			<!-- Disable Fork -->
			<div class="flex flex-col gap-2">
				<Toggle
					bind:checked={disableFork}
					options={{
						right: '禁用工作区复制'
					}}
				/>
				<div class="text-xs text-secondary ml-6">用户无法创建此工作区的副本。</div>
			</div>

			<!-- Restrict deploy to deployers -->
			<div class="flex flex-col gap-2">
				<Toggle
					bind:checked={restrictDeployToDeployers}
					options={{
						right: '仅允许 wm_deployers 部署'
					}}
				/>
				<div class="text-xs text-secondary ml-6">
					只有工作区管理员和 <code>wm_deployers</code> 成员可以部署到此工作区。其他用户仍可复制、浏览并提交审核请求。
				</div>
			</div>

			<!-- Restrict anonymous app deployment -->
			<div class="flex flex-col gap-2">
				<Toggle
					bind:checked={restrictAnonymousAppDeployment}
					options={{
						right: '限制公开应用访问'
					}}
				/>
				<div class="text-xs text-secondary ml-6">
					只有工作区管理员和绕过用户可以将应用设置为无需登录即可访问（匿名执行模式）。已经公开的应用仍可重新部署。
				</div>
			</div>
		</div>
	</Section>

	<!-- Actions -->
	<div class="flex items-center gap-4 pt-4 border-t">
		<Button
			variant="accent"
			unifiedSize="md"
			disabled={!canSave}
			on:click={isCreateMode ? create : save}
			startIcon={{ icon: isCreateMode ? Plus : Save }}
		>
			{isCreateMode ? '创建规则' : '保存规则'}
		</Button>

		{#if hasUnsavedChanges && !isCreateMode}
			<span class="text-xs text-secondary">存在未保存的更改</span>
		{/if}
	</div>
</div>
