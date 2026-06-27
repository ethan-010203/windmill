<script lang="ts">
	import { Button, Skeleton } from '$lib/components/common'
	import ListFilters from '$lib/components/home/ListFilters.svelte'
	import SearchItems from '$lib/components/SearchItems.svelte'
	import Cell from '$lib/components/table/Cell.svelte'
	import DataTable from '$lib/components/table/DataTable.svelte'
	import Head from '$lib/components/table/Head.svelte'
	import Row from '$lib/components/table/Row.svelte'
	import WorkspaceDependenciesEditor from '$lib/components/WorkspaceDependenciesEditor.svelte'
	import DependenciesDeploymentWarning from '$lib/components/DependenciesDeploymentWarning.svelte'
	import Drawer from '$lib/components/common/drawer/Drawer.svelte'
	import DrawerContent from '$lib/components/common/drawer/DrawerContent.svelte'
	import HighlightCode from '$lib/components/HighlightCode.svelte'
	import { workspaceStore, userStore } from '$lib/stores'
	import { Plus, FileText, Search, Code2, Edit, Eye, RefreshCw } from 'lucide-svelte'
	import { WorkspaceDependenciesService, WorkspaceService } from '$lib/gen'
	import type { WorkspaceDependencies, ScriptLang } from '$lib/gen'
	import { untrack } from 'svelte'
	import { sendUserToast } from '$lib/toast'
	import TimeAgo from '$lib/components/TimeAgo.svelte'
	import SettingsPageHeader from '$lib/components/settings/SettingsPageHeader.svelte'

	let filter = $state('')
	let workspaceDependencies: WorkspaceDependencies[] | undefined = $state()
	let filteredItems: (WorkspaceDependencies & { marked?: string })[] | undefined = $state()
	let workspaceDependenciesEditor: WorkspaceDependenciesEditor | undefined = $state()
	let rebuildingDependencyMap = $state(false)

	// View modal state
	let viewDrawer: Drawer | undefined = $state()
	let viewContent: string = $state('')
	let viewLanguage: ScriptLang = $state('python3')
	let viewPath: string = $state('')

	// Dependency warning state
	let showDependencyWarning = $state(false)
	let pendingAction: (() => Promise<void>) | null = $state(null)
	let currentImportedPath: string | null = $state(null)
	let warningTitle = $state('')
	let warningConfirmText = $state('')

	let languages = $derived(
		Array.from(new Set(filteredItems?.map((x) => x.language).filter(Boolean) ?? [])).sort()
	)

	let languageFilter: string | undefined = $state(undefined)

	$effect(() => {
		if ($workspaceStore) {
			languageFilter = undefined
		}
	})

	let preFilteredItems = $derived(
		languageFilter == undefined
			? workspaceDependencies
			: workspaceDependencies?.filter((x) => x.language === languageFilter)
	)

	// Load workspace dependencies using actual API
	async function loadWorkspaceDependencies(): Promise<void> {
		if (!$workspaceStore) return

		try {
			workspaceDependencies = await WorkspaceDependenciesService.listWorkspaceDependencies({
				workspace: $workspaceStore
			})
		} catch (error) {
			console.error('Failed to load workspace dependencies:', error)
			sendUserToast('加载依赖约束失败', true)
		}
	}

	$effect(() => {
		if ($workspaceStore && $userStore) {
			untrack(() => {
				loadWorkspaceDependencies()
			})
		}
	})

	async function rebuildDependencyMap(): Promise<void> {
		if (!$workspaceStore) return
		rebuildingDependencyMap = true
		try {
			const status = await WorkspaceService.rebuildDependencyMap({ workspace: $workspaceStore })
			sendUserToast(status)
		} catch (error) {
			console.error('Error rebuilding dependency map:', error)
			sendUserToast(`Failed to rebuild dependency map: ${error.message}`, true)
		} finally {
			rebuildingDependencyMap = false
		}
	}

	async function createNewWorkspaceDependencies() {
		await workspaceDependenciesEditor?.initNew()
	}

	function editWorkspaceDependencies(deps: WorkspaceDependencies) {
		workspaceDependenciesEditor?.editWorkspaceDependencies(deps.id, deps.name, deps.language)
	}

	function viewWorkspaceDependencies(deps: WorkspaceDependencies) {
		viewPath = deps.name || `Workspace Default (${deps.language})`
		viewContent = deps.content
		viewLanguage = deps.language
		viewDrawer?.openDrawer()
	}

	// Archive workspace dependencies
	async function archiveWorkspaceDependencies(deps: WorkspaceDependencies): Promise<void> {
		const importedPath = workspaceDependenciesEditor?.getWorkspaceDependenciesPath(
			deps.name ?? null,
			deps.language
		)
		if (!importedPath) {
			sendUserToast('无法确定依赖约束路径', true)
			return
		}

		currentImportedPath = importedPath
		warningTitle = `Archive Warning`
		warningConfirmText = 'Archive Anyway'
		pendingAction = () => executeArchive(deps)
		showDependencyWarning = true
	}

	async function executeArchive(deps: WorkspaceDependencies): Promise<void> {
		try {
			await WorkspaceDependenciesService.archiveWorkspaceDependencies({
				workspace: $workspaceStore!,
				language: deps.language as any,
				name: deps.name
			})
			sendUserToast(
				`Archived enforced dependencies: ${workspaceDependenciesEditor?.getDisplayName(deps)}`
			)
			loadWorkspaceDependencies() // Reload the list
		} catch (error) {
			console.error('Error archiving workspace dependencies:', error)
			sendUserToast(`Failed to archive enforced dependencies: ${error.message}`, true)
		}
	}

	// Delete workspace dependencies
	async function deleteWorkspaceDependencies(deps: WorkspaceDependencies): Promise<void> {
		const importedPath = workspaceDependenciesEditor?.getWorkspaceDependenciesPath(
			deps.name ?? null,
			deps.language
		)
		if (!importedPath) {
			sendUserToast('无法确定依赖约束路径', true)
			return
		}

		currentImportedPath = importedPath
		warningTitle = `Delete Warning`
		warningConfirmText = 'Delete Anyway'
		pendingAction = () => executeDelete(deps)
		showDependencyWarning = true
	}

	async function executeDelete(deps: WorkspaceDependencies): Promise<void> {
		try {
			await WorkspaceDependenciesService.deleteWorkspaceDependencies({
				workspace: $workspaceStore!,
				language: deps.language as any,
				name: deps.name
			})
			sendUserToast(
				`Deleted enforced dependencies: ${workspaceDependenciesEditor?.getDisplayName(deps)}`
			)
			loadWorkspaceDependencies() // Reload the list
		} catch (error) {
			console.error('Error deleting workspace dependencies:', error)
			sendUserToast(`Failed to delete enforced dependencies: ${error.message}`, true)
		}
	}

	async function viewReferencedFrom(deps: WorkspaceDependencies): Promise<void> {
		try {
			const path = workspaceDependenciesEditor?.getWorkspaceDependenciesPath(
				deps.name ?? null,
				deps.language
			)
			if (!path) {
				sendUserToast('无法确定依赖约束路径', true)
				return
			}

			const dependents = await WorkspaceService.getDependents({
				workspace: $workspaceStore!,
				importedPath: path
			})

			if (dependents.length === 0) {
				sendUserToast('没有找到依赖此配置的运行项')
			} else {
				// Show dependents in a modal or navigate to a detailed view
				console.log('Dependents:', dependents)
				sendUserToast(
					`Found ${dependents.length} dependent runnable${dependents.length !== 1 ? 's' : ''}`
				)
			}
		} catch (error) {
			console.error('Error fetching dependent runnables:', error)
			sendUserToast('获取依赖运行项失败', true)
		}
	}

	async function handleWarningConfirm(): Promise<void> {
		if (pendingAction) {
			showDependencyWarning = false
			await pendingAction()
			pendingAction = null
			currentImportedPath = null
		}
	}

	function handleWarningCancel(): void {
		showDependencyWarning = false
		pendingAction = null
		currentImportedPath = null
	}

	function getLanguageForHighlighting(language: ScriptLang): ScriptLang | 'json' | undefined {
		// Map our requirement languages to syntax highlighting languages
		switch (language) {
			case 'python3':
				return 'python3'
			case 'bun':
				return 'json'
			case 'go':
				return 'go'
			case 'php':
				return 'json'
		}
	}
</script>

<WorkspaceDependenciesEditor
	bind:this={workspaceDependenciesEditor}
	on:create={loadWorkspaceDependencies}
/>

<SearchItems
	{filter}
	items={preFilteredItems}
	bind:filteredItems
	f={(x) => (x.name || 'Default') + ' ' + (x.language || '') + ' ' + (x.content || '')}
/>

<SettingsPageHeader
	title="依赖约束"
	description="依赖约束用于按语言定义脚本依赖。未命名配置会作为工作空间默认值，命名配置可通过 #raw_reqs 注释在脚本中引用。"
>
	{#snippet actions()}
		<Button
			unifiedSize="md"
			variant="accent"
			startIcon={{ icon: Plus }}
			onClick={createNewWorkspaceDependencies}
		>
			新增依赖约束
		</Button>
	{/snippet}
</SettingsPageHeader>

<div class="pt-2">
	<div class="relative text-tertiary">
		<input
			placeholder="按名称、语言或内容搜索依赖约束..."
			bind:value={filter}
			class="bg-surface !h-10 !px-4 !pr-10 !rounded-lg text-sm focus:outline-none w-full"
		/>
		<button aria-label="Search" type="submit" class="absolute right-0 top-0 mt-3 mr-4">
			<Search class="h-4 w-4" />
		</button>
	</div>
</div>

<div class="min-h-[56px]">
	<ListFilters bind:selectedFilter={languageFilter} filters={languages} />
</div>

<div class="relative overflow-x-auto pb-8 pr-4">
	{#if !filteredItems}
		<Skeleton layout={[0.5, [2], 1]} />
		{#each new Array(3) as _}
			<Skeleton layout={[[3.5], 0.5]} />
		{/each}
	{:else if filteredItems.length == 0}
		<div class="flex flex-col items-center justify-center h-full py-12">
			<FileText size={48} class="text-secondary mb-4" />
			<div class="text-md font-medium">未找到依赖约束</div>
			<div class="text-sm text-secondary mb-4">
				可以调整筛选条件，或新建依赖约束。
			</div>
			<Button startIcon={{ icon: Plus }} on:click={createNewWorkspaceDependencies}>
				创建第一个依赖约束
			</Button>
		</div>
	{:else}
		<DataTable size="xs">
			<Head>
				<tr>
					<Cell head first>名称</Cell>
					<Cell head>语言</Cell>
					<Cell head>说明</Cell>
					<Cell head>类型</Cell>
					<Cell head>编辑时间</Cell>
					<Cell head last>操作</Cell>
				</tr>
			</Head>
			<tbody class="divide-y">
				{#each filteredItems as deps}
					<Row>
						<Cell first>
							<div class="flex items-center gap-2">
								<FileText size={16} class="text-secondary" />
								<div class="flex flex-col">
									<button
										class="break-all hover:text-primary cursor-pointer font-medium text-left"
										onclick={() => editWorkspaceDependencies(deps)}
									>
										{#if deps.marked}
											{@html deps.marked}
										{:else}
											{workspaceDependenciesEditor?.getDisplayName(deps) ||
												deps.name ||
												`Default (${deps.language})`}
										{/if}
									</button>
									<span class="text-xs text-tertiary font-mono">
										{workspaceDependenciesEditor?.getFullFilename(deps.language, deps.name ?? null)}
										• {deps.language}
									</span>
								</div>
							</div>
						</Cell>
						<Cell>
							<div class="flex items-center gap-1">
								<Code2 size={14} class="text-secondary" />
								<span class="text-xs font-mono text-secondary">
									{deps.language || 'python3'}
								</span>
							</div>
						</Cell>
						<Cell>
							<span class="text-xs text-tertiary" title={deps.description}>
								{deps.description || '-'}
							</span>
						</Cell>
						<Cell>
							<span
								class="text-xs px-1.5 py-0.5 rounded bg-opacity-50 font-medium"
								class:bg-blue-100={deps.name === null}
								class:text-blue-700={deps.name === null}
								class:bg-gray-100={deps.name !== null}
								class:text-gray-600={deps.name !== null}
							>
								{deps.name === null ? 'Default' : 'Named'}
							</span>
						</Cell>
						<Cell>
							<span class="text-2xs text-secondary">
								<TimeAgo date={deps.created_at || ''} />
							</span>
						</Cell>
						<Cell last>
							<div class="flex gap-1 flex-wrap">
								<Button
									size="xs"
									variant="border"
									color="light"
									startIcon={{ icon: Eye }}
									on:click={() => viewWorkspaceDependencies(deps)}
								>
									查看
								</Button>
								<Button
									size="xs"
									variant="border"
									color="light"
									startIcon={{ icon: Edit }}
									on:click={() => editWorkspaceDependencies(deps)}
								>
									编辑
								</Button>
								<!-- Placeholder buttons -->
								<Button
									size="xs"
									variant="border"
									color="gray"
									on:click={() => archiveWorkspaceDependencies(deps)}
									title="归档"
								>
									归档
								</Button>
								<Button
									size="xs"
									variant="border"
									color="red"
									on:click={() => deleteWorkspaceDependencies(deps)}
									title="删除"
								>
									删除
								</Button>
								<Button
									size="xs"
									variant="border"
									color="gray"
									on:click={() => viewReferencedFrom(deps)}
									title="引用来源"
								>
									引用
								</Button>
							</div>
						</Cell>
					</Row>
				{/each}
			</tbody>
		</DataTable>
	{/if}
</div>

{#if $userStore?.is_admin || $userStore?.is_super_admin}
	<div class="border-t pt-8 mt-16 pb-12 pr-4 flex items-start justify-between gap-4">
		<div class="flex flex-col gap-0.5 min-w-0">
			<span class="text-xs font-medium text-secondary">重建依赖关系图</span>
			<span class="text-xs text-tertiary max-w-2xl">
				从头重建工作空间依赖关系图。通常不需要执行；仅当依赖追踪不同步，例如日志中出现孤立引用时使用。
			</span>
		</div>
		<Button
			size="xs"
			variant="border"
			color="light"
			startIcon={{ icon: RefreshCw }}
			disabled={rebuildingDependencyMap}
			onClick={rebuildDependencyMap}
		>
			重建
		</Button>
	</div>
{/if}

<Drawer bind:this={viewDrawer} size="900px">
	<DrawerContent title="查看依赖 - {viewPath}" on:close={viewDrawer?.closeDrawer}>
		{#snippet actions()}
			<div class="flex items-center gap-2">
				<Code2 size={16} class="text-secondary" />
				<span class="text-sm font-mono text-secondary">{viewLanguage}</span>
			</div>
		{/snippet}

		<div class="space-y-4">
			{#if viewContent}
				<HighlightCode language={getLanguageForHighlighting(viewLanguage)} code={viewContent} />
			{:else}
				<div class="text-center text-secondary py-8">
					<FileText size={48} class="mx-auto mb-4 opacity-50" />
					<p>该依赖暂无内容</p>
				</div>
			{/if}
		</div>
	</DrawerContent>
</Drawer>

{#if showDependencyWarning && currentImportedPath}
	<DependenciesDeploymentWarning
		importedPath={currentImportedPath}
		title={warningTitle}
		confirmText={warningConfirmText}
		onConfirm={handleWarningConfirm}
		onCancel={handleWarningCancel}
	/>
{/if}
