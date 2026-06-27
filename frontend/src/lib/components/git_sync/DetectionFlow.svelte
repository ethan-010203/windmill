<script lang="ts">
	import { FileSearch, Save, Loader2, CheckCircle2, XCircle } from 'lucide-svelte'
	import { Button, Alert } from '$lib/components/common'
	import { getGitSyncContext } from './GitSyncContext.svelte'
	import GitSyncFilterSettings from '$lib/components/workspaceSettings/GitSyncFilterSettings.svelte'
	import Toggle from '$lib/components/Toggle.svelte'
	import { sendUserToast } from '$lib/toast'
	import { workspaceStore } from '$lib/stores'
	import GitSyncModeDisplay from './GitSyncModeDisplay.svelte'

	let { idx, mode } = $props<{ idx: number; mode?: 'sync' | 'promotion' }>()

	const gitSyncContext = getGitSyncContext()
	const repo = $derived(gitSyncContext.getRepository(idx))
	let targetBranch = $state<string | undefined>(undefined)

	// Update target branch when repository changes
	$effect(() => {
		const abortController = new AbortController()

		if (repo?.git_repo_resource_path) {
			gitSyncContext
				.getTargetBranch(repo)
				.then((branch) => {
					if (!abortController.signal.aborted) {
						targetBranch = branch
					}
				})
				.catch((error) => {
					if (!abortController.signal.aborted) {
						console.warn('Failed to get target branch:', error)
					}
				})
		}

		return () => {
			abortController.abort()
		}
	})

	async function handleDetect() {
		if (!repo) {
			sendUserToast('Repository not found', true)
			return
		}

		try {
			await gitSyncContext.detectRepository(idx)
		} catch (error: any) {
			console.error('Detection failed:', error)
			sendUserToast('Detection failed: ' + error.message, true)
		}
	}

	async function handleInitialize() {
		if (!repo || repo.detectionState !== 'no-wmill') return

		try {
			// Show push modal for initialization
			gitSyncContext.showPushModal(idx)
		} catch (error: any) {
			console.error('Failed to initialize repository:', error)
			sendUserToast('Failed to initialize repository: ' + error.message, true)
		}
	}

	async function handleSaveConnection() {
		if (!repo || repo.detectionState !== 'has-wmill') return

		try {
			await gitSyncContext.saveRepository(idx)
			sendUserToast('Git sync connection saved successfully')
		} catch (error: any) {
			console.error('Failed to save connection:', error)
			sendUserToast('Failed to save connection: ' + error.message, true)
		}
	}
</script>

{#if repo}
	<div class="space-y-4">
		{#if !repo.detectionState || repo.detectionState === 'idle'}
			<!-- Folder grouping option for promotion mode -->
			{#if mode === 'promotion'}
				<div class="space-y-3">
					<Toggle
						disabled={!repo.git_repo_resource_path}
						bind:checked={repo.group_by_folder}
						options={{
							right: 'Group all changes from same folder in the same branch',
							rightTooltip:
								'开启后，系统会按文件夹创建分支，而不是为每个对象单独创建分支。'
						}}
					/>
				</div>
			{/if}

			<!-- Check repo settings button -->
			<div class="flex justify-start">
				<Button
					color="primary"
					variant="contained"
					size="lg"
					onclick={handleDetect}
					startIcon={{ icon: FileSearch }}
				>
					Check repo settings to continue and save
				</Button>
			</div>
		{:else if repo.detectionState === 'loading'}
			<!-- Loading state -->
			<div class="flex items-center gap-2">
				<Loader2 size={16} class="animate-spin" />
				<span class="text-sm">Checking repository...</span>
			</div>
		{:else if repo.detectionState === 'no-wmill'}
			<!-- No wmill.yaml found - new repository -->
			<Alert type="info" title="发现未初始化的 Git 仓库" class="mb-2">
				未找到 Git 同步配置，请在下方完成同步设置。
			</Alert>

			<GitSyncFilterSettings
				git_repo_resource_path={repo.git_repo_resource_path}
				bind:include_path={repo.settings.include_path}
				bind:include_type={repo.settings.include_type}
				bind:exclude_types_override={repo.exclude_types_override}
				isLegacyRepo={false}
				bind:excludes={repo.settings.exclude_path}
				bind:extraIncludes={repo.settings.extra_include_path}
				isInitialSetup={true}
				requiresMigration={false}
				useIndividualBranch={repo.use_individual_branch}
			/>

			<GitSyncModeDisplay {mode} {targetBranch} repository={repo} />

			<!-- Initialize button -->
			<div class="flex justify-start">
				<Button size="md" onclick={handleInitialize} startIcon={{ icon: Save }}>
					Initialize Git repository
				</Button>
			</div>
		{:else if repo.detectionState === 'has-wmill'}
			<!-- wmill.yaml found - existing repository -->
			<Alert type="success" title="发现已有 Git 同步配置" class="mb-2">
				已从仓库加载现有 Git 同步配置。
			</Alert>

			<GitSyncFilterSettings
				git_repo_resource_path={repo.git_repo_resource_path}
				bind:include_path={repo.settings.include_path}
				bind:include_type={repo.settings.include_type}
				bind:exclude_types_override={repo.exclude_types_override}
				isLegacyRepo={false}
				bind:excludes={repo.settings.exclude_path}
				bind:extraIncludes={repo.settings.extra_include_path}
				isInitialSetup={false}
				requiresMigration={false}
				useIndividualBranch={repo.use_individual_branch}
			/>

			<GitSyncModeDisplay {mode} {targetBranch} repository={repo} />

			<!-- Save connection button -->
			<div class="flex justify-start">
				<Button size="md" onclick={handleSaveConnection} startIcon={{ icon: Save }}>
					Save connection
				</Button>
			</div>
		{:else if repo.detectionState === 'error'}
			<!-- Error state -->
			<Alert type="error" title="Detection error" class="my-2">
				{repo.detectionError || 'Failed to check repository'}
			</Alert>
		{/if}

		<!-- Job status display -->
		{#if repo.detectionJobId && (repo.detectionState === 'loading' || repo.detectionState === 'error')}
			<div class="flex items-center gap-2 text-xs text-primary">
				{#if repo.detectionJobStatus === 'running'}
					<Loader2 class="animate-spin" size={14} />
				{:else if repo.detectionJobStatus === 'success'}
					<CheckCircle2 size={14} class="text-green-600" />
				{:else if repo.detectionJobStatus === 'failure'}
					<XCircle size={14} class="text-red-700" />
				{/if}
				Detection job:
				<a
					target="_blank"
					class="underline"
					href={`/run/${repo.detectionJobId}?workspace=${$workspaceStore}`}
				>
					{repo.detectionJobId}
				</a>
			</div>
		{/if}
	</div>
{/if}
