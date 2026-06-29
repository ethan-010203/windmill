<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import { globalEmailInvite, superadmin, workspaceStore, enterpriseLicense } from '$lib/stores'
	import { SettingService, UserService, WorkspaceService } from '$lib/gen'
	import { Button } from './common'
	import Popover from './meltComponents/Popover.svelte'
	import { sendUserToast } from '$lib/toast'
	import { isCloudHosted } from '$lib/cloud'
	import { goto } from '$lib/navigation'
	import ToggleButtonGroup from './common/toggleButton-v2/ToggleButtonGroup.svelte'
	import ToggleButton from './common/toggleButton-v2/ToggleButton.svelte'
	import Toggle from './Toggle.svelte'
	import Tooltip from './Tooltip.svelte'
	import { UserPlus } from 'lucide-svelte'

	const dispatch = createEventDispatcher()

	let email: string | undefined = $state()
	let username: string | undefined = $state()

	function handleKeyUp(event: KeyboardEvent) {
		const key = event.key
		if (key === 'Enter') {
			event.preventDefault()
			addUser()
		}
	}

	let automateUsernameCreation = $state(true)
	async function getAutomateUsernameCreationSetting() {
		automateUsernameCreation =
			((await SettingService.getGlobal({ key: 'automate_username_creation' })) as any) ?? true
	}
	getAutomateUsernameCreationSetting()

	async function addUser() {
		if (selected === 'service_account') {
			if (!username) return
			await WorkspaceService.createServiceAccount({
				workspace: $workspaceStore!,
				requestBody: {
					username: username!,
					is_admin: serviceAccountRole === 'admin',
					operator: serviceAccountRole === 'operator',
					add_to_deployers: serviceAccountRole === 'developer' && addToDeployers
				}
			})
			sendUserToast(`Service account '${username}' created`)
		} else {
			await WorkspaceService.addUser({
				workspace: $workspaceStore!,
				requestBody: {
					email: email!,
					username: automateUsernameCreation ? undefined : username,
					is_admin: selected == 'admin',
					operator: selected == 'operator'
				}
			})
			sendUserToast(`Added ${email}`)
			if (!(await UserService.existsEmail({ email: email! }))) {
				let isSuperadmin = $superadmin
				if (!isCloudHosted()) {
					const emailCopy = email!
					sendUserToast(
						`User ${email} is not registered yet on the instance. ${
							!isSuperadmin
								? `If not using SSO, ask an administrator to add ${email} to the instance`
								: ''
						}`,
						true,
						isSuperadmin
							? [
									{
										label: 'Add user to the instance',
										callback: () => {
											$globalEmailInvite = emailCopy
											goto('#superadmin-settings')
										}
									}
								]
							: []
					)
				}
			}
		}
		dispatch('new')
	}

	type UserRole = 'operator' | 'developer' | 'admin' | 'service_account'
	type ServiceAccountRole = 'operator' | 'developer' | 'admin'
	let selected: UserRole = $state('developer' as UserRole)
	let serviceAccountRole: ServiceAccountRole = $state('operator' as ServiceAccountRole)
	let addToDeployers: boolean = $state(true)
	let isServiceAccount = $derived(selected === 'service_account')
</script>

<Popover placement="bottom-end">
	{#snippet trigger()}
		<Button variant="accent" unifiedSize="md" nonCaptureEvent={true} startIcon={{ icon: UserPlus }}>
			添加用户
		</Button>
	{/snippet}
	{#snippet content()}
		<div class="flex flex-col w-[28rem] p-4">
			<span class="text-sm mb-2 leading-6 font-semibold">添加用户</span>

			{#if isServiceAccount}
				<span class="text-xs mb-1 leading-6">用户名</span>
				<input
					type="text"
					onkeyup={handleKeyUp}
					placeholder="my_service_account"
					autocomplete="off"
					data-1p-ignore
					bind:value={username}
				/>
			{:else}
				<span class="text-xs mb-1 leading-6">邮箱</span>
				<input type="email mb-1" onkeyup={handleKeyUp} placeholder="email" bind:value={email} />

				{#if !automateUsernameCreation}
					<span class="text-xs mb-1 pt-2 leading-6">用户名</span>
					<input type="text" onkeyup={handleKeyUp} placeholder="username" bind:value={username} />
				{/if}
			{/if}

			<span class="text-xs mb-1 pt-6 leading-6">角色</span>
			<ToggleButtonGroup bind:selected class="mb-4">
				{#snippet children({ item })}
					<ToggleButton
						value="operator"
						label="操作者"
						tooltip="操作者只能执行和查看当前工作空间中对其可见的脚本、流程和应用。"
						{item}
					/>
					<ToggleButton
						value="developer"
						label="开发者"
						tooltip="开发者可以执行和查看脚本、流程和应用，也可以创建新内容，并编辑其路径或文件夹权限允许的内容。"
						{item}
					/>
					<ToggleButton
						value="admin"
						label="管理员"
						tooltip="管理员拥有当前工作空间的完整控制权，包括管理用户、编辑实体和控制权限。"
						{item}
					/>
					{#if $enterpriseLicense}
						<ToggleButton
							value="service_account"
							label="服务账号"
							tooltip="服务账号是用于自动化的工作空间身份，不能直接登录，可由管理员模拟使用。"
							{item}
						/>
					{/if}
				{/snippet}
			</ToggleButtonGroup>

			{#if isServiceAccount}
				<span class="text-xs mb-1 leading-6">服务账号角色</span>
				<ToggleButtonGroup bind:selected={serviceAccountRole} class="mb-4">
					{#snippet children({ item })}
						<ToggleButton
							value="operator"
							label="操作者"
							tooltip="仅可读取和运行，不能用于 CLI 同步或创建脚本、流程、应用。"
							{item}
						/>
						<ToggleButton
							value="developer"
							label="开发者"
							tooltip="可以在其路径内创建和编辑脚本、流程、应用，可用于 CLI 同步令牌。"
							{item}
						/>
						<ToggleButton
							value="admin"
							label="管理员"
							tooltip="拥有完整工作空间管理权限，仅在服务账号需要管理工作空间设置时授予。"
							{item}
						/>
					{/snippet}
				</ToggleButtonGroup>

				{#if serviceAccountRole === 'developer'}
					<div class="flex items-center gap-2 mb-4">
						<Toggle bind:checked={addToDeployers} size="xs" />
						<span class="text-xs leading-6">
							Add to <code>wm_deployers</code>
							<Tooltip>
								当该服务账号用于 <code>wmill sync push</code> 或 CI 部署身份时建议启用。
								<code>wm_deployers</code> 成员可以在目标工作空间中保留原始发布身份。
							</Tooltip>
						</span>
					</div>
				{/if}
			{/if}
			<Button
				variant="accent"
				size="sm"
				on:click={() => {
					addUser().then(() => {
						// @ts-ignore
						email = undefined
						// @ts-ignore
						username = undefined
					})
				}}
				disabled={isServiceAccount
					? username === undefined || username === ''
					: email === undefined || (!automateUsernameCreation && username === undefined)}
			>
				添加
			</Button>
		</div>
	{/snippet}
</Popover>
