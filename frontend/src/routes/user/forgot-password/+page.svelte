<script lang="ts">
	import { goto } from '$lib/navigation'
	import { WindmillIcon } from '$lib/components/icons'
	import DarkModeToggle from '$lib/components/sidebar/DarkModeToggle.svelte'
	import Button from '$lib/components/common/button/Button.svelte'
	import { sendUserToast } from '$lib/toast'
	import { UserService } from '$lib/gen'
	import LoginPageHeader from '$lib/components/LoginPageHeader.svelte'
	import { enterpriseLicense, whitelabelNameStore } from '$lib/stores'

	let email = $state('')
	let loading = $state(false)
	let submitted = $state(false)

	async function requestPasswordReset() {
		if (!email) {
			sendUserToast('Please enter your email address', true)
			return
		}

		loading = true
		try {
			await UserService.requestPasswordReset({ requestBody: { email } })
			submitted = true
			sendUserToast('如果该邮箱存在账号，系统会发送密码重置链接。')
		} catch (err: any) {
			if (err?.body?.includes('SMTP is not configured')) {
				sendUserToast('当前无法重置密码，邮件服务尚未配置。', true)
			} else {
				sendUserToast('操作失败，请稍后再试。', true)
			}
		} finally {
			loading = false
		}
	}

	function handleKeyUp(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault()
			requestPasswordReset()
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
			重置密码
		</h2>
		<p class="mt-2 text-center text-xs text-secondary">
			输入邮箱后，系统会发送密码重置链接
		</p>
	</div>

	<div class="mt-8 sm:mx-auto sm:w-full sm:max-w-xl mb-48">
		<div class="flex justify-end">
			<DarkModeToggle forcedDarkMode={false} />
		</div>
		<div class="bg-surface px-4 py-8 border sm:rounded-lg sm:px-10">
			{#if submitted}
				<div class="text-center space-y-4">
					<p class="text-secondary">
						如果该邮箱存在账号，系统会发送密码重置链接。
					</p>
					<p class="text-secondary text-sm">
						请检查邮箱并按提示完成密码重置。
					</p>
					<div class="pt-4">
						<Button variant="accent" on:click={() => goto('/user/login')}>返回登录</Button>
					</div>
				</div>
			{:else}
				<div class="space-y-6">
					<div class="space-y-1">
						<label for="email" class="block text-xs font-semibold text-emphasis">邮箱</label>
						<div>
							<input
								type="email"
								bind:value={email}
								id="email"
								autocomplete="email"
								onkeyup={handleKeyUp}
							/>
						</div>
					</div>

					<div class="pt-2 flex flex-col gap-2">
						<Button on:click={requestPasswordReset} variant="accent" disabled={!email || loading}>
							{loading ? '发送中...' : '发送重置链接'}
						</Button>
						<Button variant="subtle" on:click={() => goto('/user/login')}>返回登录</Button>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
