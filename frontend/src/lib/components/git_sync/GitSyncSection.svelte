<script lang="ts">
	import { ChevronDown, ChevronRight, Plus } from 'lucide-svelte'
	import { Button, Alert } from '$lib/components/common'
	import SettingsPageHeader from '$lib/components/settings/SettingsPageHeader.svelte'
	import { setGitSyncContext } from './GitSyncContext.svelte'
	import GitSyncRepositoryCard from './GitSyncRepositoryCard.svelte'
	import GitSyncModalManager from './GitSyncModalManager.svelte'
	import { enterpriseLicense, workspaceStore } from '$lib/stores'
	import { WorkspaceService } from '$lib/gen'
	import { sendUserToast } from '$lib/toast'
	import { untrack } from 'svelte'

	// Create context reactively based on workspaceStore
	const gitSyncContext = $derived($workspaceStore ? setGitSyncContext($workspaceStore) : null)

	// Fetch git sync eligibility
	let gitSyncStatus = $state<{
		enabled: boolean
		reason: string | null
		max_repos: number | null
		user_count: number | null
		max_users: number | null
	}>({ enabled: false, reason: null, max_repos: null, user_count: null, max_users: null })

	$effect(() => {
		if ($workspaceStore) {
			WorkspaceService.getGitSyncEnabled({ workspace: $workspaceStore })
				.then((status) => {
					gitSyncStatus = status as typeof gitSyncStatus
				})
				.catch(() => {
					gitSyncStatus = {
						enabled: false,
						reason: null,
						max_repos: null,
						user_count: null,
						max_users: null
					}
				})
		}
	})

	const gitSyncAllowed = $derived(gitSyncStatus.enabled)
	const isFreeTier = $derived(gitSyncAllowed && !$enterpriseLicense)
	const hasConfiguredRepos = $derived(
		gitSyncContext?.repositories?.some((r) => r.git_repo_resource_path) ?? false
	)

	// Load settings when workspace context changes
	$effect(() => {
		if (gitSyncContext) {
			untrack(async () => {
				try {
					await gitSyncContext.loadSettings()
				} catch (error) {
					console.error('Failed to load git sync settings:', error)
					sendUserToast('Failed to load git sync settings', true)
				}
			})
		}
	})

	// Derived state for repository categorization
	const primarySync = $derived(gitSyncContext?.getPrimarySyncRepository() || null)
	const primaryPromotion = $derived(gitSyncContext?.getPrimaryPromotionRepository() || null)
	const secondarySync = $derived(gitSyncContext?.getSecondarySyncRepositories() || [])
	const secondaryPromotion = $derived(gitSyncContext?.getSecondaryPromotionRepositories() || [])

	// State for collapsible sections
	let secondarySyncExpanded = $state(false)
	let secondaryPromotionExpanded = $state(false)

	// Check if any secondary repositories are unsaved
	const hasUnsavedSecondary = $derived(secondarySync.some((s) => s.repo.isUnsavedConnection))
	const hasUnsavedSecondaryPromotion = $derived(
		secondaryPromotion.some((s) => s.repo.isUnsavedConnection)
	)
</script>

{#if !gitSyncContext}
	<div class="flex items-center justify-center p-8">
		<div class="text-sm text-secondary">Loading workspace...</div>
	</div>
{:else if gitSyncContext.loading}
	<div class="flex items-center justify-center p-8">
		<div class="text-sm text-secondary">Loading git sync settings...</div>
	</div>
{:else}
	<SettingsPageHeader
		title="Git 同步"
		description="连接 Git 仓库后，可以在部署脚本、流程和应用时自动提交并推送变更。"
	>
		{#snippet actions()}
			{#if (gitSyncAllowed || gitSyncStatus.user_count != null) && gitSyncContext?.repositories != undefined}
				<Button
					variant="accent"
					target="_blank"
					href={`/runs?job_kinds=deploymentcallbacks&workspace=${$workspaceStore}`}
				>
					查看同步任务
				</Button>
			{/if}
		{/snippet}
	</SettingsPageHeader>
	<Alert type="info" title="只有新的变更会触发同步">
		只有符合筛选条件的新变更会触发 Git 同步。如需同步已有内容，请先完成仓库初始化。
	</Alert>
	{#if !gitSyncAllowed}
		<div class="mb-2"></div>

		<Alert type={hasConfiguredRepos ? 'error' : 'warning'} title="Git 同步未启用">
			当前部署仅允许成员数不超过 {gitSyncStatus.max_users} 的工作空间使用 Git
			同步。当前工作空间有 {gitSyncStatus.user_count} 名成员。下方配置会保留，但暂时不会执行同步。
		</Alert>
		<div class="mb-2"></div>
	{:else if isFreeTier}
		<div class="mb-2"></div>

		<Alert type="warning" title="Git 同步限制">
			当前部署仅开放单仓库同步。多仓库、推广模式和 GitHub App 认证暂不开放。
		</Alert>
		<div class="mb-2"></div>
	{/if}
	{#if (gitSyncAllowed || gitSyncStatus.user_count != null) && gitSyncContext?.repositories != undefined}
		<!-- Primary Sync Repository -->
		<div class="space-y-6 pt-6">
			<GitSyncRepositoryCard
				variant="primary-sync"
				mode="sync"
				idx={primarySync?.idx ?? null}
				repository={primarySync?.repo ?? null}
				onAdd={() => gitSyncContext.addSyncRepository()}
				isCollapsible={false}
				showEmptyState={primarySync?.repo === null}
			/>

			{#if $enterpriseLicense}
				<!-- Secondary Sync Repositories (EE only) -->
				{#if primarySync && !primarySync.repo?.isUnsavedConnection}
					{#if secondarySync.length > 0 || secondarySyncExpanded}
						<div class="mt-4">
							<button
								class="flex items-center gap-2 text-sm text-secondary hover:text-primary transition-colors"
								onclick={() => (secondarySyncExpanded = !secondarySyncExpanded)}
							>
								{#if secondarySyncExpanded}
									<ChevronDown size={16} />
								{:else}
									<ChevronRight size={16} />
								{/if}
								辅助同步仓库（{secondarySync.length}）
							</button>

							{#if secondarySyncExpanded}
								<div class="mt-3 space-y-3">
									{#if secondarySync.length === 0}
										<div class="text-sm text-secondary italic">
											尚未配置辅助同步仓库
										</div>
									{:else}
										{#each secondarySync as { repo, idx } (repo.git_repo_resource_path)}
											<div class="pl-4">
												<GitSyncRepositoryCard variant="secondary" {idx} isSecondary={true} />
											</div>
										{/each}
									{/if}

									{#if !hasUnsavedSecondary}
										<div class="pl-4">
											<Button
												size="xs"
												variant="default"
												startIcon={{ icon: Plus }}
												onclick={() => gitSyncContext.addSyncRepository()}
											>
												添加辅助同步
											</Button>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{:else}
						<!-- Collapsed state when no secondary repos exist -->
						{#if !hasUnsavedSecondary}
							<div class="mt-2">
								<button
									class="text-xs text-primary hover:text-secondary transition-colors"
									onclick={() => {
										secondarySyncExpanded = true
										gitSyncContext.addSyncRepository()
									}}
								>
									+ 添加辅助同步仓库
								</button>
							</div>
						{/if}
					{/if}
				{/if}

				<!-- Primary Promotion Repository (EE only) -->
				<div class="mt-6">
					<GitSyncRepositoryCard
						variant="primary-promotion"
						mode="promotion"
						idx={primaryPromotion?.idx ?? null}
						repository={primaryPromotion?.repo ?? null}
						onAdd={() => gitSyncContext.addPromotionRepository()}
						isCollapsible={false}
						showEmptyState={primaryPromotion?.repo === null}
					/>

					<!-- Secondary Promotion Repositories -->
					{#if primaryPromotion && !primaryPromotion.repo?.isUnsavedConnection}
						{#if secondaryPromotion.length > 0 || secondaryPromotionExpanded}
							<div class="mt-4">
								<button
									class="flex items-center gap-2 text-sm text-secondary hover:text-primary transition-colors"
									onclick={() => (secondaryPromotionExpanded = !secondaryPromotionExpanded)}
								>
									{#if secondaryPromotionExpanded}
										<ChevronDown size={16} />
									{:else}
										<ChevronRight size={16} />
									{/if}
									辅助推广仓库（{secondaryPromotion.length}）
								</button>

								{#if secondaryPromotionExpanded}
									<div class="mt-3 space-y-3">
										{#if secondaryPromotion.length === 0}
											<div class="text-sm text-secondary italic">
											尚未配置辅助推广仓库
											</div>
										{:else}
											{#each secondaryPromotion as { repo, idx } (repo.git_repo_resource_path)}
												<div class="pl-4">
													<GitSyncRepositoryCard variant="secondary" {idx} isSecondary={true} />
												</div>
											{/each}
										{/if}

										{#if !hasUnsavedSecondaryPromotion}
											<div class="pl-4">
												<Button
													size="xs"
													variant="default"
													startIcon={{ icon: Plus }}
													onclick={() => gitSyncContext.addPromotionRepository()}
												>
													添加辅助推广
												</Button>
											</div>
										{/if}
									</div>
								{/if}
							</div>
						{:else}
							<!-- Collapsed state when no secondary promotion repos exist -->
							{#if !hasUnsavedSecondaryPromotion}
								<div class="mt-2">
									<button
										class="text-xs text-primary hover:text-secondary transition-colors"
										onclick={() => {
											secondaryPromotionExpanded = true
											gitSyncContext.addPromotionRepository()
										}}
									>
										+ 添加辅助推广仓库
									</button>
								</div>
							{/if}
						{/if}
					{/if}
				</div>
			{/if}
		</div>

		<!-- Modals -->
		<GitSyncModalManager />
	{/if}
{/if}
