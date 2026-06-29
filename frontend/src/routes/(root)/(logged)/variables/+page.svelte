<script lang="ts">
	import { getLocalDraftHint } from '$lib/localDraftHints.svelte'
	import CenteredPage from '$lib/components/CenteredPage.svelte'
	import { Alert, Badge, Button, Skeleton, Tab, Tabs } from '$lib/components/common'
	import ConfirmationModal from '$lib/components/common/confirmationModal/ConfirmationModal.svelte'
	import { OauthService, VariableService, WorkspaceService } from '$lib/gen'
	import ContextualVariableEditor from '$lib/components/ContextualVariableEditor.svelte'
	import DeployWorkspaceDrawer from '$lib/components/DeployWorkspaceDrawer.svelte'
	import Dropdown from '$lib/components/DropdownV2.svelte'
	import NoDirectDeployAlert from '$lib/components/NoDirectDeployAlert.svelte'
	import PageHeader from '$lib/components/PageHeader.svelte'
	import Popover from '$lib/components/Popover.svelte'
	import FilterSearchbar, {
		useUrlSyncedFilterInstance
	} from '$lib/components/FilterSearchbar.svelte'
	import { buildVariablesFilterSchema } from '$lib/components/variables/variablesFilter'
	import SharedBadge from '$lib/components/SharedBadge.svelte'
	import DraftBadge from '$lib/components/DraftBadge.svelte'
	import InheritedLabels from '$lib/components/InheritedLabels.svelte'
	import ShareModal from '$lib/components/ShareModal.svelte'
	import Cell from '$lib/components/table/Cell.svelte'
	import DataTable from '$lib/components/table/DataTable.svelte'
	import Head from '$lib/components/table/Head.svelte'
	import Row from '$lib/components/table/Row.svelte'
	import TableSimple from '$lib/components/TableSimple.svelte'
	import Tooltip from '$lib/components/Tooltip.svelte'
	import VariableEditor from '$lib/components/VariableEditor.svelte'
	import type { ContextualVariable, ListableVariable, WorkspaceDeployUISettings } from '$lib/gen'
	import { enterpriseLicense, userStore, workspaceStore, userWorkspaces } from '$lib/stores'
	import { sendUserToast } from '$lib/toast'
	import { canWrite, isOwner, truncate } from '$lib/utils'
	import { isDeployable, ALL_DEPLOYABLE } from '$lib/utils_deployable'
	import {
		Plus,
		FileUp,
		Link,
		Pen,
		RefreshCw,
		Shield,
		Trash,
		Building,
		DollarSign,
		EyeOff,
		Circle
	} from 'lucide-svelte'
	import { onMount, untrack } from 'svelte'
	import { page } from '$app/stores'

	type ListableVariableW = ListableVariable & { canWrite: boolean }

	let variables = $state(undefined) as ListableVariableW[] | undefined
	let showCreateButtons = $state(false)

	// Collect unique values for filter autocomplete
	let allPaths: string[] = $state([])
	let allOwners: string[] = $state([])
	let allLabels: string[] = $state([])

	// FilterSearchbar setup
	let userFoldersFilterType = $derived(
		$userStore?.is_super_admin && $userStore.username.includes('@')
			? 'only f/*'
			: $userStore?.is_admin || $userStore?.is_super_admin
				? 'u/username and f/*'
				: undefined
	)
	let variablesFilterSchema = $derived(
		buildVariablesFilterSchema({
			paths: allPaths,
			owners: allOwners,
			labels: allLabels,
			showUserFoldersFilter: userFoldersFilterType !== undefined,
			userFoldersLabel:
				userFoldersFilterType === 'only f/*' ? 'Only f/*' : `Only u/${$userStore?.username} and f/*`
		})
	)
	let filters = useUrlSyncedFilterInstance(untrack(() => variablesFilterSchema))
	let itemFolders = $derived(
		Array.from(
			new Set(
				(variables ?? [])
					.map((x) => x.path.split('/').slice(0, 2).join('/'))
					.filter((x) => x.startsWith('f/'))
			)
		)
			.sort()
			.map((f) => f.replace(/^f\//, ''))
	)
	let folderPresets = $derived([
		...itemFolders.map((f) => ({ name: `f/${f}`, value: `path_start:\\ f/${f}/` })),
		...allLabels.map((l) => ({ name: l, value: `label:\\ ${l}` })),
		...(variablesFilterSchema.user_folders_only
			? [
					{
						name: variablesFilterSchema.user_folders_only.label ?? '?',
						value: 'user_folders_only:\\ true'
					}
				]
			: [])
	])
	let contextualVariables: ContextualVariable[] = $state([])
	let shareModal: ShareModal | undefined = $state()
	let variableEditor: VariableEditor | undefined = $state()
	let contextualVariableEditor: ContextualVariableEditor | undefined = $state()
	let loading = $state({
		contextual: true
	})

	let deleteConfirmedCallback: (() => void) | undefined = $state(undefined)
	let deleteIsLinked = $state(false)
	let open = $derived(Boolean(deleteConfirmedCallback))

	// Filter variables client-side for user folder filtering (admin feature)
	let filteredItems = $derived.by(() => {
		let items = variables
		if (filters.val.user_folders_only && items) {
			items = items.filter((item) => {
				if (userFoldersFilterType === 'only f/*') return item.path.startsWith('f/')
				if (userFoldersFilterType === 'u/username and f/*')
					return item.path.startsWith('f/') || item.path.startsWith(`u/${$userStore?.username}/`)
				return true
			})
		}
		return items
	})

	// If relative, the dropdown is positioned relative to its button
	async function loadVariables(): Promise<void> {
		const currentFilters = filters.val

		// Build API parameters from filters.
		// `includeDraftOnly` surfaces per-user drafts at paths that have
		// no deployed variable — appended server-side when no narrowing
		// filter is set, so the user sees AI-agent-created drafts on
		// the home page.
		const apiParams: any = {
			workspace: $workspaceStore!,
			includeDraftOnly: true
		}

		if (currentFilters.path) {
			apiParams.path = currentFilters.path
		}
		if (currentFilters.path_start) {
			apiParams.pathStart = currentFilters.path_start
		}
		if (currentFilters.description) {
			apiParams.description = currentFilters.description
		}
		if (currentFilters.value) {
			apiParams.value = currentFilters.value
		}
		if (currentFilters.owner) {
			apiParams.pathStart = currentFilters.owner
		}
		if (currentFilters._default_) {
			apiParams.broadFilter = currentFilters._default_
		}
		if (currentFilters.label) {
			apiParams.label = currentFilters.label
		}

		const result = (await VariableService.listVariable(apiParams)).map((x) => {
			return {
				canWrite: canWrite(x.path, x.extra_perms!, $userStore) && x.workspace_id == $workspaceStore,
				...x
			}
		})

		// Extract unique values for autocomplete
		allPaths = Array.from(new Set(result.map((x) => x.path))).sort()
		allOwners = Array.from(
			new Set(result.map((x) => x.path.split('/').slice(0, 2).join('/')))
		).sort()
		allLabels = Array.from(
			new Set(result.flatMap((x) => [...(x.labels ?? []), ...(x.inherited_labels ?? [])]))
		).sort()

		variables = result
	}

	// Reload variables when filters change
	$effect(() => {
		filters.val
		if ($workspaceStore) {
			untrack(() => loadVariables())
		}
	})

	let deployUiSettings: WorkspaceDeployUISettings | undefined = $state(undefined)

	async function getDeployUiSettings() {
		if (!$enterpriseLicense) {
			deployUiSettings = ALL_DEPLOYABLE
			return
		}
		let settings = await WorkspaceService.getPublicSettings({ workspace: $workspaceStore! })
		deployUiSettings = settings.deploy_ui ?? ALL_DEPLOYABLE
	}
	getDeployUiSettings()

	async function loadContextualVariables(): Promise<void> {
		contextualVariables = await VariableService.listContextualVariables({
			workspace: $workspaceStore!
		})
		loading.contextual = false
	}

	async function deleteVariable(path: string, account?: number): Promise<void> {
		if (account) {
			OauthService.disconnectAccount({ workspace: $workspaceStore!, id: account })
		}
		await VariableService.deleteVariable({ workspace: $workspaceStore!, path })
		loadVariables()
		sendUserToast(`Variable ${path} was deleted`)
	}

	$effect(() => {
		if ($workspaceStore && $userStore) {
			untrack(() => {
				loadVariables()
				loadContextualVariables()
			})
		}
	})
	let tab: 'workspace' | 'contextual' = $state('workspace')

	let deploymentDrawer: DeployWorkspaceDrawer | undefined = $state()

	async function deleteContextualVariable(row: { name: string }) {
		await WorkspaceService.setEnvironmentVariable({
			workspace: $workspaceStore!,
			requestBody: {
				name: row.name,
				value: undefined
			}
		})
		loadContextualVariables()
		sendUserToast(
			`Custom contextual variable ${row.name} was deleted. It may take up to a few minutes to update.`
		)
		setTimeout(() => {
			loadContextualVariables()
		}, 5000)
	}

	onMount(() => {
		let hash = $page.url.hash
		if (hash.length > 1) {
			let path = hash.slice(1)
			variableEditor?.editVariable(path)
		}
	})
</script>

<DeployWorkspaceDrawer bind:this={deploymentDrawer} />

{#if $userStore?.operator && $workspaceStore && !$userWorkspaces.find((_) => _.id === $workspaceStore)?.operator_settings?.variables}
	<div class="bg-red-100 border-l-4 border-red-600 text-orange-700 p-4 m-4 mt-12" role="alert">
		<p class="font-bold">无权访问</p>
		<p>操作员不能访问此页面</p>
	</div>
{:else}
	<CenteredPage>
		<PageHeader
			title="变量"
			tooltip="保存可在脚本和流程中复用的字符串、变量和密钥。"
		>
			{#if showCreateButtons}
				<div class="flex flex-row justify-end">
					{#if tab == 'contextual' && ($userStore?.is_admin || $userStore?.is_super_admin)}
						<Button
							unifiedSize="md"
							variant="accent"
							startIcon={{ icon: Plus }}
							on:click={() => contextualVariableEditor?.initNew()}
						>
							新建上下文变量
						</Button>
					{:else}
						<Button
							unifiedSize="md"
							variant="accent"
							startIcon={{ icon: Plus }}
							on:click={() => variableEditor?.initNew()}
						>
							新建变量
						</Button>
					{/if}
				</div>
			{/if}
		</PageHeader>
		<NoDirectDeployAlert onUpdateCanEditStatus={(v) => (showCreateButtons = v)} />

		<VariableEditor bind:this={variableEditor} on:create={loadVariables} />
		<ContextualVariableEditor
			bind:this={contextualVariableEditor}
			on:update={loadContextualVariables}
		/>
		<ShareModal
			bind:this={shareModal}
			on:change={() => {
				loadVariables()
			}}
		/>

		<div class="flex gap-2 justify-between items-center">
			<Tabs bind:selected={tab}>
				<Tab value="workspace" label="工作空间" icon={Building} />
				<Tab value="contextual" label="上下文" icon={DollarSign}>
					{#snippet extra()}
						<Tooltip>
							上下文变量会在脚本运行时作为环境变量传入，具体值取决于执行上下文。
						</Tooltip>
					{/snippet}
				</Tab>
			</Tabs>
			{#if tab == 'workspace'}
				<FilterSearchbar
					class="grow max-w-[26rem]"
					schema={variablesFilterSchema}
					bind:value={filters.val}
					placeholder="Filter variables..."
					presets={folderPresets}
				/>
			{/if}
		</div>
		{#if tab == 'workspace'}
			<div class="relative overflow-x-auto pb-40 mt-4">
				{#if !filteredItems}
					<Skeleton layout={[0.5, [2], 1]} />
					{#each new Array(3) as _}
						<Skeleton layout={[[3.5], 0.5]} />
					{/each}
				{:else if filteredItems.length == 0}
					<div class="flex flex-col items-center justify-center h-full">
						<div class="text-md font-medium">No variables found</div>
						<div class="text-sm text-secondary">
							Try changing the filters or creating a new variable
						</div>
					</div>
				{:else}
					<DataTable size="xs">
						<Head>
							<tr>
								<Cell head first class="!px-0" />
								<Cell head>Path</Cell>
								<Cell head>Value</Cell>
								<Cell head>Description</Cell>
								<Cell head />
								<Cell head last />
							</tr>
						</Head>
						<tbody class="divide-y">
							{#each filteredItems as { path, value, is_secret, description, extra_perms, canWrite, account, is_refreshed, is_expired, refresh_error, is_linked, labels, inherited_labels, ws_specific, draft_only, is_draft }}
								<Row>
									<Cell class="!px-0 text-center w-12" first>
										<SharedBadge {canWrite} extraPerms={extra_perms} />
									</Cell>
									<Cell>
										<div class="flex items-center gap-2">
											<a
												class="break-all"
												id="edit-{path}"
												onclick={() => variableEditor?.editVariable(path)}
												href="#{path}"
											>
												{path}{(getLocalDraftHint($workspaceStore, 'variable', path) ?? is_draft)
													? '*'
													: ''}
											</a>
											{#if draft_only}
												<DraftBadge draft_only is_draft={false} />
											{/if}
											{#if labels?.length}
												{#each labels as label}
													<Badge
														color="blue"
														small
														class="px-1"
														title="Label: {label}"
														clickable
														onclick={() => {
															const arr = (filters.val.label ?? '').split(',').filter(Boolean)
															const idx = arr.indexOf(label)
															if (idx >= 0) arr.splice(idx, 1)
															else arr.push(label)
															const newFilters = { ...filters.val }
															if (arr.length) newFilters.label = arr.join(',')
															else delete newFilters.label
															filters.val = newFilters
														}}>{label}</Badge
													>
												{/each}
											{/if}
											<InheritedLabels labels={inherited_labels} />
										</div>
									</Cell>
									<Cell>
										<span class="inline-flex flex-row items-center gap-2">
											<div class="text-sm break-words">
												{#if value}
													{truncate(value, 20)}
												{:else}
													&lowast;&lowast;&lowast;&lowast;
												{/if}
											</div>
											{#if is_secret}
												<Popover notClickable>
													<EyeOff size={12} />
													{#snippet text()}
														<span>This item is secret</span>
													{/snippet}
												</Popover>
											{/if}
										</span>
									</Cell>
									<Cell class="break-words">
										<span class="text-xs text-primary">{truncate(description ?? '', 50)} </span>
									</Cell>

									<Cell class="text-center">
										<div class="flex flex-row items-center gap-4">
											{#if is_linked}
												<Popover notClickable>
													<Link size={16} />
													{#snippet text()}
														<div>
															This variable is linked with a resource of the same path. They are
															deleted and renamed together.
														</div>
													{/snippet}
												</Popover>
											{/if}
											{#if account}
												<Popover notClickable>
													<RefreshCw size={16} />
													{#snippet text()}
														<div>
															This OAuth token will be kept up-to-date in the background by Windmill
															using its refresh token
														</div>
													{/snippet}
												</Popover>
											{/if}

											{#if is_refreshed}
												<div class="">
													{#if refresh_error}
														<Popover notClickable>
															<div class="relative inline-flex justify-center items-center w-4 h-4">
																<Circle
																	class="text-red-600 animate-ping absolute z-50 w-4 h-4 fill-current"
																	size={12}
																/>
																<Circle
																	class="text-red-600 relative inline-flex fill-current "
																	size={12}
																/>
															</div>

															{#snippet text()}
																<div>
																	Latest exchange of the refresh token did not succeed. Error: {refresh_error}
																</div>
															{/snippet}
														</Popover>
													{:else if is_expired}
														<Popover notClickable>
															<Circle
																class="text-yellow-600 animate-[pulse_5s_linear_infinite] fill-current"
																size={12}
															/>
															{#snippet text()}
																<div>
																	The access_token is expired, it will get renewed the next time
																	this variable is fetched or you can request is to be refreshed in
																	the dropdown on the right.
																</div>
															{/snippet}
														</Popover>
													{:else}
														<Popover notClickable>
															<Circle
																class="text-green-600 animate-[pulse_5s_linear_infinite] fill-current"
																size={12}
															/>
															{#snippet text()}
																<div>
																	The variable was connected through OAuth and the token is not
																	expired.
																</div>
															{/snippet}
														</Popover>
													{/if}
												</div>
											{/if}
										</div>
									</Cell>
									<Cell last shouldStopPropagation>
										<Dropdown
											items={() => {
												let owner = isOwner(path, $userStore, $workspaceStore)
												return [
													{
														displayName: '编辑',
														icon: Pen,
														action: () => variableEditor?.editVariable(path),
														disabled: !canWrite || !showCreateButtons
													},
													{
														displayName: '删除',
														icon: Trash,
														type: 'delete',
														action: (event) => {
															if (event['shiftKey']) {
																deleteVariable(path, account)
															} else {
																deleteIsLinked = is_linked ?? false
																deleteConfirmedCallback = () => {
																	deleteVariable(path, account)
																}
															}
														},
														disabled: !owner || !showCreateButtons
													},
													...(!ws_specific &&
													isDeployable(is_secret ? 'secret' : 'variable', path, deployUiSettings)
														? [
																{
																		displayName: '部署到生产/预发',
																	icon: FileUp,
																	action: () => {
																		deploymentDrawer?.openDrawer(path, 'variable')
																	}
																}
															]
														: []),
													{
														displayName: '权限',
														action: () => {
															shareModal?.openDrawer(path, 'variable')
														},
														icon: Shield
													},
													...(account != undefined
														? [
																{
																	displayName: '刷新令牌',
																	icon: RefreshCw,
																	action: async () => {
																		await OauthService.refreshToken({
																			workspace: $workspaceStore ?? '',
																			id: account ?? 0,
																			requestBody: {
																				path
																			}
																		})
																			sendUserToast('令牌已刷新')
																		loadVariables()
																	}
																}
															]
														: [])
												]
											}}
										/>
									</Cell>
								</Row>
							{/each}
						</tbody>
					</DataTable>
				{/if}
			</div>
		{:else if tab == 'contextual'}
			<div class="overflow-auto">
				{#if loading.contextual}
					<Skeleton layout={[0.5, [2], 1]} />
					{#each new Array(8) as _}
						<Skeleton layout={[[2.8], 0.5]} />
					{/each}
				{:else}
					<PageHeader title="自定义上下文变量" primary={false} />
					{#if contextualVariables.filter((x) => x.is_custom).length === 0}
						<div class="flex flex-col items-center justify-center h-full">
							<div class="text-xs text-primary font-normal"
								>未找到自定义上下文变量</div
							>
						</div>
					{:else}
						<TableSimple
							headers={['名称', '值']}
							data={contextualVariables.filter((x) => x.is_custom)}
							keys={['name', 'value']}
							getRowActions={$userStore?.is_admin || $userStore?.is_super_admin
								? (row) => {
										return [
											{
												displayName: '编辑',
												action: () => contextualVariableEditor?.editVariable(row.name, row.value)
											},
											{
												displayName: '删除',
												type: 'delete',
												action: () => {
													deleteContextualVariable(row)
												}
											}
										]
									}
								: undefined}
						/>
					{/if}
					<PageHeader title="上下文变量" primary={false} />
					<TableSimple
						headers={['名称', '示例值', '描述']}
						data={contextualVariables.filter((x) => !x.is_custom)}
						keys={['name', 'value', 'description']}
					/>
				{/if}
			</div>
		{/if}
	</CenteredPage>
{/if}

	<ConfirmationModal
		{open}
		title="删除变量"
		confirmationText="删除"
	trashbin
	on:canceled={() => {
		deleteConfirmedCallback = undefined
	}}
	on:confirmed={() => {
		if (deleteConfirmedCallback) {
			deleteConfirmedCallback()
		}
		deleteConfirmedCallback = undefined
	}}
>
	<div class="flex flex-col w-full space-y-4">
			<span>确定要删除这个变量吗？</span>
			{#if deleteIsLinked}
				<Alert type="warning" title="关联资源">
					该变量与同路径资源关联。删除变量时，关联资源也会被删除。
				</Alert>
			{/if}
			<Alert type="info" title="跳过确认">
				<div>
					删除变量时按住
					<Badge color="dark-gray">SHIFT</Badge>
					可以跳过确认。
				</div>
			</Alert>
	</div>
</ConfirmationModal>
