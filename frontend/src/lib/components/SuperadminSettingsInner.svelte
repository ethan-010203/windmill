<script lang="ts">
	import { UserService, type GlobalUserInfo, type ExternalJwtToken, SettingService } from '$lib/gen'
	import { Tab, Tabs } from '$lib/components/common'
	import DataTable from '$lib/components/table/DataTable.svelte'
	import Head from '$lib/components/table/Head.svelte'
	import Cell from '$lib/components/table/Cell.svelte'
	import InviteGlobalUser from '$lib/components/InviteGlobalUser.svelte'
	import { Alert, Button } from '$lib/components/common'
	import { sendUserToast } from '$lib/toast'
	import { base } from '$lib/base'
	import SearchItems from './SearchItems.svelte'
	import { page } from '$app/state'
	import { goto as gotoUrl } from '$app/navigation'
	import Version from './Version.svelte'
	import Uptodate from './Uptodate.svelte'
	import InstanceSettings from './InstanceSettings.svelte'
	import { truncate } from '$lib/utils'
	import ToggleButtonGroup from './common/toggleButton-v2/ToggleButtonGroup.svelte'
	import ToggleButton from './common/toggleButton-v2/ToggleButton.svelte'
	import { userStore, workspaceStore } from '$lib/stores'
	import {
		ArrowRightLeft,
		Ban,
		Bot,
		CheckCircle2,
		ExternalLink,
		Pencil,
		UserMinus,
		UserPlus
	} from 'lucide-svelte'
	import Badge from './common/badge/Badge.svelte'
	import Tooltip from './Tooltip.svelte'
	import DropdownV2 from './DropdownV2.svelte'
	import Popover from './meltComponents/Popover.svelte'
	import ConfirmationModal from './common/confirmationModal/ConfirmationModal.svelte'
	import GlobalUserOffboardingModal from '$lib/components/GlobalUserOffboardingModal.svelte'
	import ChangeInstanceUsername from './ChangeInstanceUsername.svelte'
	import { isCloudHosted } from '$lib/cloud'
	import InstanceNameEditor from './InstanceNameEditor.svelte'
	import Toggle from './Toggle.svelte'
	import { instanceSettingsSelectedTab } from '$lib/stores'
	import { onDestroy, tick } from 'svelte'
	import SidebarNavigation from '$lib/components/common/sidebar/SidebarNavigation.svelte'
	import {
		instanceSettingsNavigationGroups,
		tabToCategoryMap,
		tabToAuthSubTab,
		categoryToTabMap,
		buildSearchableSettingItems,
		type SearchableSettingItem
	} from './instanceSettings'
	import TextInput from './text_input/TextInput.svelte'
	import SettingsPageHeader from './settings/SettingsPageHeader.svelte'
	import SettingsSearchInput from './instanceSettings/SettingsSearchInput.svelte'
	import InstanceAISettings from './instanceSettings/InstanceAISettings.svelte'
	import ExternalJwtTokens from './instanceSettings/ExternalJwtTokens.svelte'

	let filter = $state('')

	let {
		closeDrawer,
		showHeaderInfo = true,
		disableChatOffset = false,
		yamlMode = $bindable(false),
		hasUnsavedChanges = $bindable(false),
		hasAnyInvalid = $bindable(false)
	} = $props()

	function removeHash() {
		const index = page.url.href.lastIndexOf('#')
		if (index === -1) return
		const hashRemoved = page.url.href.slice(0, index)
		gotoUrl(hashRemoved)
	}

	onDestroy(() => {
		removeHash()
	})

	let users: GlobalUserInfo[] = $state([])
	let filteredUsers: GlobalUserInfo[] = $state([])
	let offboardingEmail: string | undefined = $state(undefined)
	let offboardingReassignOnly = $state(false)
	let disableConfirmedCallback: (() => void) | undefined = $state(undefined)
	let disableUserEmail: string = $state('')
	let editWrappers: Record<string, HTMLDivElement> = $state({})
	let activeOnly = $state(false)

	async function listUsers(activeOnly: boolean): Promise<void> {
		users = await UserService.listUsersAsSuperAdmin({ perPage: 100000, activeOnly: activeOnly })
	}

	$effect(() => {
		listUsers(activeOnly)
	})

	let usersSubTab: 'users' | 'ext_jwt' = $state('users')
	let extJwtTokens: ExternalJwtToken[] = $state([])
	let extJwtHasMore = $state(true)
	let extJwtLoading = $state(false)
	let extJwtActiveOnly = $state(false)
	const extJwtPerPage = 50

	async function loadExtJwtPage(nextPage: number) {
		extJwtLoading = true
		try {
			const res = await UserService.listExtJwtTokens({
				page: nextPage,
				perPage: extJwtPerPage,
				activeOnly: extJwtActiveOnly
			})
			extJwtTokens = nextPage === 1 ? res : [...extJwtTokens, ...res]
			extJwtHasMore = res.length === extJwtPerPage
		} catch (e) {
			sendUserToast(`加载外部 JWT 令牌失败：${e}`, true)
		} finally {
			extJwtLoading = false
		}
	}
	loadExtJwtPage(1)

	let tab: string = $state('users')

	$effect(() => {
		tab = $instanceSettingsSelectedTab
	})
	$effect(() => {
		instanceSettingsSelectedTab.set(tab)
	})

	let nbDisplayed = $state(50)

	let instanceSettings: InstanceSettings | undefined = $state()

	let automateUsernameCreation = $state(true)
	async function getAutomateUsernameCreationSetting() {
		automateUsernameCreation =
			((await SettingService.getGlobal({ key: 'automate_username_creation' })) as any) ?? true
	}
	getAutomateUsernameCreationSetting()
	let automateUsernameModalOpen = $state(false)
	async function enableAutomateUsernameCreationSetting() {
		await SettingService.setGlobal({
			key: 'automate_username_creation',
			requestBody: { value: true }
		})
		getAutomateUsernameCreationSetting()
		sendUserToast('用户名自动创建已启用')
		listUsers(activeOnly)
	}

	async function updateName(name: string | undefined, email: string) {
		try {
			await UserService.globalUserUpdate({
				email,
				requestBody: {
					name
				}
			})
			sendUserToast('用户已更新')
			listUsers(activeOnly)
		} catch (e) {
			sendUserToast('更新用户失败', true)
		}
	}

	// The category name for InstanceSettings based on current sidebar tab
	let instanceSettingsCategory = $derived(tabToCategoryMap[tab] ?? 'Core')
	let authSubTab: 'sso' | 'oauth' | 'scim' = $derived(tabToAuthSubTab[tab] ?? 'sso')
	let availableInstanceSettingTabs = $derived(
		new Set(
			instanceSettingsNavigationGroups.flatMap((group) =>
				group.items.filter((item) => item.showIf !== false).map((item) => item.id)
			)
		)
	)
	let isCurrentTabAvailable = $derived(
		tab === 'users' || tab === 'ai' || availableInstanceSettingTabs.has(tab)
	)

	function handleNavigate(newTab: string) {
		if (newTab === tab) return
		tab = newTab
	}

	export function saveSettings() {
		return instanceSettings?.saveSettings()
	}

	export function discardAll() {
		instanceSettings?.discardAll()
	}

	export function syncBeforeDiff(): boolean {
		return instanceSettings?.syncBeforeDiff() ?? true
	}

	export function buildFullDiff(): { original: string; modified: string } {
		return instanceSettings?.buildFullDiff() ?? { original: '', modified: '' }
	}
	// --- Settings search ---
	const searchableItems = buildSearchableSettingItems()

	let scrollTimeout: ReturnType<typeof setTimeout> | undefined
	let highlightTimeout: ReturnType<typeof setTimeout> | undefined

	async function handleSearchSelect(item: SearchableSettingItem) {
		handleNavigate(item.tabId)
		if (item.settingKey) {
			clearTimeout(scrollTimeout)
			clearTimeout(highlightTimeout)
			await tick()
			// Wait for the tab content to render before scrolling
			scrollTimeout = setTimeout(() => {
				const el = document.querySelector(`[data-setting-key="${item.settingKey}"]`)
				if (el) {
					el.scrollIntoView({ behavior: 'smooth', block: 'center' })
					el.classList.add('setting-highlight')
					highlightTimeout = setTimeout(() => el.classList.remove('setting-highlight'), 2500)
				}
			}, 100)
		}
	}

	onDestroy(() => {
		clearTimeout(scrollTimeout)
		clearTimeout(highlightTimeout)
	})
</script>

<SearchItems
	{filter}
	items={users}
	bind:filteredItems={filteredUsers}
	f={(x) =>
		(x.email ?? '') +
		' ' +
		(x.name ?? '') +
		' ' +
		(x.company ?? '') +
		' ' +
		(x.username ?? '') +
		' ' +
		(x.workspace_id ?? '')}
/>

<div class="flex flex-col h-full w-full">
	{#if showHeaderInfo}
		<div>
			<div class="flex justify-between">
				<div class="text-xs pt-1 text-secondary flex flex-col">
					<div>部门工具平台 <Version /></div>
				</div>
				<div><Uptodate /></div></div
			>
		</div>
		{#if $workspaceStore !== 'admins'}
			<div class="flex flex-row-reverse">
				<Button
					variant="default"
					target="_blank"
					href="{base}/?workspace=admins"
					endIcon={{ icon: ExternalLink }}
				>
					管理员工作区
				</Button>
			</div>
		{/if}
	{/if}
	<div class="{showHeaderInfo ? 'pt-4' : ''} flex grow min-h-0">
		{#if !yamlMode}
			<!-- Sidebar Navigation -->
			<div class="w-52 shrink-0 h-full overflow-auto p-4 bg-surface flex flex-col">
				<SettingsSearchInput {searchableItems} onSelect={handleSearchSelect} class="mb-3" />
				<SidebarNavigation
					groups={instanceSettingsNavigationGroups}
					selectedId={tab}
					onNavigate={handleNavigate}
				/>
				{#if $workspaceStore !== 'admins'}
					<div class="mt-4 pt-2 border-t border-surface-hover">
						<a
							href="{base}/?workspace=admins"
							target="_blank"
							class="flex items-center gap-2 px-2 py-1.5 text-xs text-secondary hover:text-primary transition-colors"
						>
							<ExternalLink size={14} />
							管理员工作区
						</a>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Main Content -->
		<div class="flex-1 min-w-0 h-full">
			<div class="h-full overflow-auto bg-surface">
				<div class="h-fit px-8 py-4">
					{#if !isCurrentTabAvailable && !yamlMode}
						<div class="h-full">
							<SettingsPageHeader
								title="当前功能未开放"
								description="该实例设置项不适用于当前内部部署。"
							/>
							<Alert type="info" title="当前功能未开放">
								请使用左侧导航中的可用设置项。
							</Alert>
						</div>
					{:else if tab === 'ai' && !yamlMode}
						<InstanceAISettings {disableChatOffset} />
					{:else if tab === 'users' && !yamlMode}
						<div class="h-full">
							{#if !automateUsernameCreation && !isCloudHosted()}
								<div class="mb-4">
									<h3 class="mb-2">自动生成用户名</h3>
									<div class="mb-2">
										<span class="text-primary text-sm"
											>根据新用户邮箱自动生成用户名，并在各工作空间中保持一致。</span
										>
									</div>
									<Button
										btnClasses="w-auto"
										size="sm"
										variant="accent"
										on:click={() => {
											automateUsernameModalOpen = true
										}}
									>
										启用
									</Button>
									<ConfirmationModal
										open={automateUsernameModalOpen}
										on:confirmed={() => {
											automateUsernameModalOpen = false
											enableAutomateUsernameCreationSetting()
										}}
										on:canceled={() => (automateUsernameModalOpen = false)}
										title="自动生成用户名"
										confirmationText="启用"
									>
										启用后无法关闭。如果已有用户在不同工作空间使用了不同用户名，需要逐个确认用户名。
									</ConfirmationModal>
								</div>
							{/if}

							{#if extJwtTokens.length > 0}
								<Tabs bind:selected={usersSubTab} class="mb-4">
									<Tab value="users" label="用户" />
									<Tab value="ext_jwt" label="外部 JWT" />
								</Tabs>
							{/if}

							{#if usersSubTab === 'users' || extJwtTokens.length === 0}
								<SettingsPageHeader
									title="实例用户（{users.length}）"
									description="管理当前实例中的全部用户。"
								/>
								<div class="flex flex-row gap-2 items-center">
									<TextInput
										inputProps={{ placeholder: '搜索用户' }}
										bind:value={filter}
										class="w-60"
									/><Toggle
										bind:checked={activeOnly}
										options={{
											left: '仅最近活跃',
											leftTooltip:
												'仅显示最近 30 天内登录或执行过操作的用户'
										}}
									/>

									<div class="flex-1"></div>
									<Popover placement="bottom-end" disableFocusTrap closeButton>
										{#snippet trigger()}
											<Button
												variant="accent"
												unifiedSize="md"
												startIcon={{ icon: UserPlus }}
												nonCaptureEvent
												wrapperClasses="w-fit shrink-0"
											>
												添加用户
											</Button>
										{/snippet}
										{#snippet content()}
											<InviteGlobalUser on:new={() => listUsers(activeOnly)} />
										{/snippet}
									</Popover>
								</div>
								<p class="text-hint text-2xs mt-2">
									找到 {filteredUsers.length} 个用户
								</p>
								<div class="mt-1">
									<DataTable
										shouldLoadMore={(filteredUsers?.length ?? 0) > 50}
										loadMore={50}
										on:loadMore={() => {
											nbDisplayed += 50
										}}
									>
										<Head>
											<tr>
												<Cell head first>邮箱</Cell>
												{#if automateUsernameCreation}
													<Cell head>用户名</Cell>
												{/if}
												<Cell head>姓名</Cell>
												<Cell head>认证方式</Cell>
												{#if activeOnly}
													<Cell head>类型</Cell>
												{/if}
												<Cell head>角色</Cell>
												<Cell head last>
													<span class="sr-only">操作</span>
												</Cell>
											</tr>
										</Head>
										<tbody>
											{#if filteredUsers && users}
												{#each filteredUsers.slice(0, nbDisplayed) as { email, super_admin, devops, login_type, name, username, operator_only, is_workspace_admin, role_source, disabled, workspace_id }, i (email + '::' + (workspace_id ?? ''))}
													{@const isServiceAccount = login_type === 'service_account'}
													<tr
														class="{i % 2 === 0 ? 'bg-surface-tertiary' : 'bg-surface'} {disabled
															? 'opacity-60'
															: ''}"
													>
														<Cell first class="max-w-[250px]">
															<div class="flex items-center gap-1.5">
																{#if isServiceAccount}
																	<Bot size={16} class="text-blue-500 shrink-0" />
																	<span title={email} class="truncate block">{email}</span>
																{:else}
																	<a href="mailto:{email}" title={email} class="truncate block"
																		>{email}</a
																	>
																{/if}
																{#if workspace_id}
																	<a
																		href="{base}/?workspace={workspace_id}"
																		title="工作空间：{workspace_id}"
																	>
																		<Badge color="blue">{truncate(workspace_id, 20)}</Badge>
																	</a>
																{/if}
																{#if disabled}
																	<span
																		class="text-2xs px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300 whitespace-nowrap"
																		>已禁用</span
																	>
																{/if}
															</div>
														</Cell>
														{#if automateUsernameCreation}
															<Cell class="max-w-[150px]">
																{#if username}
																	<span title={username} class="truncate block">{username}</span>
																{:else}
																	{#key filteredUsers.map((u) => u.username).join()}
																		<ChangeInstanceUsername
																			username=""
																			{email}
																			isConflict
																			on:renamed={() => {
																				listUsers(activeOnly)
																			}}
																		/>
																	{/key}
																{/if}
															</Cell>
														{/if}
														<Cell class="max-w-[150px]"
															><span title={name ?? ''} class="truncate block"
																>{truncate(name ?? '', 30)}</span
															></Cell
														>
														<Cell class="max-w-[100px]"
															><span title={login_type} class="truncate block">{login_type}</span
															></Cell
														>
														{#if activeOnly}
															<Cell>
																{#if is_workspace_admin}
																	管理员
																{:else if operator_only}
																	仅操作者
																{:else}
																	开发者
																{/if}
															</Cell>
														{/if}
														<Cell>
															{#if isServiceAccount}
																<div class="flex items-center gap-1">
																	<span
																		class="rounded-md text-xs px-2 py-1 bg-surface shadow-md font-bold"
																	>
																		{is_workspace_admin
																			? '管理员'
																			: operator_only
																				? '操作者'
																				: '开发者'}
																	</span>
																	<Tooltip>
																		服务账号角色在工作空间用户设置中管理。
																	</Tooltip>
																</div>
															{:else}
																<div class="flex flex-col items-start">
																	{#key `${super_admin}_${devops}_${role_source}`}
																		<ToggleButtonGroup
																			selected={super_admin
																				? 'super_admin'
																				: devops
																					? 'devops'
																					: 'user'}
																			on:selected={async (e) => {
																				if (email == $userStore?.email) {
																					sendUserToast('不能降低自己的权限', true)
																					listUsers(activeOnly)
																					return
																				}

																				let role = e.detail

																				if (role === 'super_admin') {
																					await UserService.globalUserUpdate({
																						email,
																						requestBody: {
																							is_super_admin: true,
																							is_devops: false
																						}
																					})
																				}
																				if (role === 'devops') {
																					await UserService.globalUserUpdate({
																						email,
																						requestBody: {
																							is_super_admin: false,
																							is_devops: true
																						}
																					})
																				}
																				if (role === 'user') {
																					await UserService.globalUserUpdate({
																						email,
																						requestBody: {
																							is_super_admin: false,
																							is_devops: false
																						}
																					})
																				}
																				sendUserToast('用户已更新')
																				listUsers(activeOnly)
																			}}
																		>
																			{#snippet children({ item })}
																				<ToggleButton
																					value={'user'}
																					small
																					label="用户"
																					disabled={role_source === 'instance_group' &&
																						(super_admin || devops)}
																					tooltip={role_source === 'instance_group' &&
																					(super_admin || devops)
																						? '角色由实例组设置。需要先从组中移除该用户，才能降级为普通用户。'
																						: undefined}
																					showTooltipIcon={role_source === 'instance_group' &&
																						(super_admin || devops)}
																					{item}
																				/>
																				<ToggleButton
																					value={'devops'}
																					small
																					label="Devops"
																					tooltip="Devops 拥有接近超级管理员的可见性，但不具备全部管理权限，例如可以查看服务日志和关键告警。"
																					{item}
																				/>
																				<ToggleButton
																					value={'super_admin'}
																					small
																					label="超级管理员"
																					{item}
																				/>
																			{/snippet}
																		</ToggleButtonGroup>
																	{/key}
																	{#if role_source === 'instance_group' && (super_admin || devops)}
																		<a
																			href="{base}/groups"
																			class="text-2xs text-tertiary mt-0.5 ml-1 hover:underline"
																			title="角色由实例组设置。可以手动提升为更高角色；如需降级为普通用户，需要先从组中移除。"
																			onclick={() => closeDrawer?.()}
																		>
																			由实例组设置
																		</a>
																	{/if}
																</div>
															{/if}
														</Cell>
														<Cell last>
															<div class="flex items-center justify-end">
																{#if isServiceAccount}
																	{#if workspace_id}
																		<a
																			href="{base}/workspace_settings?tab=users&workspace={workspace_id}"
																			class="text-xs text-secondary hover:text-primary hover:underline"
																			title="在工作空间设置中管理">在工作空间中管理</a
																		>
																	{/if}
																{:else}
																	<div
																		bind:this={editWrappers[email]}
																		class="w-0 h-0 overflow-hidden"
																	>
																		<InstanceNameEditor
																			{login_type}
																			value={name}
																			{username}
																			{email}
																			on:refresh={() => {
																				listUsers(activeOnly)
																			}}
																			on:save={(e) => {
																				updateName(e.detail, email)
																			}}
																			on:renamed={() => {
																				listUsers(activeOnly)
																			}}
																			{automateUsernameCreation}
																		/>
																	</div>
																	<DropdownV2
																		items={[
																			{
																				displayName: '编辑',
																				icon: Pencil,
																				action: () => {
																					const btn = editWrappers[email]?.querySelector(
																						'[aria-label="Popup button"]'
																					)
																					if (btn instanceof HTMLElement) btn.click()
																				}
																			},
																			{
																				displayName: disabled ? '启用' : '禁用',
																				icon: disabled ? CheckCircle2 : Ban,
																				action: () => {
																					if (!disabled) {
																						disableUserEmail = email
																						disableConfirmedCallback = async () => {
																							try {
																								await UserService.globalUserUpdate({
																									email,
																									requestBody: { disabled: true }
																								})
																								sendUserToast('用户已禁用')
																								listUsers(activeOnly)
																							} catch (e) {
																								sendUserToast('禁用用户失败', true)
																							}
																						}
																					} else {
																						UserService.globalUserUpdate({
																							email,
																							requestBody: { disabled: false }
																						})
																							.then(() => {
																								sendUserToast('用户已启用')
																								listUsers(activeOnly)
																							})
																							.catch(() => {
																								sendUserToast('启用用户失败', true)
																							})
																					}
																				}
																			},
																			{
																				displayName: '重新分配',
																				icon: ArrowRightLeft,
																				action: () => {
																					offboardingEmail = email
																					offboardingReassignOnly = true
																				}
																			},
																			{
																				displayName: '移除',
																				icon: UserMinus,
																				type: 'delete',
																				action: () => {
																					offboardingEmail = email
																					offboardingReassignOnly = false
																				}
																			}
																		]}
																	/>
																{/if}
															</div>
														</Cell>
													</tr>
												{/each}
											{/if}
										</tbody>
									</DataTable>
								</div>
							{:else if usersSubTab === 'ext_jwt'}
								<ExternalJwtTokens
									tokens={extJwtTokens}
									hasMore={extJwtHasMore}
									loading={extJwtLoading}
									activeOnly={extJwtActiveOnly}
									onLoadMore={() =>
										loadExtJwtPage(Math.floor(extJwtTokens.length / extJwtPerPage) + 1)}
									onActiveOnlyChange={(v) => {
										extJwtActiveOnly = v
										loadExtJwtPage(1)
									}}
								/>
							{/if}
						</div>
					{:else}
						<InstanceSettings
							bind:this={instanceSettings}
							hideTabs
							bind:yamlMode
							bind:hasUnsavedChanges
							bind:hasAnyInvalid
							tab={instanceSettingsCategory}
							{authSubTab}
							{closeDrawer}
							onNavigateToTab={(category) => {
								const targetTab = categoryToTabMap[category]
								if (targetTab) {
									handleNavigate(targetTab)
								}
							}}
						/>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
{#if offboardingEmail}
	<GlobalUserOffboardingModal
		open={offboardingEmail != null}
		email={offboardingEmail}
		reassignOnly={offboardingReassignOnly}
		onClose={() => {
			offboardingEmail = undefined
		}}
		onComplete={() => {
			offboardingEmail = undefined
			listUsers(activeOnly)
		}}
	/>
{/if}
<ConfirmationModal
	open={Boolean(disableConfirmedCallback)}
	title="禁用用户"
	confirmationText="禁用"
	on:canceled={() => {
		disableConfirmedCallback = undefined
		listUsers(activeOnly)
	}}
	on:confirmed={() => {
		if (disableConfirmedCallback) {
			disableConfirmedCallback()
		}
		disableConfirmedCallback = undefined
	}}
>
	<div class="flex flex-col w-full space-y-4">
		<span
			>确定要禁用 <b>{disableUserEmail}</b> 吗？该用户的所有活跃会话和令牌会立即失效，重新启用前无法登录。其工作空间成员关系和内容会保留。</span
		>
	</div>
</ConfirmationModal>
