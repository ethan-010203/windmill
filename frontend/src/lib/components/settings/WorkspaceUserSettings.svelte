<script lang="ts">
	import AddUser from '$lib/components/AddUser.svelte'
	import { Alert, Badge, Button, Section, Skeleton } from '$lib/components/common'
	import Popover from '$lib/components/meltComponents/Popover.svelte'
	import ToggleButton from '$lib/components/common/toggleButton-v2/ToggleButton.svelte'
	import ToggleButtonGroup from '$lib/components/common/toggleButton-v2/ToggleButtonGroup.svelte'
	import WorkspaceOperatorSettings from '$lib/components/settings/WorkspaceOperatorSettings.svelte'
	import InviteUser from '$lib/components/InviteUser.svelte'
	import SettingsPageHeader from '$lib/components/settings/SettingsPageHeader.svelte'

	import DataTable from '$lib/components/table/DataTable.svelte'
	import Head from '$lib/components/table/Head.svelte'
	import Toggle from '$lib/components/Toggle.svelte'
	import Tooltip from '$lib/components/Tooltip.svelte'
	import type { CancelablePromise, User, UserUsage } from '$lib/gen'
	import { UserService, WorkspaceService, GroupService, type WorkspaceInvite } from '$lib/gen'
	import {
		userStore,
		workspaceStore,
		superadmin,
		globalEmailInvite,
		enterpriseLicense
	} from '$lib/stores'
	import { sendUserToast } from '$lib/toast'
	import { Loader2, Mails, Search, Plus, UserMinus, X, Bot, LogIn } from 'lucide-svelte'
	import Select from '$lib/components/select/Select.svelte'
	import SearchItems from '../SearchItems.svelte'
	import Cell from '../table/Cell.svelte'
	import Row from '../table/Row.svelte'
	import ConfirmationModal from '../common/confirmationModal/ConfirmationModal.svelte'
	import UserOffboardingModal from '$lib/components/UserOffboardingModal.svelte'
	import { isCloudHosted } from '$lib/cloud'
	import { truncate } from '$lib/utils'
	import { onDestroy, untrack } from 'svelte'
	import { goto } from '$lib/navigation'
	import { ArrowRightLeft } from 'lucide-svelte'

	let offboardingUser: string | undefined = $state(undefined)
	let offboardingReassignOnly = $state(false)

	let users: User[] | undefined = $state(undefined)
	let invites: WorkspaceInvite[] = $state([])
	let filteredUsers: User[] | undefined = $state(undefined)
	let userFilter = $state('')
	let auto_invite_domain: string | undefined = $state()
	let operatorOnly: boolean | undefined = $state(undefined)
	let autoAdd: boolean | undefined = $state(false)
	let nbDisplayed = $state(30)

	// Instance group auto-add settings
	let instanceGroups: Array<{ name: string; summary?: string; emails?: string[] }> = $state([])
	let autoAddInstanceGroups: string[] = $state([])
	let autoAddInstanceGroupsRoles: Record<string, string> = $state({})

	// Add new instance group form state
	let selectedNewInstanceGroup: string | undefined = $state(undefined)
	let selectedNewRole: string | undefined = $state('developer')

	// Service account creation

	// Available groups for dropdowns - filter out already configured groups
	let availableGroupItems = $derived(
		instanceGroups
			.filter((group) => !autoAddInstanceGroups.includes(group.name))
			.map((group) => ({
				value: group.name,
				label: group.name + (group.summary ? ` - ${group.summary}` : '')
			}))
	)

	// Sort users so manual users come first, then instance group users
	let sortedUsers = $derived(() => {
		const userList = (filteredUsers || users || []).slice()
		return userList.sort((a: User, b: User) => {
			const aIsInstanceGroup = a.added_via?.source === 'instance_group' ? 1 : 0
			const bIsInstanceGroup = b.added_via?.source === 'instance_group' ? 1 : 0
			return aIsInstanceGroup - bIsInstanceGroup
		})
	})

	let hasNonManualUsers = $derived(
		(filteredUsers || users || []).some(
			(user: User) =>
				user.added_via?.source === 'instance_group' || user.added_via?.source === 'domain'
		)
	)

	// Function to check if a manual user can be converted to a group user
	function canConvertToGroup(user: User): boolean {
		// User must be manually added (not via instance group or domain)
		if (user.added_via?.source === 'instance_group' || user.added_via?.source === 'domain') {
			return false
		}

		// Check if user's email is in any configured instance group
		const userEmail = user.email
		for (const groupName of autoAddInstanceGroups) {
			const group = instanceGroups.find((g) => g.name === groupName)
			if (group && group.emails && group.emails.includes(userEmail)) {
				return true
			}
		}

		return false
	}

	async function loadSettings(): Promise<void> {
		const settings = await WorkspaceService.getSettings({ workspace: $workspaceStore! })
		const autoInvite = settings.auto_invite as
			| {
					enabled?: boolean
					domain?: string
					operator?: boolean
					mode?: string
					instance_groups?: string[]
					instance_groups_roles?: Record<string, string>
			  }
			| undefined
		auto_invite_domain = autoInvite?.enabled ? (autoInvite?.domain ?? '*') : undefined
		operatorOnly = autoInvite?.operator ?? false
		autoAdd = autoInvite?.mode === 'add'
		autoAddInstanceGroups = autoInvite?.instance_groups || []
		autoAddInstanceGroupsRoles = autoInvite?.instance_groups_roles || {}
	}

	let getUsagePromise: CancelablePromise<UserUsage[]> | undefined = undefined

	let usage: Record<string, number> | undefined = $state(undefined)

	async function getUsage() {
		try {
			getUsagePromise = UserService.listUsersUsage({ workspace: $workspaceStore! })
			const res = await getUsagePromise
			usage = res.reduce(
				(acc, { email, executions }) => {
					if (email) {
						acc[email] = executions ?? 0
					}
					return acc
				},
				{} as Record<string, number>
			)
		} catch (e) {
			console.warn(e)
		}
	}

	async function listUsers(): Promise<void> {
		users = await UserService.listUsers({ workspace: $workspaceStore! })
	}

	async function listInvites(): Promise<void> {
		invites = await WorkspaceService.listPendingInvites({ workspace: $workspaceStore! })
	}

	let allowedAutoDomain = $state(false)

	async function getDisallowedAutoDomain() {
		allowedAutoDomain = await WorkspaceService.isDomainAllowed()
	}

	async function loadInstanceGroups(): Promise<void> {
		try {
			instanceGroups = await GroupService.listInstanceGroups()
		} catch (e) {
			console.warn('Failed to load instance groups:', e)
			instanceGroups = []
		}
	}

	async function saveInstanceGroupSettings(): Promise<void> {
		try {
			await WorkspaceService.editInstanceGroups({
				workspace: $workspaceStore ?? '',
				requestBody: {
					groups: autoAddInstanceGroups,
					roles: autoAddInstanceGroupsRoles
				}
			})
			sendUserToast('实例用户组设置已保存')
			// Refresh user list to show newly auto-added users
			listUsers()
		} catch (e) {
			console.error('Failed to save instance group settings:', e)
			sendUserToast('保存设置失败', true)
		}
	}

	async function addInstanceGroup(): Promise<void> {
		if (!selectedNewInstanceGroup || !selectedNewRole) return

		const groupToAdd = selectedNewInstanceGroup
		const roleToAdd = selectedNewRole

		try {
			autoAddInstanceGroups = [...autoAddInstanceGroups, groupToAdd]
			autoAddInstanceGroupsRoles[groupToAdd] = roleToAdd

			// Reset form
			selectedNewInstanceGroup = undefined
			selectedNewRole = 'developer'

			await saveInstanceGroupSettings()
		} catch (e) {
			// Rollback on error
			autoAddInstanceGroups = autoAddInstanceGroups.filter((g) => g !== groupToAdd)
			delete autoAddInstanceGroupsRoles[groupToAdd]
			sendUserToast('添加实例用户组失败', true)
		}
	}

	async function removeInstanceGroup(groupName: string): Promise<void> {
		const previousGroups = [...autoAddInstanceGroups]
		const previousRole = autoAddInstanceGroupsRoles[groupName]

		try {
			autoAddInstanceGroups = autoAddInstanceGroups.filter((g) => g !== groupName)
			delete autoAddInstanceGroupsRoles[groupName]
			await saveInstanceGroupSettings()
		} catch (e) {
			// Rollback on error
			autoAddInstanceGroups = previousGroups
			if (previousRole) {
				autoAddInstanceGroupsRoles[groupName] = previousRole
			}
			sendUserToast('移除实例用户组失败', true)
		}
	}

	async function updateGroupRole(groupName: string, role: string): Promise<void> {
		const previousRole = autoAddInstanceGroupsRoles[groupName]

		try {
			autoAddInstanceGroupsRoles[groupName] = role
			await saveInstanceGroupSettings()
		} catch (e) {
			// Rollback on error
			autoAddInstanceGroupsRoles[groupName] = previousRole
			sendUserToast('更新角色失败', true)
		}
	}

	async function convertUserToGroup(username: string): Promise<void> {
		try {
			await UserService.convertUserToGroup({
				workspace: $workspaceStore ?? '',
				username
			})
			sendUserToast('用户已转换为用户组用户')
			listUsers()
		} catch (e) {
			console.error('Failed to convert user:', e)
			sendUserToast('转换用户失败', true)
		}
	}

	let domain = $derived($userStore?.email.split('@')[1])

	$effect(() => {
		if ($workspaceStore) {
			untrack(() => {
				getDisallowedAutoDomain()
				listUsers()
				getUsage()
				listInvites()
				loadSettings()
				loadInstanceGroups()
			})
		}
	})

	onDestroy(() => {
		try {
			getUsagePromise?.cancel()
		} catch (e) {
			console.warn(e)
		}
	})

	let removeInstanceGroupConfirmedCallback: (() => void) | undefined = $state(undefined)
	let convertConfirmedCallback: (() => void) | undefined = $state(undefined)

	// Auto-add/invite confirmation modal states
	let autoAddConfirmCallback: (() => void) | undefined = $state(undefined)
	let autoInviteDisableConfirmCallback: (() => void) | undefined = $state(undefined)
	let switchToAutoAddConfirmCallback: (() => void) | undefined = $state(undefined)

	async function removeAllInvitesFromDomain() {
		await Promise.all(
			invites
				.filter((x) =>
					isCloudHosted() ? x.email.endsWith('@' + (auto_invite_domain ?? '')) : true
				)
				.map(({ email, is_admin, operator }) =>
					WorkspaceService.deleteInvite({
						workspace: $workspaceStore ?? '',
						requestBody: {
							email,
							is_admin,
							operator
						}
					})
				)
		)
	}

	let nbInviteDisplayed = $state(50)

	async function inviteUser(email: string, selected: 'operator' | 'developer' | 'admin') {
		try {
			await WorkspaceService.inviteUser({
				workspace: $workspaceStore!,
				requestBody: {
					email,
					is_admin: selected == 'admin',
					operator: selected == 'operator'
				}
			})
			sendUserToast(`已邀请 ${email}`)
		} catch (e) {
			console.error('Failed to invite user:', e)
			sendUserToast('邀请用户失败', true)
		}

		if (!(await UserService.existsEmail({ email }))) {
			let isSuperadmin = $superadmin
			if (!isCloudHosted()) {
				sendUserToast(
					`用户 ${email} 尚未在实例中注册。${
						!isSuperadmin
							? `如果未使用 SSO，请联系管理员将 ${email} 添加到实例`
							: ''
					}`,
					true,
					isSuperadmin
						? [
								{
									label: '添加用户到实例',
									callback: () => {
										$globalEmailInvite = email
										goto('#superadmin-settings')
									}
								}
							]
						: []
				)
			}
		}

		listInvites()
	}

	async function updateAutoInvite(enable: boolean) {
		// Cleanup invites if auto add is enabled
		if (enable && autoAdd) {
			await removeAllInvitesFromDomain()
		}
		const updateType = enable ? (autoInviteOrAddEnabled ? 'update' : 'enable') : 'disable'
		try {
			// await removeAllInvitesFromDomain()
			await WorkspaceService.editAutoInvite({
				workspace: $workspaceStore ?? '',
				requestBody: enable
					? {
							operator: operatorOnly ?? false,
							invite_all: !isCloudHosted(),
							auto_add: autoAdd
						}
					: {
							operator: undefined,
							auto_add: undefined
						}
			})
			const message =
				updateType === 'update'
					? `自动${autoAdd ? '加入' : '邀请'}已更新`
					: updateType === 'enable'
						? `自动${autoAdd ? '加入' : '邀请'}已启用`
						: `自动${autoAdd ? '加入' : '邀请'}已禁用`
			sendUserToast(message)
		} catch (e) {
			console.error('Failed to update auto invite:', e)
			sendUserToast('更新自动邀请设置失败', true)
		}
		loadSettings()
		listInvites()
		listUsers()
	}

	const autoInviteOrAddEnabled = $derived(auto_invite_domain != undefined)

	// Legacy auto-invite: user already has auto-invite enabled (not auto-add) on a non-cloud instance
	// This preserves their existing setup even though auto-invite is deprecated for new setups
	const isLegacyAutoInvite = $derived(autoInviteOrAddEnabled && !autoAdd && !isCloudHosted())

	// Show auto-invite toggle only for:
	// - Cloud hosted users (always available)
	// - Legacy users who already have auto-invite enabled (preserve existing setup)
	const showAutoInviteToggle = $derived(isCloudHosted() || isLegacyAutoInvite)

	// Display mode for labels: for non-cloud, non-legacy users, always show "add"
	// For cloud or legacy users, show based on actual autoAdd setting
	const displayMode = $derived.by(() => {
		if (!isCloudHosted() && !isLegacyAutoInvite) {
			return 'add'
		}
		return autoAdd ? 'add' : 'invite'
	})

	const isAdminsWorkspaceWithoutEE = $derived($workspaceStore === 'admins' && !$enterpriseLicense)
</script>

<SearchItems
	filter={userFilter}
	items={users}
	bind:filteredItems={filteredUsers}
	f={(x) => x.email + ' ' + x.name + ' ' + x.company}
/>

<SettingsPageHeader
	title="成员 {(filteredUsers?.length ?? users?.length) != undefined
		? `(${filteredUsers?.length ?? users?.length})`
		: ''}"
	description="添加工作空间成员并管理成员角色，也可以配置自动加入规则。"
/>

{#if isAdminsWorkspaceWithoutEE}
	<Alert type="info" title="管理员工作空间">
		管理员工作空间仅供超级管理员使用。只有拥有超级管理员权限的用户才能访问，不能手动添加或邀请成员。
	</Alert>
{/if}

<Section>
	{#snippet action()}
		<div class="flex flex-row items-center gap-2 relative whitespace-nowrap w-full">
			<input placeholder="筛选成员" bind:value={userFilter} class="input !pl-8 !w-56" />
			<Search class="absolute left-2" size={14} />

			{#if !isAdminsWorkspaceWithoutEE}
				<Popover
					floatingConfig={{ strategy: 'absolute', placement: 'bottom-end' }}
					usePointerDownOutside
				>
					{#snippet trigger()}
						<Button
							variant="default"
							unifiedSize="md"
							nonCaptureEvent={true}
							startIcon={{ icon: Mails }}
							>自动{displayMode === 'invite' ? '邀请' : '加入'}：{autoInviteOrAddEnabled ? '开' : '关'}
						</Button>
					{/snippet}
					{#snippet content()}
						<div class="flex flex-col items-start p-4 min-w-[320px] max-w-sm">
							{#if showAutoInviteToggle}
								<div class="text-xs mb-1 text-primary"
									>模式 <Tooltip>选择邀请用户，还是直接将用户添加到工作空间。</Tooltip>
								</div>
								<ToggleButtonGroup
									selected={displayMode}
									on:selected={async (e) => {
										const switchingToAdd = e.detail === 'add' && !autoAdd

										// If switching from invite to add on non-cloud, show confirmation with warning
										if (switchingToAdd && isLegacyAutoInvite) {
											switchToAutoAddConfirmCallback = async () => {
												autoAdd = true
												if (autoInviteOrAddEnabled) {
													await updateAutoInvite(true)
												}
											}
										} else {
											autoAdd = e.detail === 'add'
											if (autoInviteOrAddEnabled) {
												await updateAutoInvite(true)
											}
										}
									}}
								>
									{#snippet children({ item })}
										<ToggleButton value="invite" small label="自动邀请" {item} />
										<ToggleButton value="add" small label="自动加入" {item} />
									{/snippet}
								</ToggleButtonGroup>

								{#if isLegacyAutoInvite && !autoAdd}
									<div class="mt-3 w-full">
										<Alert type="warning" size="xs" title="旧模式">
											自动邀请已不推荐使用。切换到自动加入后，将永久禁用此工作空间的自动邀请。
										</Alert>
									</div>
								{/if}

								<div class="mt-6"></div>
							{/if}

							<span class="text-xs mb-1">角色 <Tooltip>自动加入用户的角色</Tooltip></span>
							<ToggleButtonGroup
								selected={operatorOnly ? 'operator' : 'developer'}
								on:selected={async (e) => {
									operatorOnly = e.detail === 'operator'
									if (auto_invite_domain != undefined) {
										await updateAutoInvite(true)
									}
								}}
							>
								{#snippet children({ item })}
									<ToggleButton
										value="operator"
										small
										label="操作员"
										tooltip="操作员只能执行和查看当前工作空间中对其可见的脚本、流程和应用。"
										{item}
									/>
									<ToggleButton
										value="developer"
										small
										label="开发者"
										tooltip="开发者可以执行和查看脚本、流程和应用，也可以创建新内容，并编辑其路径权限允许的内容。"
										{item}
									/>
								{/snippet}
							</ToggleButtonGroup>

							<div class="mt-6">
								<Toggle
									checked={autoInviteOrAddEnabled}
									on:change={async (e) => {
										const enabling = e.detail

										if (enabling) {
											// Non-cloud users without legacy auto-invite: force auto-add mode
											if (!isCloudHosted() && !isLegacyAutoInvite) {
												autoAdd = true
											}

											// Show confirmation when enabling auto-add
											if (autoAdd || (!isCloudHosted() && !showAutoInviteToggle)) {
												autoAddConfirmCallback = async () => {
													await updateAutoInvite(true)
												}
											} else {
												await updateAutoInvite(true)
											}
										} else {
											// Disabling: show confirmation if currently using auto-invite (legacy)
											if (isLegacyAutoInvite) {
												autoInviteDisableConfirmCallback = async () => {
													await updateAutoInvite(false)
												}
											} else {
												await updateAutoInvite(false)
											}
										}
									}}
									disabled={isCloudHosted() && !allowedAutoDomain}
									options={{
										right: isCloudHosted()
											? `Auto-${displayMode} anyone from ${
													autoInviteOrAddEnabled ? auto_invite_domain : domain
												}`
											: `Auto-${displayMode} anyone joining the instance`
									}}
								/>
							</div>
							{#if isCloudHosted() && !allowedAutoDomain}
								<div class="text-red-400 text-xs">{domain} domain not allowed for auto-add</div>
							{/if}
						</div>
					{/snippet}
				</Popover>

				{#if instanceGroups.length > 0}
					<Popover
						floatingConfig={{ strategy: 'absolute', placement: 'bottom-end' }}
						usePointerDownOutside
					>
						{#snippet trigger()}
							<Button
								color={autoAddInstanceGroups.length > 0 ? 'green' : 'gray'}
								variant="border"
								size="xs"
								nonCaptureEvent={true}
								startIcon={{ icon: Mails }}
								>Instance groups: {autoAddInstanceGroups.length}
							</Button>
						{/snippet}
						{#snippet content()}
							<div class="flex flex-col p-4 min-w-[500px]">
								<div class="flex flex-col gap-4">
									<span class="text-sm leading-6 font-semibold">自动加入实例用户组</span>

									<!-- Add new instance group form -->
									{#if availableGroupItems.length > 0}
										<div class="flex w-full mt-1 gap-2 items-end justify-between">
											<div class="flex gap-2 items-end">
												<div class="flex flex-col gap-1">
													<span class="text-xs text-primary">实例用户组</span>
													<Select
														items={availableGroupItems}
														placeholder="选择用户组"
														bind:value={selectedNewInstanceGroup}
														class="max-w-[160px]"
														disablePortal={true}
													/>
												</div>

												<div class="flex flex-col gap-1">
													<span class="text-xs text-primary">角色</span>
													<ToggleButtonGroup
														selected={selectedNewRole}
														on:selected={(e) => {
															selectedNewRole = e.detail
														}}
													>
														{#snippet children({ item })}
															<ToggleButton
																value="operator"
																small
																label="操作员"
																tooltip="操作员只能执行和查看当前工作空间中对其可见的脚本、流程和应用。"
																{item}
															/>
															<ToggleButton
																value="developer"
																small
																label="开发者"
																tooltip="开发者可以执行和查看脚本、流程和应用，也可以创建新内容，并编辑其路径权限允许的内容。"
																{item}
															/>
															<ToggleButton
																value="admin"
																small
																label="管理员"
																tooltip="管理员拥有当前工作空间的完整控制权，包括管理用户、编辑实体和控制权限。"
																{item}
															/>
														{/snippet}
													</ToggleButtonGroup>
												</div>
											</div>

											<Button
												color="blue"
												size="xs"
												startIcon={{ icon: Plus }}
												disabled={!selectedNewInstanceGroup || !selectedNewRole}
												onclick={addInstanceGroup}
											>
												添加
											</Button>
										</div>
									{/if}

									<!-- Configured groups table -->
									{#if autoAddInstanceGroups.length > 0}
										<div class="flex flex-col gap-2">
											<p class="text-sm font-medium text-secondary">已配置用户组：</p>
											<div class="flex flex-col gap-1">
												<table class="w-full text-sm">
													<thead>
														<tr class="text-left text-xs text-primary">
															<th class="pb-2 w-1/2">用户组</th>
															<th class="pb-2 w-1/4">角色</th>
															<th class="pb-2 w-1/4"></th>
														</tr>
													</thead>
													<tbody>
														{#each autoAddInstanceGroups as groupName (groupName)}
															{@const group = instanceGroups.find((g) => g.name === groupName)}
															<tr class="border-t border-gray-200 dark:border-gray-700">
																<td class="py-2">
																	<div class="font-medium">{groupName}</div>
																	{#if group?.summary}
																		<div class="text-xs text-primary">{group.summary}</div>
																	{/if}
																</td>
																<td class="py-2">
																	<div>
																		<ToggleButtonGroup
																			selected={autoAddInstanceGroupsRoles[groupName] ||
																				'developer'}
																			on:selected={async (e) => {
																				autoAddInstanceGroupsRoles[groupName] = e.detail
																				await updateGroupRole(groupName, e.detail)
																			}}
																		>
																			{#snippet children({ item })}
																				<ToggleButton
																					value="operator"
																					small
																					label="操作员"
																					tooltip="操作员只能执行和查看当前工作空间中对其可见的脚本、流程和应用。"
																					{item}
																				/>
																				<ToggleButton
																					value="developer"
																					small
																					label="开发者"
																					tooltip="开发者可以执行和查看脚本、流程和应用，也可以创建新内容，并编辑其路径权限允许的内容。"
																					{item}
																				/>
																				<ToggleButton
																					value="admin"
																					small
																					label="管理员"
																					tooltip="管理员拥有当前工作空间的完整控制权，包括管理用户、编辑实体和控制权限。"
																					{item}
																				/>
																			{/snippet}
																		</ToggleButtonGroup>
																	</div>
																</td>
																<td class="py-2">
																	<div class="flex justify-end">
																		<Button
																			color="light"
																			variant="contained"
																			btnClasses="text-red-500"
																			size="xs"
																			spacingSize="xs2"
																			onclick={() => {
																				removeInstanceGroupConfirmedCallback = async () => {
																					await removeInstanceGroup(groupName)
																				}
																			}}
																		>
																			Remove
																		</Button>
																	</div>
																</td>
															</tr>
														{/each}
													</tbody>
												</table>
											</div>
										</div>
									{:else}
										<div class="text-center text-primary text-sm py-4">
											No instance groups configured for auto-add
										</div>
									{/if}
								</div>
							</div>
						{/snippet}
					</Popover>
				{/if}

				{#if showAutoInviteToggle}
					<InviteUser {inviteUser} />
				{/if}

				<AddUser
					on:new={() => {
						listUsers()
						listInvites()
					}}
				/>
			{/if}
		</div>
	{/snippet}

	<DataTable
		shouldLoadMore={(filteredUsers?.length ?? 0) > 30}
		loadMore={30}
		on:loadMore={() => {
			nbDisplayed += 30
		}}
	>
		<Head>
			<tr>
				<Cell head first>邮箱</Cell>
				<Cell head>用户名</Cell>
				{#if hasNonManualUsers}
					<Cell head>
						加入来源
						<Tooltip>
							显示用户加入工作空间的方式：手动添加、通过域名自动加入，或通过实例用户组加入。
						</Tooltip>
					</Cell>
				{/if}

				<Cell head>
					执行次数（<abbr title="过去 1 周">1 周</abbr>）
					<Tooltip>
						脚本每运行一次记为 1 次，超过第一秒后每秒额外计 1 次。
					</Tooltip>
				</Cell>
				<Cell head>角色</Cell>
				<Cell head>启用</Cell>
				<Cell head last>
					<span class="sr-only">操作</span>
				</Cell>
			</tr>
		</Head>
		<tbody>
			{#if filteredUsers}
				{#each sortedUsers().slice(0, nbDisplayed) as user, index (user.email)}
					{@const { email, username, is_admin, operator, disabled, added_via } = user}
					<!-- Add separator between manual users and instance group users -->
					{#if hasNonManualUsers && index > 0 && sortedUsers()[index - 1]?.added_via?.source !== 'instance_group' && added_via?.source === 'instance_group'}
						<tr class="bg-surface-secondary">
							<td colspan={hasNonManualUsers ? 8 : 7} class="px-4 py-2">
								<div class="text-xs text-emphasis font-semibold">实例用户组用户</div>
							</td>
						</tr>
					{/if}
					<tr class={index % 2 === 0 ? 'bg-surface-tertiary' : 'bg-surface'}>
						<Cell first>
							{#if user.is_service_account}
								<span class="flex items-center gap-1.5 max-w-[150px]" title={email}>
									<Bot size={16} class="text-blue-500 shrink-0" />
									<span class="truncate">{email}</span>
								</span>
							{:else}
								<a href="mailto:{email}" class="block truncate max-w-[150px]" title={email}
									>{email}</a
								>
							{/if}
						</Cell>
						<Cell
							><span class="block truncate max-w-[120px]" title={username}>{username}</span></Cell
						>
						{#if hasNonManualUsers}
							<Cell>
								<div class="flex items-center gap-2">
									{#if added_via?.source === 'instance_group'}
										<Badge color="blue">用户组</Badge>
										<span>{truncate(added_via.group || '未知', 20)}</span>
									{:else if added_via?.source === 'domain'}
										<Badge color="blue">自动加入</Badge>
									{:else}
										<Badge color="blue">手动</Badge>
									{/if}
								</div>
							</Cell>
						{/if}
						<Cell
							>{#if usage != undefined}{usage[email] ?? 0}{:else}<Loader2
									size={14}
									class="animate-spin"
								/>{/if}</Cell
						>
						<Cell>
							<div>
								{#if added_via?.source === 'instance_group'}
									<div class="flex items-center gap-1">
										<span class="rounded-md text-xs px-2 py-1 bg-surface shadow-md font-bold">
											{is_admin ? '管理员' : operator ? '操作员' : '开发者'}
										</span>
										<Tooltip>角色由上方实例用户组配置管理。</Tooltip>
									</div>
								{:else}
									<ToggleButtonGroup
										selected={is_admin ? 'admin' : operator ? 'operator' : 'developer'}
										on:selected={async (e) => {
											if (is_admin && email == $userStore?.email && e.detail != 'admin') {
												sendUserToast(
													'管理员不能降级自己，请让其他管理员操作',
													true
												)
												e.preventDefault()
												listUsers()
												return
											}
											const body =
												e.detail == 'admin'
													? { is_admin: true, operator: false }
													: e.detail == 'operator'
														? { is_admin: false, operator: true }
														: { is_admin: false, operator: false }
											await UserService.updateUser({
												workspace: $workspaceStore ?? '',
												username,
												requestBody: body
											})
											listUsers()
										}}
									>
										{#snippet children({ item })}
											<ToggleButton
												value="operator"
												small
												label="操作员"
												tooltip="操作员只能执行和查看当前工作空间中对其可见的脚本、流程和应用。"
												{item}
											/>

											<ToggleButton
												value="developer"
												small
												label="开发者"
												tooltip="开发者可以执行和查看脚本、流程和应用，也可以创建新内容，并编辑其路径权限允许的内容。"
												{item}
											/>

											<ToggleButton
												value="admin"
												small
												label="管理员"
												tooltip="管理员拥有当前工作空间的完整控制权，包括管理用户、编辑实体和控制权限。"
												{item}
											/>
										{/snippet}
									</ToggleButtonGroup>
								{/if}
							</div>
						</Cell>
						<Cell>
							<Toggle
								checked={!disabled}
								on:change={async (e) => {
									try {
										await UserService.updateUser({
											workspace: $workspaceStore ?? '',
											username,
											requestBody: {
												disabled: !disabled
											}
										})
										sendUserToast(`用户 ${username} 已${disabled ? '启用' : '禁用'}`)
										listUsers()
									} catch (e) {
										console.error('Failed to update user status:', e)
										sendUserToast('更新用户状态失败', true)
									}
								}}
								size="xs"
							/>
						</Cell>
						<Cell>
							<div class="flex gap-1">
								{#if user.is_service_account && $userStore?.is_admin}
									<Button
										unifiedSize="sm"
										variant="default"
										startIcon={{ icon: LogIn }}
										disabled={!$enterpriseLicense}
										title={!$enterpriseLicense ? '当前部署未开放此功能' : undefined}
										onClick={async () => {
											try {
												// Backend sets the impersonation cookie and returns the old token
												const oldToken = await UserService.impersonateServiceAccount({
													workspace: $workspaceStore ?? '',
													requestBody: { username }
												})
												if (oldToken) {
													sessionStorage.setItem('pre_impersonation_token', oldToken)
													sessionStorage.setItem('pre_impersonation_email', $userStore?.email ?? '')
												}
												window.location.href = '/'
											} catch (e) {
												sendUserToast('模拟登录服务账号失败', true)
											}
										}}
									>
										模拟登录
									</Button>
								{/if}
								{#snippet removeUserButton(disabled: boolean)}
									<Button
										unifiedSize="sm"
										variant="subtle"
										destructive
										{disabled}
										onClick={() => {
											offboardingUser = username
											offboardingReassignOnly = false
										}}
										startIcon={{ icon: UserMinus }}
									>
										Remove
									</Button>
								{/snippet}

								{#if added_via?.source === 'instance_group'}
									<div class="flex items-center gap-1">
										{@render removeUserButton(true)}
										<Tooltip
											>Cannot remove users synced from instance groups. Either disable the user or
											remove them from the SCIM group.</Tooltip
										>
									</div>
								{:else if canConvertToGroup(user)}
									<Button
										variant="accent"
										unifiedSize="sm"
										on:click={() => {
											convertConfirmedCallback = async () => {
												await convertUserToGroup(username)
											}
										}}
									>
										Convert
									</Button>
								{:else}
									<div class="flex items-center gap-1">
										<Button
											unifiedSize="sm"
											variant="subtle"
											onClick={() => {
												offboardingUser = username
												offboardingReassignOnly = true
											}}
											startIcon={{ icon: ArrowRightLeft }}
										>
											Reassign
										</Button>
										{@render removeUserButton(false)}
									</div>
								{/if}
							</div>
						</Cell>
					</tr>
				{/each}
			{:else}
				{#each new Array(6) as _}
					<tr class="border">
						<td colspan={6}>
							<Skeleton layout={[[4]]} />
						</td>
					</tr>
				{/each}
			{/if}
		</tbody>
	</DataTable>
</Section>

<div class="pt-12"></div>

<WorkspaceOperatorSettings />

<div class="pt-12"></div>

{#if invites?.length > 0}
	<Section
		label="邀请 ({invites.length ?? ''})"
		tooltip="管理当前工作空间的邀请。"
	>
		{#snippet action()}
			{#if showAutoInviteToggle && !isAdminsWorkspaceWithoutEE}
				<div class="flex gap-2 items-center">
					<InviteUser {inviteUser} />
				</div>
			{/if}
		{/snippet}
		<DataTable>
			<Head>
				<tr>
					<Cell head first>邮箱</Cell>
					<Cell head>角色</Cell>
					<Cell head last><span class="sr-only">操作</span></Cell>
				</tr>
			</Head>
			<tbody class="divide-y bg-surface">
				{#if invites?.length > 0}
					{#each invites.slice(0, nbInviteDisplayed) as { email, is_admin, operator }}
						<Row>
							<Cell first>{email}</Cell>
							<Cell>
								<div>
									<ToggleButtonGroup
										selected={is_admin ? 'admin' : operator ? 'operator' : 'developer'}
										on:selected={async (e) => {
											const body =
												e.detail == 'admin'
													? { is_admin: true, operator: false }
													: e.detail == 'operator'
														? { is_admin: false, operator: true }
														: { is_admin: false, operator: false }
											await WorkspaceService.inviteUser({
												workspace: $workspaceStore ?? '',
												requestBody: {
													email,
													...body
												}
											})
											listUsers()
										}}
									>
										{#snippet children({ item })}
											<ToggleButton
												value="operator"
												small
												label="操作员"
												tooltip="操作员只能执行和查看当前工作空间中对其可见的脚本、流程和应用。"
												{item}
											/>

											<ToggleButton
												value="developer"
												small
												label="开发者"
												tooltip="开发者可以执行和查看脚本、流程和应用，也可以创建新内容，并编辑其路径权限允许的内容。"
												{item}
											/>

											<ToggleButton
												value="admin"
												small
												label="管理员"
												tooltip="管理员拥有当前工作空间的完整控制权，包括管理用户、编辑实体和控制权限。"
												{item}
											/>
										{/snippet}
									</ToggleButtonGroup>
								</div>
							</Cell>
							<Cell last>
								<Button
									variant="default"
									destructive
									unifiedSize="sm"
									startIcon={{ icon: X }}
									btnClasses="w-fit"
									onClick={async () => {
										await WorkspaceService.deleteInvite({
											workspace: $workspaceStore ?? '',
											requestBody: {
												email,
												is_admin,
												operator
											}
										})
										listInvites()
									}}
								>
									Cancel invite
								</Button>
							</Cell>
						</Row>
					{/each}
				{:else}
					<tr>
						<td colspan="3" class="text-center py-8">
							<div class="text-xs text-secondary"> No invites yet </div>
						</td>
					</tr>
				{/if}
			</tbody>
		</DataTable>
		{#if invites && invites?.length > 50 && nbInviteDisplayed < invites.length}
			<span class="text-xs"
				>{nbInviteDisplayed} invites out of {invites.length}
				<button class="ml-4" onclick={() => (nbInviteDisplayed += 50)}>load 50 more</button></span
			>
		{/if}
	</Section>
{/if}
{#if offboardingUser}
	<UserOffboardingModal
		open={offboardingUser != null}
		username={offboardingUser}
		reassignOnly={offboardingReassignOnly}
		onClose={() => {
			offboardingUser = undefined
		}}
		onComplete={() => {
			offboardingUser = undefined
			listUsers()
		}}
	/>
{/if}

<div class="[&>div]:!z-[5002]">
	<ConfirmationModal
		open={Boolean(removeInstanceGroupConfirmedCallback)}
		title="移除实例用户组"
		confirmationText="移除"
		on:canceled={() => {
			removeInstanceGroupConfirmedCallback = undefined
		}}
		on:confirmed={() => {
			if (removeInstanceGroupConfirmedCallback) {
				removeInstanceGroupConfirmedCallback()
			}
			removeInstanceGroupConfirmedCallback = undefined
		}}
	>
		<div class="flex flex-col w-full space-y-4">
			<span
				>确定要从自动加入配置中移除此实例用户组吗？这不会移除已经通过该用户组加入的用户。</span
			>
		</div>
	</ConfirmationModal>
</div>

<ConfirmationModal
	open={Boolean(convertConfirmedCallback)}
	title="转换为用户组用户"
	confirmationText="转换"
	on:canceled={() => {
		convertConfirmedCallback = undefined
	}}
	on:confirmed={() => {
		if (convertConfirmedCallback) {
			convertConfirmedCallback()
		}
		convertConfirmedCallback = undefined
	}}
>
	<div class="flex flex-col w-full space-y-4">
		<span>确定要将此用户转换为用户组用户吗？</span>
		<span class="text-sm text-secondary">此操作会：</span>
		<ul class="text-sm text-secondary list-disc ml-4 space-y-1">
			<li>根据实例用户组配置调整该用户角色</li>
			<li>让该用户角色由实例用户组设置管理</li>
			<li>阻止手动修改该用户角色</li>
		</ul>
	</div>
</ConfirmationModal>

<!-- Auto-add/invite confirmation modals - z-index to appear above popover -->
<div class="[&>div]:!z-[5002]">
	<ConfirmationModal
		open={Boolean(autoAddConfirmCallback)}
		title="启用自动加入"
		confirmationText="启用"
		on:canceled={() => {
			autoAddConfirmCallback = undefined
		}}
		on:confirmed={() => {
			if (autoAddConfirmCallback) {
				autoAddConfirmCallback()
			}
			autoAddConfirmCallback = undefined
		}}
	>
		确定要启用自动加入吗？<br />
		任何加入实例的用户都会自动加入当前工作空间。
	</ConfirmationModal>
</div>

<div class="[&>div]:!z-[5002]">
	<ConfirmationModal
		open={Boolean(autoInviteDisableConfirmCallback)}
		title="禁用自动邀请"
		confirmationText="禁用"
		on:canceled={() => {
			autoInviteDisableConfirmCallback = undefined
		}}
		on:confirmed={() => {
			if (autoInviteDisableConfirmCallback) {
				autoInviteDisableConfirmCallback()
			}
			autoInviteDisableConfirmCallback = undefined
		}}
	>
		确定要禁用自动邀请吗？自动邀请是旧功能，禁用后当前工作空间将无法再使用，只能使用自动加入。<br />
		任何加入实例的用户都会自动加入当前工作空间。
	</ConfirmationModal>
</div>

<div class="[&>div]:!z-[5002]">
	<ConfirmationModal
		open={Boolean(switchToAutoAddConfirmCallback)}
		title="切换到自动加入"
		confirmationText="切换"
		on:canceled={() => {
			switchToAutoAddConfirmCallback = undefined
		}}
		on:confirmed={() => {
			if (switchToAutoAddConfirmCallback) {
				switchToAutoAddConfirmCallback()
			}
			switchToAutoAddConfirmCallback = undefined
		}}
	>
		Are you sure you want to switch from auto-invite to auto-add?<br />
		Auto-invite is a legacy feature. After switching to auto-add, auto-invite will no longer be available
		for this workspace. <br />
		With auto-add, anyone added to the instance will automatically join this workspace without needing
		to accept an invitation.
	</ConfirmationModal>
</div>
