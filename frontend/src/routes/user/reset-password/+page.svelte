<script lang="ts">
	import { goto } from '$lib/navigation'
	import { page } from '$app/state'
	import { WindmillIcon } from '$lib/components/icons'
	import DarkModeToggle from '$lib/components/sidebar/DarkModeToggle.svelte'
	import Button from '$lib/components/common/button/Button.svelte'
	import { sendUserToast } from '$lib/toast'
	import { UserService } from '$lib/gen'
	import LoginPageHeader from '$lib/components/LoginPageHeader.svelte'
	import { enterpriseLicense, whitelabelNameStore } from '$lib/stores'

	const token = page.url.searchParams.get('token') ?? ''

	let newPassword = $state('')
	let confirmPassword = $state('')
	let loading = $state(false)
	let success = $state(false)

	async function resetPassword() {
		if (!token) {
			sendUserToast('重置链接无效或已缺失', true)
			return
		}

		if (!newPassword || !confirmPassword) {
			sendUserToast('请填写两次密码', true)
			return
		}

		if (newPassword !== confirmPassword) {
			sendUserToast('两次输入的密码不一致', true)
			return
		}

		loading = true
		try {
			await UserService.resetPassword({
				requestBody: {
					token,
					new_password: newPassword
				}
			})
			success = true
			sendUserToast('密码已重置')
		} catch (err: any) {
			console.error('Could not reset password', err)
			sendUserToast('密码重置失败：' + err, true)
		} finally {
			loading = false
		}
	}

	function handleKeyUp(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault()
			resetPassword()
		}
	}
</script>

<div
	class="flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative bg-surface-secondary h-screen"
>
	<LoginPageHeader />
	<div class="sm:mx-auto sm:w-full sm:max-w-md">
		<div class="mx-auto flex justify-center">
			{#if !$enterpriseLicense || !$whitelabelNameStore}
				<WindmillIcon height="80px" width="80px" spin="slow" />
			{/if}
		</div>
		<h2 class="mt-6 text-center text-2xl font-semibold tracking-tight text-emphasis">
			{success ? '密码已重置' : '设置新密码'}
		</h2>
		{#if !success}
			<p class="mt-2 text-center text-xs text-secondary"> 请输入新密码 </p>
		{/if}
	</div>

	<div class="mt-8 sm:mx-auto sm:w-full sm:max-w-xl mb-48">
		<div class="flex justify-end">
			<DarkModeToggle forcedDarkMode={false} />
		</div>
		<div class="bg-surface px-4 py-8 border sm:rounded-lg sm:px-10">
			{#if !token}
				<div class="text-center space-y-4">
					<p class="text-red-500">重置链接无效或已缺失。</p>
					<div class="pt-4">
						<Button variant="accent" on:click={() => goto('/user/forgot-password')}>
							重新申请重置链接
						</Button>
					</div>
				</div>
			{:else if success}
				<div class="text-center space-y-4">
					<p class="text-secondary"> 密码已重置。 </p>
					<p class="text-secondary text-sm"> 现在可以使用新密码登录。 </p>
					<div class="pt-4">
						<Button variant="accent" on:click={() => goto('/user/login')}>去登录</Button>
					</div>
				</div>
			{:else}
				<div class="space-y-6">
					<div class="space-y-1">
						<label for="new-password" class="block text-xs font-semibold text-emphasis">
							新密码
						</label>
						<div>
							<input
								type="password"
								bind:value={newPassword}
								id="new-password"
								autocomplete="new-password"
								onkeyup={handleKeyUp}
							/>
						</div>
					</div>

					<div class="space-y-1">
						<label for="confirm-password" class="block text-xs font-semibold text-emphasis">
							确认密码
						</label>
						<div>
							<input
								type="password"
								bind:value={confirmPassword}
								id="confirm-password"
								autocomplete="new-password"
								onkeyup={handleKeyUp}
							/>
						</div>
					</div>

					<div class="pt-2 flex flex-col gap-2">
						<Button
							on:click={resetPassword}
							variant="accent"
							disabled={!newPassword || !confirmPassword || loading}
						>
							{loading ? '重置中...' : '重置密码'}
						</Button>
						<Button variant="subtle" on:click={() => goto('/user/login')}>返回登录</Button>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
