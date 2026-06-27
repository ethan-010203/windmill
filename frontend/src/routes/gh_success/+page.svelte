<script lang="ts">
	import { onMount } from 'svelte'
	import { CheckCircle, XCircle } from 'lucide-svelte'
	import { sendUserToast } from '$lib/toast'

	let isLoading = $state(true)
	let isSuccess = $state(false)
	let errorMessage = $state('')

	function closeWindow() {
		window.close()
	}

	onMount(async () => {
		const url = new URL(window.location.href)

		// Check for GHES flow: GitHub redirects back with installation_id and state params
		// (no jwt_token param — that's the managed flow via stats.windmill.dev)
		const jwt_token = url.searchParams.get('jwt_token') || ''
		const stateParam = url.searchParams.get('state') || ''

		if (!jwt_token && stateParam) {
			// GHES self-managed flow
			await handleGhesFlow(url, stateParam)
		} else {
			// Managed flow (existing)
			await handleManagedFlow(url)
		}
	})

	async function handleGhesFlow(url: URL, stateParam: string) {
		const installation_id_str = url.searchParams.get('installation_id') || ''
		const installation_id = parseInt(installation_id_str, 10)

		let workspace_id: string
		try {
			const state = JSON.parse(stateParam)
			workspace_id = state.workspace_id
		} catch {
			isLoading = false
			errorMessage = 'Invalid state parameter'
			sendUserToast('Invalid state parameter in the URL', true)
			return
		}

		if (!workspace_id || isNaN(installation_id)) {
			isLoading = false
			errorMessage = 'Missing or invalid required parameters'
			sendUserToast('Missing or invalid required parameters in the URL', true)
			return
		}

		try {
			const response = await fetch(`/api/w/${workspace_id}/github_app/ghes_installation_callback`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					installation_id
				})
			})

			if (!response.ok) {
				const errorData = await response.text()
				throw new Error(errorData || 'Failed to complete GitHub app installation')
			}

			isSuccess = true
			sendUserToast('GitHub app installed successfully', false)
		} catch (error) {
			console.error('Error during GitHub app installation:', error)
			errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
			sendUserToast(`Error installing GitHub app: ${errorMessage}`, true)
		} finally {
			isLoading = false
		}
	}

	async function handleManagedFlow(url: URL) {
		const workspace_id = url.searchParams.get('workspace_id') || ''
		const installation_id_str = url.searchParams.get('installation_id') || ''
		const account_id = url.searchParams.get('account_id') || ''
		const jwt_token = url.searchParams.get('jwt_token') || ''

		const installation_id = parseInt(installation_id_str, 10)

		if (!workspace_id || isNaN(installation_id) || !account_id || !jwt_token) {
			isLoading = false
			errorMessage = 'Missing or invalid required parameters'
			sendUserToast('Missing or invalid required parameters in the URL', true)
			return
		}

		try {
			const response = await fetch(`/api/w/${workspace_id}/github_app/installation_callback`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					installation_id,
					account_id,
					jwt_token
				})
			})

			if (!response.ok) {
				const errorData = await response.text()
				throw new Error(errorData || 'Failed to complete GitHub app installation')
			}

			isSuccess = true
			sendUserToast('GitHub app installed successfully', false)
		} catch (error) {
			console.error('Error during GitHub app installation:', error)
			errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
			sendUserToast(`Error installing GitHub app: ${errorMessage}`, true)
		} finally {
			isLoading = false
		}
	}
</script>

<div class="h-screen w-screen flex items-center justify-center bg-surface p-4">
	<div class="w-full max-w-3xl p-8 rounded-md border bg-surface shadow-sm">
		{#if isLoading}
			<div class="flex flex-col items-center justify-center py-8">
				<div
					class="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mb-4"
				></div>
				<p class="text-lg text-secondary">正在处理 GitHub App 安装...</p>
			</div>
		{:else if isSuccess}
			<div class="flex flex-col">
				<h1 class="text-2xl font-bold pb-6 flex flex-row items-center gap-2">
					<CheckCircle class="w-8 h-8 text-green-500" />
					GitHub App 安装成功
				</h1>
				<p class="text-secondary mb-8">
					GitHub App 已安装成功。现在可以关闭此窗口并返回系统继续使用 GitHub 集成。
				</p>
				<button
					onclick={closeWindow}
					class="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded transition-colors"
				>
					关闭窗口
				</button>
			</div>
		{:else}
			<div class="flex flex-col">
				<h1 class="text-2xl font-bold pb-6 flex flex-row items-center gap-2">
					<XCircle class="w-8 h-8 text-red-500" />
					GitHub App 安装失败
				</h1>
				<p class="text-secondary pb-4">安装过程中出现错误：</p>
				<div class="bg-surface-secondary p-4 rounded border border-red-300 text-red-600 mb-8">
					{errorMessage}
				</div>
				<p class="text-secondary mb-8">
					请重试，或联系系统管理员处理。
				</p>
				<button
					onclick={closeWindow}
					class="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded transition-colors"
				>
					Close this window
				</button>
			</div>
		{/if}
	</div>
</div>
