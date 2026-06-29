<script lang="ts">
	import { run } from 'svelte/legacy'

	import {
		JobService,
		ResourceService,
		SettingService,
		UserService,
		VariableService,
		WorkspaceService,
		type CompletedJob
	} from '$lib/gen'
	import { validateUsername } from '$lib/utils'
	import { logoutWithRedirect } from '$lib/logoutKit'
	import { page } from '$app/state'
	import { usersWorkspaceStore, workspaceStore } from '$lib/stores'
	import { Button } from '$lib/components/common'
	import Toggle from '$lib/components/Toggle.svelte'
	import Tooltip from '$lib/components/Tooltip.svelte'
	import { onMount } from 'svelte'
	import { sendUserToast } from '$lib/toast'
	import TestAIKey from '$lib/components/copilot/TestAIKey.svelte'
	import { switchWorkspace } from '$lib/storeUtils'
	import { isCloudHosted } from '$lib/cloud'
	import ToggleButtonGroup from '$lib/components/common/toggleButton-v2/ToggleButtonGroup.svelte'
	import ToggleButton from '$lib/components/common/toggleButton-v2/ToggleButton.svelte'
	import {
		AI_PROVIDERS,
		VISIBLE_AI_PROVIDERS,
		type VisibleAIProvider
	} from '$lib/components/copilot/lib'
	import { LoaderCircle, Trash2 } from 'lucide-svelte'
	import PrefixedInput from '../PrefixedInput.svelte'
	import ConfirmationModal from '../common/confirmationModal/ConfirmationModal.svelte'
	import TextInput from '../text_input/TextInput.svelte'
	import { jobManager } from '$lib/services/JobManager'
	import Alert from '../common/alert/Alert.svelte'
	import { base } from '$lib/base'
	import Label from '../Label.svelte'
	import ForkDatatableSection from './ForkDatatableSection.svelte'

	interface Props {
		isFork?: boolean
		onFinish?: () => void
	}

	let { isFork = false, onFinish }: Props = $props()

	let id = $state('')
	let name = $state('')
	let username = $state('')

	let errorId = $state('')
	let errorUser = $state('')
	let aiKey = $state('')
	let codeCompletionEnabled = $state(true)
	let checking = $state(false)

	let forkDatatableSection: ReturnType<typeof ForkDatatableSection> | undefined = $state(undefined)

	let workspaceColor: string | undefined = $state(undefined)
	let colorEnabled = $state(false)

	function generateRandomColor() {
		const randomColor =
			'#' +
			Math.floor(Math.random() * 16777215)
				.toString(16)
				.padStart(6, '0')
		workspaceColor = randomColor
	}

	async function validateName(id: string): Promise<void> {
		checking = true
		// For forks the actual workspace id is prefixed: checking the bare id
		// would report the name as free even when `wm-fork-<id>` is taken
		// (e.g. by an archived fork, which keeps its id reserved).
		const effectiveId = isFork ? `${WM_FORK_PREFIX}${id}` : id
		let exists =
			id != '' && (await WorkspaceService.existsWorkspace({ requestBody: { id: effectiveId } }))
		forkIdTaken = isFork && exists
		if (exists) {
			errorId = isFork
				? `A workspace with id '${effectiveId}' already exists. It may be an archived fork: archiving keeps the id reserved.`
				: 'ID already exists'
		} else if (id != '' && !/^\w+(-\w+)*$/.test(id)) {
			errorId = 'ID can only contain letters, numbers and dashes and must not finish by a dash'
		} else {
			errorId = ''
		}
		checking = false
	}

	const WM_FORK_PREFIX = 'wm-fork-'

	let forkIdTaken = $state(false)
	let deleteExistingForkOpen = $state(false)
	let deletingExistingFork = $state(false)

	async function deleteExistingFork(): Promise<void> {
		if (deletingExistingFork) return
		const prefixedId = `${WM_FORK_PREFIX}${id}`
		deletingExistingFork = true
		try {
			await WorkspaceService.deleteWorkspace({ workspace: prefixedId })
			sendUserToast(`Permanently deleted workspace ${prefixedId}`)
			deleteExistingForkOpen = false
			await validateName(id)
		} catch (e: any) {
			sendUserToast(`Failed to delete workspace ${prefixedId}: ${e?.body?.toString() ?? e}`, true)
		} finally {
			deletingExistingFork = false
		}
	}

	let forkCreationLoading = $state(false)
	let forkCreationError = $state('')
	let errorMsgs: string[] = $state([])
	let failedSyncJobs: string[] = $state([])

	async function fetchFailedSyncJobs(jobs: string[]): Promise<CompletedJob[]> {
		let ret: CompletedJob[] = []
		for (const job of jobs) {
			let j = await JobService.getCompletedJob({
				id: job,
				workspace: $workspaceStore!
			})
			ret.push(j)
		}
		return ret
	}

	function isPathVersionLessThan(path: string | undefined, version: number): boolean {
		if (!path || !path.startsWith('hub/')) {
			return false
		}

		const parts = path.split('/')

		if (parts.length < 2) {
			return false
		}

		const embeddedVersion = parseInt(parts[1], 10)

		if (isNaN(embeddedVersion)) {
			return false
		}

		return embeddedVersion < version
	}

	async function createOrForkWorkspace() {
		const prefixed_id = `${WM_FORK_PREFIX}${id}`
		if (isFork) {
			await forkWorkspace(prefixed_id)
		} else {
			await createWorkspace()
		}
	}

	async function forkWorkspace(prefixed_id: string): Promise<void> {
		if ($workspaceStore) {
			forkCreationLoading = true
			errorMsgs = []
			failedSyncJobs = []
			forkCreationError = ''

			// Clone datatables BEFORE creating the workspace fork
			if (forkDatatableSection) {
				const queue = forkDatatableSection.buildCloneQueue(prefixed_id)
				if (queue.length > 0) {
					forkDatatableSection.startCloning(queue)
					return
				}
			}

			await completeFork(prefixed_id)
		} else {
			sendUserToast('未选择工作区，无法从不存在的工作区创建副本', true)
		}
	}

	async function completeFork(prefixed_id: string): Promise<void> {
		let gitSyncJobIds = await WorkspaceService.createWorkspaceForkGitBranch({
			workspace: $workspaceStore!,
			requestBody: {
				id: prefixed_id,
				name,
				color: colorEnabled && workspaceColor ? workspaceColor : undefined
			}
		})

		try {
			await Promise.all(
				gitSyncJobIds.map((jobId) =>
					jobManager.runWithProgress(() => Promise.resolve(jobId), {
						workspace: $workspaceStore!,
						timeout: 60000,
						timeoutMessage: `部署副本任务 60 秒后超时`,
						onProgress: (status) => {
							if (status.status === 'failure') {
								errorMsgs.push(status.error ?? '部署副本任务失败')
								failedSyncJobs.push(jobId)
							}
						}
					})
				)
			)
		} catch (error) {
			forkCreationLoading = false
			sendUserToast(
				`无法复制工作区 ${$workspaceStore}，因为分支创建失败：${errorMsgs} - ${error}`,
				true
			)
			return
		}
		if (errorMsgs.length != 0) {
			forkCreationError = '无法在 Git 同步仓库中为此副本创建分支'
			forkCreationLoading = false
			sendUserToast(`无法复制工作区 ${$workspaceStore}，因为分支创建失败：${errorMsgs}`, true)
			return
		}

		// Build forked_datatables info from completed clone jobs
		const forkedDatatables = forkDatatableSection
			? forkDatatableSection.getCompletedCloneJobs().map((job) => ({
					name: job.name,
					new_dbname: job._newDbName
				}))
			: []

		try {
			await WorkspaceService.createWorkspaceFork({
				workspace: $workspaceStore!,
				requestBody: {
					id: prefixed_id,
					name,
					color: colorEnabled && workspaceColor ? workspaceColor : undefined,
					forked_datatables: forkedDatatables
				}
			})
		} catch (e) {
			forkCreationError = `无法创建副本 '${prefixed_id}'`
			errorMsgs.push(e?.body ?? e ?? '未知错误')
			forkCreationLoading = false
			sendUserToast(`无法创建副本 '${prefixed_id}' ${e}`, true)
			return
		}

		forkCreationLoading = false
		sendUserToast(`已将工作区 ${$workspaceStore} 复制为：wm-fork-${id}`)

		usersWorkspaceStore.set(await WorkspaceService.listUserWorkspaces())
		switchWorkspace(prefixed_id)

		onFinish?.()
	}

	async function createWorkspace(): Promise<void> {
		await WorkspaceService.createWorkspace({
			requestBody: {
				id,
				name,
				color: colorEnabled && workspaceColor ? workspaceColor : undefined,
				username: automateUsernameCreation ? undefined : username
			}
		})
		if (auto_invite) {
			await WorkspaceService.editAutoInvite({
				workspace: id,
				requestBody: { operator: operatorOnly, invite_all: !isCloudHosted(), auto_add: autoAdd }
			})
		}
		if (aiKey != '') {
			let actualUsername = username
			if (automateUsernameCreation) {
				const user = await UserService.whoami({
					workspace: id
				})
				actualUsername = user.username
			}
			let path = `u/${actualUsername}/${selected}_windmill_codegen`
			await VariableService.createVariable({
				workspace: id,
				requestBody: {
					path,
					value: aiKey,
					is_secret: true,
					description: 'Ai token'
				}
			})
			await ResourceService.createResource({
				workspace: id,
				requestBody: {
					path,
					value: {
						api_key: '$var:' + path
					},
					resource_type: selected
				}
			})
			await WorkspaceService.editCopilotConfig({
				workspace: id,
				requestBody: aiKey
					? {
							providers: {
								[selected]: {
									resource_path: path,
									models: [AI_PROVIDERS[selected].defaultModels[0]]
								}
							},
							default_model: {
								model: AI_PROVIDERS[selected].defaultModels[0],
								provider: selected
							},
							code_completion_model: codeCompletionEnabled
								? { model: AI_PROVIDERS[selected].defaultModels[0], provider: selected }
								: undefined
						}
					: {}
			})

			usersWorkspaceStore.set(await WorkspaceService.listUserWorkspaces())
			switchWorkspace(id)
		}

		sendUserToast(`已创建工作区 ID：${id}`)

		usersWorkspaceStore.set(await WorkspaceService.listUserWorkspaces())
		switchWorkspace(id)
		onFinish?.()
	}

	function handleKeyUp(event: KeyboardEvent) {
		const key = event.key
		if (key === 'Enter') {
			event.preventDefault()
			createWorkspace()
		}
	}

	async function loadWorkspaces() {
		if (!$usersWorkspaceStore) {
			try {
				usersWorkspaceStore.set(await WorkspaceService.listUserWorkspaces())
			} catch {}
		}
		if (!$usersWorkspaceStore) {
			const url = page.url
			console.log('logout 2')
			await logoutWithRedirect(url.href.replace(url.origin, ''))
		}
	}

	let automateUsernameCreation = $state(true)
	async function getAutomateUsernameCreationSetting() {
		automateUsernameCreation =
			((await SettingService.getGlobal({ key: 'automate_username_creation' })) as any) ?? true

		if (!automateUsernameCreation) {
			UserService.globalWhoami().then((x) => {
				let uname = ''
				if (x.name) {
					uname = x.name.split(' ')[0]
				} else {
					uname = x.email.split('@')[0]
				}
				uname = uname.replace(/\./gi, '')
				username = uname.toLowerCase()
			})
		}
	}
	getAutomateUsernameCreationSetting()

	onMount(() => {
		loadWorkspaces()

		WorkspaceService.isDomainAllowed().then((x) => {
			isDomainAllowed = x
		})
	})

	let isDomainAllowed: undefined | boolean = $state(undefined)

	let auto_invite = $state(false)
	let operatorOnly = $state(false)
	let autoAdd = $state(true)
	type QuickWorkspaceAIProvider = Exclude<VisibleAIProvider, 'customai'>
	const QUICK_WORKSPACE_AI_PROVIDER_KEYS = [
		'openai',
		'anthropic',
		'deepseek',
		'googleai'
	] as const satisfies readonly QuickWorkspaceAIProvider[]

	let selected: QuickWorkspaceAIProvider = $state('openai')
	const quickWorkspaceAIProviders = QUICK_WORKSPACE_AI_PROVIDER_KEYS.map((provider) => ({
		value: provider,
		label: VISIBLE_AI_PROVIDERS[provider].label
	}))
	run(() => {
		id = name.toLowerCase().replace(/\s/gi, '-')
	})
	run(() => {
		validateName(id)
	})
	run(() => {
		errorUser = validateUsername(username)
	})
	run(() => {
		colorEnabled && !workspaceColor && generateRandomColor()
	})
	let domain = $derived($usersWorkspaceStore?.email.split('@')[1])
</script>

<div class="flex flex-col flex-1">
	<div class="flex-1 relative min-h-[32rem]">
		<div class="flex flex-col gap-8 absolute inset-0 overflow-y-auto">
			{#if errorMsgs.length != 0}
				<Alert class="p-2" title={forkCreationError} type="error">
					<ul class="pl-2 pr-4 break-words pb-5">
						{#each errorMsgs as errorMsg}
							<li><pre class="whitespace-pre-wrap">- {errorMsg}</pre></li>
						{/each}
					</ul>
					{#if failedSyncJobs.length != 0}
						失败任务详情：
						{#await fetchFailedSyncJobs(failedSyncJobs)}
							<LoaderCircle class="animate-spin" />
						{:then failedJobs}
							<ul class="pl-2 pr-4 break-words">
								{#each failedJobs as job}
									<li>
										-
										<a
											target="_blank"
											class="underline"
											href={`/run/${job.id}?workspace=${$workspaceStore}`}
										>
											{job.id}
										</a>
									</li>
									<!-- This 28073 is the version where git sync on fork was introduced -->
									{#if isPathVersionLessThan(job.script_path, 28073)}
										<div class="font-bold">
											此任务未运行最新的 Git 同步脚本版本。可进入“工作区设置” -> “Git
											同步”更新脚本后重试。
										</div>
									{/if}
								{/each}
							</ul>
						{:catch error}
							尝试获取任务详情失败：{error}。以下是失败任务 ID：
							<ul class="pl-2 pr-4 break-words">
								{#each failedSyncJobs as jobId}
									<li>
										-
										<a
											target="_blank"
											class="underline"
											href={`/run/${jobId}?workspace=${$workspaceStore}`}
										>
											{jobId}
										</a>
									</li>
								{/each}
							</ul>
						{/await}
					{/if}
				</Alert>
			{/if}
			<label class="flex flex-col gap-1">
				{#if isFork}
					<span class="text-xs font-semibold text-emphasis">副本名称</span>
					<span class="text-xs text-secondary">副本工作区的显示名称</span>
				{:else}
					<span class="text-xs font-semibold text-emphasis">工作区名称</span>
					<span class="text-xs text-secondary">显示名称</span>
				{/if}
				<!-- svelte-ignore a11y_autofocus -->
				<TextInput inputProps={{ autofocus: true }} bind:value={name} />
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-xs font-semibold text-emphasis">工作区 ID</span>
				{#if isFork}
					<span class="text-xs text-secondary">用于唯一标识副本的路径标识，同时会作为分支名称</span>
				{:else}
					<span class="text-xs text-secondary">用于唯一标识工作区的路径标识</span>
				{/if}

				{#if isFork}
					<PrefixedInput
						prefix={WM_FORK_PREFIX}
						type="text"
						bind:value={id}
						placeholder="example.com"
						class={errorId != '' ? 'input-error' : ''}
					/>
				{:else}
					<TextInput bind:value={id} error={errorId} />
				{/if}
				{#if errorId}
					<span class="text-red-500 text-2xs font-normal">{errorId}</span>
					{#if forkIdTaken}
						<div class="flex flex-row items-center gap-2 pt-1">
							<Button
								destructive
								size="xs"
								startIcon={{ icon: Trash2 }}
								disabled={deletingExistingFork}
								on:click={() => (deleteExistingForkOpen = true)}
							>
								永久删除现有副本
							</Button>
							<span class="text-2xs text-secondary">
								释放该 ID 以便重新使用（仅副本所有者或超级管理员）
							</span>
						</div>
					{/if}
				{/if}
			</label>
			<Label label="工作区颜色">
				<span class="text-xs text-secondary"> 用于在工作区列表中识别当前工作区的颜色 </span>
				<div class="flex items-center gap-4">
					<Toggle bind:checked={colorEnabled} options={{ right: '启用' }} />
					{#if colorEnabled}
						<div class="flex items-center gap-1 grow">
							<input
								class="grow min-w-10"
								type="color"
								bind:value={workspaceColor}
								disabled={!colorEnabled}
							/>

							<TextInput
								class="w-24"
								bind:value={workspaceColor}
								inputProps={{ disabled: !colorEnabled }}
							/>
							<Button
								on:click={generateRandomColor}
								size="xs"
								variant="default"
								disabled={!colorEnabled}>随机</Button
							>
						</div>
					{/if}
				</div>
			</Label>
			{#if isFork}
				<ForkDatatableSection
					bind:this={forkDatatableSection}
					onAllDone={() => {
						completeFork(`${WM_FORK_PREFIX}${id}`)
					}}
					onCanceled={() => {
						forkCreationLoading = false
					}}
				/>
			{/if}
			{#if !automateUsernameCreation}
				<Label label="你在该工作区中的用户名">
					<TextInput
						bind:value={username}
						inputProps={{ onkeyup: handleKeyUp }}
						error={errorUser}
					/>
					{#if errorUser}
						<span class="text-red-500 text-2xs">{errorUser}</span>
					{/if}
				</Label>
			{/if}
			{#if !isFork}
				<div class="block">
					<div class="flex flex-col gap-1">
						<label for="ai-key" class="flex flex-row gap-2">
							<span class="text-xs font-semibold text-emphasis">
								平台 AI 密钥
								<Tooltip>配置后可在脚本、流程和应用编辑中使用 AI 辅助能力。</Tooltip>
							</span>
							<span class="text-2xs text-secondary">（可选，建议填写）</span>
						</label>

						<ToggleButtonGroup bind:selected>
							{#snippet children({ item })}
								{#each quickWorkspaceAIProviders as provider (provider.value)}
									<ToggleButton value={provider.value} label={provider.label} {item} />
								{/each}
							{/snippet}
						</ToggleButtonGroup>
						<div class="flex flex-row gap-1">
							<input
								id="ai-key"
								type="password"
								autocomplete="new-password"
								bind:value={aiKey}
								onkeyup={handleKeyUp}
							/>
							<TestAIKey
								apiKey={aiKey}
								disabled={!aiKey}
								aiProvider={selected}
								model={AI_PROVIDERS[selected].defaultModels[0]}
							/>
						</div>
					</div>

					{#if aiKey}
						<div class="flex flex-col gap-2 mt-2">
							<Toggle
								disabled={!aiKey}
								bind:checked={codeCompletionEnabled}
								options={{ right: '启用代码补全' }}
							/>
						</div>
					{/if}
				</div>
				<div class="flex flex-col gap-1">
					<label for="auto-invite" class="text-xs font-semibold text-emphasis"
						>{isCloudHosted()
							? `自动${autoAdd ? '添加' : '邀请'}来自 ${domain} 的用户`
							: `自动${autoAdd ? '添加' : '邀请'}加入实例的用户`}</label
					>
					<Toggle
						id="auto-invite"
						disabled={isCloudHosted() && !isDomainAllowed}
						bind:checked={auto_invite}
					/>
					{#if isCloudHosted() && isDomainAllowed == false}
						<div class="text-secondary text-2xs">{domain} 域名不允许自动邀请</div>
					{/if}

					{#if auto_invite}
						<div class="bg-surface-tertiary p-4 rounded-md flex flex-col gap-8">
							<!-- svelte-ignore a11y_label_has_associated_control -->
							{#if isCloudHosted()}
								<label class="flex flex-col gap-1">
									<span class="text-xs font-semibold text-emphasis">模式</span>
									<span class="text-xs text-secondary font-normal"
										>选择邀请用户，还是直接将用户加入工作区。</span
									>
									<ToggleButtonGroup
										selected={autoAdd ? 'add' : 'invite'}
										on:selected={async (e) => {
											autoAdd = e.detail === 'add'
										}}
									>
										{#snippet children({ item })}
											<ToggleButton value="invite" label="自动邀请" {item} />
											<ToggleButton value="add" label="自动添加" {item} />
										{/snippet}
									</ToggleButtonGroup>
								</label>
							{/if}

							<label class="font-semibold flex flex-col gap-1">
								<span class="text-xs font-semibold text-emphasis">角色</span>
								<span class="text-xs text-secondary font-normal">自动邀请用户的角色</span>
								<ToggleButtonGroup
									selected={operatorOnly ? 'operator' : 'developer'}
									on:selected={(e) => {
										operatorOnly = e.detail == 'operator'
									}}
								>
									{#snippet children({ item })}
										<ToggleButton value="operator" label="操作员" {item} />
										<ToggleButton value="developer" label="开发者" {item} />
									{/snippet}
								</ToggleButtonGroup>
							</label>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
	<div class="flex flex-wrap flex-row justify-between gap-4 pt-4">
		<Button disabled={forkCreationLoading} variant="default" size="sm" href="{base}/user/workspaces"
			>&leftarrow; 返回工作区</Button
		>
		{#if !forkCreationLoading}
			<Button
				variant="accent"
				disabled={checking ||
					errorId != '' ||
					!name ||
					(!automateUsernameCreation && (errorUser != '' || !username)) ||
					!id}
				on:click={createOrForkWorkspace}
			>
				{#if isFork}
					复制工作区
				{:else}
					创建工作区
				{/if}
			</Button>
		{:else}
			<Button variant="accent" disabled={true}>
				<LoaderCircle class="animate-spin" /> 正在创建分支
			</Button>
		{/if}
	</div>
</div>

<ConfirmationModal
	open={deleteExistingForkOpen}
	title="永久删除现有副本"
	confirmationText="永久删除"
	loading={deletingExistingFork}
	on:canceled={() => {
		deleteExistingForkOpen = false
	}}
	on:confirmed={() => {
		deleteExistingFork()
	}}
>
	<div class="flex flex-col w-full space-y-4">
		<span>
			这将永久删除工作区 '{WM_FORK_PREFIX}{id}'
			及其全部内容（脚本、流程、应用、变量、资源、运行记录）。此操作无法撤销。与归档不同，此操作会释放工作区
			ID，以便创建新的副本。
		</span>
	</div>
</ConfirmationModal>
