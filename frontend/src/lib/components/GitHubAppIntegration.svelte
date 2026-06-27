<script lang="ts">
	import { workspaceStore, enterpriseLicense, userStore } from '$lib/stores'
	import Popover from './meltComponents/Popover.svelte'
	import Button from './common/button/Button.svelte'
	import { Loader2, Github, RotateCw, Plus, Minus, Download, AlertTriangle } from 'lucide-svelte'
	import { onDestroy } from 'svelte'
	import {
		createGitHubAppState,
		loadGithubInstallations,
		startInstallationCheck,
		stopInstallationCheck,
		addInstallationToWorkspace,
		deleteInstallation,
		exportInstallation,
		importInstallation,
		applyRepositoryURL,
		handleInstallClick,
		type GitHubAppState
	} from '$lib/githubApp'
	import { base } from '$lib/base'
	import RepositorySelector from './RepositorySelector.svelte'

	interface Props {
		resourceType: string
		args?: Record<string, any>
		description?: string
		onArgsUpdate?: (args: Record<string, any>) => void
		onDescriptionUpdate?: (description: string) => void
	}

	let {
		resourceType,
		args = {},
		description = '',
		onArgsUpdate,
		onDescriptionUpdate
	}: Props = $props()

	// GitHub App state using the service utilities
	let githubState: GitHubAppState = $state(createGitHubAppState())
	let githubAppPopover: { open: () => void; close: () => void } | null = $state(null)

	// Filter and deduplicate installations not in current workspace
	let githubInstallationsNotInWorkspace = $derived(
		githubState.githubInstallations
			.filter(
				(installation) =>
					!githubState.workspaceGithubInstallations.some(
						(workspaceInstallation) =>
							workspaceInstallation.installation_id === installation.installation_id
					)
			)
			.filter(
				(installation, index, array) =>
					array.findIndex((item) => item.installation_id === installation.installation_id) === index
			)
	)

	let showGitHubApp = $derived(
		resourceType === 'git_repository' &&
			$workspaceStore &&
			($userStore?.is_admin || $userStore?.is_super_admin)
	)

	// Load GitHub installations when conditions are met
	$effect(() => {
		if (showGitHubApp && $enterpriseLicense && $workspaceStore) {
			loadGithubInstallations(githubState, $workspaceStore).catch((error) => {
				console.error('Failed to load GitHub installations:', error)
			})
		}
	})

	// Clean up interval when component is destroyed
	onDestroy(() => {
		stopInstallationCheck(githubState)
	})

	// Extracted event handlers for better maintainability
	function handleApplyRepositoryURL(close: (_: any) => void) {
		try {
			applyRepositoryURL(
				githubState,
				args,
				description,
				(newArgs) => {
					if (onArgsUpdate) {
						onArgsUpdate(newArgs)
					}
				},
				(newDescription) => {
					if (onDescriptionUpdate) {
						onDescriptionUpdate(newDescription)
					}
				}
			)
			close(null)
		} catch (error) {
			console.error('Failed to apply repository URL:', error)
		}
	}

	async function handleDeleteInstallation(installationId: number) {
		if (!$workspaceStore) return

		try {
			await deleteInstallation($workspaceStore, installationId, () =>
				loadGithubInstallations(githubState, $workspaceStore!)
			)
		} catch (error) {
			console.error('Failed to delete installation:', error)
		}
	}

	async function handleAddInstallation(installationId: number, workspaceId: string) {
		if (!$workspaceStore) return

		try {
			await addInstallationToWorkspace($workspaceStore, installationId, workspaceId, () =>
				loadGithubInstallations(githubState, $workspaceStore!)
			)
		} catch (error) {
			console.error('Failed to add installation:', error)
		}
	}

	async function handleExportInstallation(installationId: number) {
		if (!$workspaceStore) return

		try {
			await exportInstallation($workspaceStore, installationId)
		} catch (error) {
			console.error('Failed to export installation:', error)
		}
	}

	async function handleImportInstallation() {
		if (!$workspaceStore) return

		try {
			await importInstallation($workspaceStore, githubState.importJwt, () => {
				githubState.importJwt = ''
				loadGithubInstallations(githubState, $workspaceStore!)
			})
		} catch (error) {
			console.error('Failed to import installation:', error)
		}
	}

	function handleRefreshInstallations() {
		if (!$workspaceStore) return

		loadGithubInstallations(githubState, $workspaceStore).catch((error) => {
			console.error('Failed to refresh installations:', error)
		})
	}

	function handleInstallClickWithPopover() {
		if (!$workspaceStore) return

		handleInstallClick(githubState, $workspaceStore, () => {
			githubAppPopover?.open()
		})
	}
</script>

{#if showGitHubApp}
	{#if !githubState.loadingGithubInstallations}
		<Button
			variant="default"
			size="xs"
			on:click={handleRefreshInstallations}
			disabled={!$enterpriseLicense}
			startIcon={{ icon: RotateCw }}
		/>
	{:else}
		<Loader2 class="animate-spin w-10 h-4" />
	{/if}
	{#if showGitHubApp}
		<Popover
			documentationLink={`${base}/tutorials`}
			bind:this={githubAppPopover}
			disabled={!$enterpriseLicense || githubState.loadingGithubInstallations}
			contentClasses="overflow-auto"
		>
			{#snippet trigger()}
				<Button
					variant="default"
					size="xs"
					disabled={!$enterpriseLicense || githubState.loadingGithubInstallations}
					startIcon={{
						icon: githubState.loadingGithubInstallations ? Loader2 : Github,
						classes: githubState.loadingGithubInstallations ? 'animate-spin' : ''
					}}
					nonCaptureEvent
				>
					{$enterpriseLicense ? 'GitHub App' : 'GitHub App（受限）'}
				</Button>
			{/snippet}
			{#snippet content({ close })}
				<div class="block text-primary p-4">
					<div class="flex flex-col gap-4 w-[600px]">
						{#if githubState.workspaceGithubInstallations.length > 0}
							<div class="flex flex-col gap-2">
								<p class="text-sm font-semibold text-secondary">选择仓库</p>
								<div class="flex flex-row gap-2 w-full">
									<div class="flex flex-col gap-1 flex-1">
										<p class="text-sm font-semibold text-secondary">GitHub 账号 ID</p>
										<select bind:value={githubState.selectedGHAppAccountId}>
											<option value="" disabled>选择 GitHub 账号 ID</option>
											{#each githubState.workspaceGithubInstallations as installation (`select-${installation.installation_id}-${installation.workspace_id}`)}
												<option value={installation.account_id} disabled={!!installation.error}>
													{installation.account_id}{installation.error ? '（令牌错误）' : ''}
												</option>
											{/each}
										</select>
									</div>
									{#if githubState.selectedGHAppAccountId}
										{@const selectedInstallation = githubState.workspaceGithubInstallations.find(
											(inst) => inst.account_id === githubState.selectedGHAppAccountId
										)}
										{#if selectedInstallation}
											<div class="flex flex-col gap-1 flex-1">
												<p class="text-sm font-semibold text-secondary">仓库</p>
												<RepositorySelector
													bind:selectedRepository={githubState.selectedGHAppRepository}
													accountId={githubState.selectedGHAppAccountId}
													initialRepositories={selectedInstallation.repositories}
													totalCount={selectedInstallation.total_count}
													perPage={selectedInstallation.per_page}
												/>
											</div>
										{/if}
									{/if}
									<div class="pt-[26px]">
										<Button
											size="xs"
											variant="accent"
											buttonType="button"
											disabled={!githubState.selectedGHAppRepository}
											on:click={() => handleApplyRepositoryURL(close)}
										>
											应用
										</Button>
									</div>
								</div>
							</div>
						{/if}

						<div
							class={`${
								githubState.workspaceGithubInstallations.length > 0
									? 'border-t border-gray-200 dark:border-gray-700'
									: ''
							} pt-4`}
						>
							<div class="flex flex-col gap-4">
								<div class="flex">
									<Button
										variant="default"
										size="xs"
										href={githubState.githubInstallationUrl}
										startIcon={{
											icon: githubState.isCheckingInstallation ? Loader2 : Plus,
											classes: githubState.isCheckingInstallation ? 'animate-spin' : ''
										}}
										target="_blank"
										disabled={githubState.isCheckingInstallation}
										on:click={() => {
											if ($workspaceStore) {
												startInstallationCheck(githubState, $workspaceStore, () =>
													loadGithubInstallations(githubState, $workspaceStore!)
												)
											}
										}}
									>
										{githubState.isCheckingInstallation
											? '正在检查新的安装...'
											: '添加新安装'}
									</Button>
								</div>
								{#if githubState.workspaceGithubInstallations.length > 0}
									<div class="flex flex-col gap-2">
										<p class="text-sm font-semibold text-secondary">当前安装：</p>
										<div class="flex flex-col gap-1">
											<table class="w-full text-sm">
												<thead>
													<tr class="text-left text-xs text-primary">
														<th class="pb-2 w-1/3">组织</th>
														<th class="pb-2 w-1/6">工作区</th>
														<th class="pb-2 w-1/6">仓库</th>
														<th class="pb-2 w-1/3"></th>
													</tr>
												</thead>
												<tbody>
													{#each githubState.workspaceGithubInstallations as installation (`current-${installation.installation_id}-${installation.workspace_id}`)}
														<tr class="border-t border-gray-200 dark:border-gray-700">
															<td class="py-2">
																<div class="flex items-center gap-1 flex-wrap">
																	{#if installation.error}
																		<span title={installation.error}>
																			<AlertTriangle class="w-4 h-4 text-yellow-500" />
																		</span>
																	{/if}
																	{installation.account_id}
																	{#if installation.provisioned_by_admin}
																		<span
																			class="text-2xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
																			title="由实例超级管理员在实例设置中分配，仅超级管理员可以移除。"
																		>
																			管理员分配
																		</span>
																	{/if}
																</div>
															</td>
															<td class="py-2">
																<span class="text-xs text-primary">{installation.workspace_id}</span
																>
															</td>
															<td class="py-2 text-primary">
																{#if installation.error}
																	<span
																		class="text-yellow-600 dark:text-yellow-400 text-xs"
																		title={installation.error}>令牌错误</span
																	>
																{:else}
																	{installation.repositories.length} 个仓库
																{/if}
															</td>
															<td class="py-2 text-right">
																<div class="flex justify-end gap-1">
																	{#if !installation.github_base_url}
																		<Button
																			size="xs2"
																			variant="accent"
																			title="导出安装到其他实例"
																			startIcon={{ icon: Download }}
																			on:click={() =>
																				handleExportInstallation(installation.installation_id)}
																		>
																			导出
																		</Button>
																	{/if}
																	{#if !installation.provisioned_by_admin}
																		<Button
																			size="xs2"
																			variant="default"
																			destructive
																			title="从工作区移除安装"
																			startIcon={{ icon: Minus }}
																			on:click={() =>
																				handleDeleteInstallation(installation.installation_id)}
																		>
																			移除
																		</Button>
																	{/if}
																</div>
															</td>
														</tr>
													{/each}
												</tbody>
											</table>
										</div>
									</div>
								{/if}
								{#if githubInstallationsNotInWorkspace.length > 0}
									<div class="flex flex-col gap-2">
										<p class="text-sm font-semibold text-secondary"
											>其他工作区中的安装：</p
										>
										<div class="flex flex-col gap-1">
											<table class="w-full text-sm">
												<thead>
													<tr class="text-left text-xs text-primary">
														<th class="pb-2 w-1/3">组织</th>
														<th class="pb-2 w-1/6">工作区</th>
														<th class="pb-2 w-1/6">仓库</th>
														<th class="pb-2 w-1/3"></th>
													</tr>
												</thead>
												<tbody>
													{#each githubInstallationsNotInWorkspace as installation (`other-${installation.installation_id}-${installation.workspace_id}`)}
														<tr class="border-t border-gray-200 dark:border-gray-700">
															<td class="py-2">
																<div class="flex items-center gap-1">
																	{#if installation.error}
																		<span title={installation.error}>
																			<AlertTriangle class="w-4 h-4 text-yellow-500" />
																		</span>
																	{/if}
																	{installation.account_id}
																</div>
															</td>
															<td class="py-2">
																<span class="text-xs text-primary">{installation.workspace_id}</span
																>
															</td>
															<td class="py-2 text-primary">
																{#if installation.error}
																	<span
																		class="text-yellow-600 dark:text-yellow-400 text-xs"
																		title={installation.error}>令牌错误</span
																	>
																{:else}
																	{installation.repositories.length} 个仓库
																{/if}
															</td>
															<td class="pl-8 py-2 text-right">
																<Button
																	size="xs2"
																	variant="accent"
																	title="添加安装到当前工作区"
																	startIcon={{ icon: Plus }}
																	on:click={() => {
																		if (installation.workspace_id) {
																			handleAddInstallation(
																				installation.installation_id,
																				installation.workspace_id
																			)
																		}
																	}}
																>
																	添加到工作区
																</Button>
															</td>
														</tr>
													{/each}
												</tbody>
											</table>
										</div>
									</div>
								{/if}
							</div>
						</div>

						{#if !githubState.isGhesSelfManaged}
							<div class="mt-4 flex flex-col gap-2">
								<p class="text-sm font-semibold text-secondary"
									>从其他实例导入安装：</p
								>
								<div class="flex gap-2">
									<input
										type="text"
										placeholder="粘贴 JWT 令牌"
										bind:value={githubState.importJwt}
										class="flex-1"
									/>
									<Button
										variant="accent"
										on:click={handleImportInstallation}
										disabled={!githubState.importJwt}
									>
										导入
									</Button>
								</div>
							</div>
						{/if}
					</div>
				</div>
			{/snippet}
		</Popover>
	{:else}
		<Button
			variant="default"
			size="xs"
			disabled={!$enterpriseLicense || githubState.loadingGithubInstallations}
			startIcon={{
				icon:
					githubState.loadingGithubInstallations || githubState.isCheckingInstallation
						? Loader2
						: Github,
				classes:
					githubState.loadingGithubInstallations || githubState.isCheckingInstallation
						? 'animate-spin'
						: ''
			}}
			href={githubState.githubInstallationUrl}
			target="_blank"
			on:click={handleInstallClickWithPopover}
		>
			{$enterpriseLicense
				? githubState.isCheckingInstallation
					? '等待安装完成...'
					: '安装 GitHub App'
				: 'GitHub App（受限）'}
		</Button>
	{/if}
{/if}
