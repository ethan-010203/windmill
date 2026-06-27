<script lang="ts">
	import { workspaceStore } from '$lib/stores'
	import { sendUserToast } from '$lib/utils'
	import { Button, Alert } from '$lib/components/common'
	import Skeleton from '$lib/components/common/skeleton/Skeleton.svelte'
	import SettingsPageHeader from '$lib/components/settings/SettingsPageHeader.svelte'
	import { Check, X, Cog, Plug } from 'lucide-svelte'
	import { NextcloudIcon, GithubIcon } from '$lib/components/icons'
	import GoogleIcon from '$lib/components/icons/GoogleIcon.svelte'
	import { WorkspaceIntegrationService, type NativeServiceName } from '$lib/gen'
	import ClipboardPanel from '$lib/components/details/ClipboardPanel.svelte'
	import OAuthClientConfig from './OAuthClientConfig.svelte'
	import ConfirmationModal from '../common/confirmationModal/ConfirmationModal.svelte'
	import { createAsyncConfirmationModal } from '../common/confirmationModal/asyncConfirmationModal.svelte'
	import Path from '$lib/components/Path.svelte'
	import { page } from '$app/state'
	import { goto } from '$app/navigation'

	interface WorkspaceIntegration {
		service_name: string
		resource_path?: string
		oauth_data: {
			client_id: string
			client_secret: string
			base_url: string
			instance_shared?: boolean
		} | null
	}

	interface ServiceConfig {
		name: string
		displayName: string
		description: string
		icon: any
		requiresBaseUrl?: boolean
		clientIdPlaceholder?: string
		clientSecretPlaceholder?: string
		setupInstructions?: string[]
	}

	const supportedServices: Record<string, ServiceConfig> = {
		nextcloud: {
			name: 'nextcloud',
			displayName: 'Nextcloud',
			description: '连接 Nextcloud，用于文件操作和 Webhook 触发器',
			icon: NextcloudIcon,
			setupInstructions: [
				'在 Nextcloud 实例中创建 OAuth2 应用（管理设置 → 安全 → OAuth 2.0 客户端）',
				'配置下方显示的重定向 URI',
				'填写客户端凭据'
			]
		},
			google: {
			name: 'google',
			displayName: 'Google',
			description: '连接 Google，用于 Drive 和 Calendar 触发器',
			icon: GoogleIcon,
			requiresBaseUrl: false,
			clientIdPlaceholder: 'xxxx.apps.googleusercontent.com',
			clientSecretPlaceholder: 'Google Cloud Console 客户端密钥',
				setupInstructions: [
					'打开 <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener" class="underline">Google Cloud Console - Credentials</a>',
					'创建 OAuth 2.0 客户端 ID（Web 应用类型）',
					'将下方显示的重定向 URI 添加到“Authorized redirect URIs”',
					'在项目中启用 <a href="https://console.cloud.google.com/apis/library/drive.googleapis.com" target="_blank" rel="noopener" class="underline">Google Drive API</a> 和 <a href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com" target="_blank" rel="noopener" class="underline">Google Calendar API</a>',
					'在下方填写客户端凭据'
				]
			},
		github: {
			name: 'github',
			displayName: 'GitHub',
			description: '连接 GitHub，用于仓库 Webhook 触发器',
			icon: GithubIcon,
			requiresBaseUrl: false,
				clientIdPlaceholder: 'GitHub OAuth App 客户端 ID',
				clientSecretPlaceholder: 'GitHub OAuth App 客户端密钥',
				setupInstructions: [
					'打开 <a href="https://github.com/settings/developers" target="_blank" rel="noopener" class="underline">GitHub Developer Settings</a>',
					'创建新的 OAuth App（不是 GitHub App）',
					'将“Authorization callback URL”设置为下方显示的重定向 URI',
					'在下方填写客户端 ID 和客户端密钥'
				]
			}
	}

	let integrations = $state<WorkspaceIntegration[]>([])
	let loading = $state(false)
	let connecting = $state<string | null>(null)
	let showingConfig = $state<string | null>(null)
	let instanceSharingAvailable = $state<Record<string, boolean>>({})
	let pendingCallback = $state<{
		serviceName: NativeServiceName
		code: string
		state: string
		workspace: string
	} | null>(null)
	let resourcePath = $state<string | undefined>(undefined)
	let pathError = $state<string | undefined>(undefined)
	let confirmationModal = createAsyncConfirmationModal()

	async function loadIntegrations() {
		if (!$workspaceStore) return

		loading = true
		try {
			const response = await WorkspaceIntegrationService.listNativeTriggerServices({
				workspace: $workspaceStore
			})
			integrations = response.map((item) => ({
				service_name: item.service_name,
				resource_path: item.resource_path ?? undefined,
				oauth_data: item.oauth_data || null
			}))
		} catch (err: any) {
			console.error('Failed to load workspace integrations:', err)
			sendUserToast(`加载集成失败：${err.message}`, true)
		} finally {
			loading = false
		}
	}

	async function deleteIntegration(serviceName: string) {
		if (!$workspaceStore) return

		const displayName = supportedServices[serviceName]?.displayName ?? serviceName
		const confirmed = await confirmationModal.ask({
			title: `断开 ${displayName}？`,
			confirmationText: '断开',
			children: `这会删除与该集成关联的所有 ${displayName} 触发器。此操作无法撤销。`
		})
		if (!confirmed) return

		try {
			await WorkspaceIntegrationService.deleteNativeTriggerService({
				workspace: $workspaceStore,
				serviceName: serviceName as any
			})
			sendUserToast(`${displayName} 已断开`)
			loadIntegrations()
		} catch (err: any) {
			sendUserToast(`断开 ${displayName} 失败：${err.message}`, true)
		}
	}

	async function connectService(serviceName: string, redirectUri: string) {
		if (!$workspaceStore) return

		connecting = serviceName
		try {
			const auth_url = await WorkspaceIntegrationService.generateNativeTriggerServiceConnectUrl({
				workspace: $workspaceStore,
				serviceName: serviceName as any,
				requestBody: { redirect_uri: redirectUri }
			})

			if (auth_url) {
				window.location.href = auth_url
			}
		} catch (err: any) {
			sendUserToast(
				`连接 ${supportedServices[serviceName]?.displayName} 失败：${err.message}`,
				true
			)
			connecting = null
		}
	}

	async function createOrUpdateIntegration(serviceName: string, oauthData: any) {
		if (!$workspaceStore) return

		try {
			await WorkspaceIntegrationService.createNativeTriggerService({
				workspace: $workspaceStore,
				serviceName: serviceName as any,
				requestBody: oauthData
			})
			sendUserToast(
				`${supportedServices[serviceName]?.displayName} 配置已保存`
			)
			loadIntegrations()
		} catch (err: any) {
			sendUserToast(
				`配置 ${supportedServices[serviceName]?.displayName} 失败：${err.message}`,
				true
			)
		}
	}

	async function checkInstanceSharing() {
		if (!$workspaceStore) return

		for (const serviceName of Object.keys(supportedServices)) {
			try {
				const available = await WorkspaceIntegrationService.checkInstanceSharingAvailable({
					workspace: $workspaceStore,
					serviceName: serviceName as NativeServiceName
				})
				instanceSharingAvailable[serviceName] = available
			} catch {
				instanceSharingAvailable[serviceName] = false
			}
		}
	}

	async function connectWithInstanceCredentials(serviceName: string) {
		if (!$workspaceStore) return

		connecting = serviceName
		try {
			const redirectUri = getRedirectUri(serviceName)
			const auth_url = await WorkspaceIntegrationService.generateInstanceConnectUrl({
				workspace: $workspaceStore,
				serviceName: serviceName as NativeServiceName,
				requestBody: { redirect_uri: redirectUri }
			})

			if (auth_url) {
				window.location.href = auth_url
			}
		} catch (err: any) {
			sendUserToast(
				`Failed to connect ${supportedServices[serviceName]?.displayName}: ${err.message}`,
				true
			)
			connecting = null
		}
	}

	function isConfigured(integration: WorkspaceIntegration): boolean {
		if (integration.oauth_data === null) return false
		if (integration.oauth_data.instance_shared) return true
		const serviceConfig = supportedServices[integration.service_name]
		const needsBaseUrl = serviceConfig?.requiresBaseUrl !== false
		return (
			!!integration.oauth_data.client_id &&
			!!integration.oauth_data.client_secret &&
			(!needsBaseUrl || !!integration.oauth_data.base_url)
		)
	}

	function isConnected(integration: WorkspaceIntegration): boolean {
		if (integration.oauth_data?.instance_shared) {
			return !!integration.resource_path
		}
		return isConfigured(integration) && !!integration.resource_path
	}

	function getIntegrationByService(serviceName: string): WorkspaceIntegration | null {
		return integrations.find((integration) => integration.service_name === serviceName) || null
	}

	function handleOAuthCallback(
		workspace: string,
		serviceName: NativeServiceName,
		code: string,
		state: string
	) {
		// Phase 1: store callback params and clean URL — don't call backend yet
		pendingCallback = { serviceName, code, state, workspace }

		// Pre-populate resource path from existing integration (for reconnect)
		const integration = getIntegrationByService(serviceName)
		resourcePath = integration?.resource_path ?? undefined

		const url = new URL(page.url)
		url.searchParams.delete('code')
		url.searchParams.delete('state')
		url.searchParams.delete('service')
		goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true })
	}

	async function finalizePendingCallback() {
		if (!pendingCallback) return

		const { serviceName, code, state, workspace } = pendingCallback
		try {
			const redirectUri = getRedirectUri(serviceName)
			await WorkspaceIntegrationService.nativeTriggerServiceCallback({
				serviceName,
				workspace,
				requestBody: {
					code,
					state,
					redirect_uri: redirectUri,
					resource_path: resourcePath
				}
			})
			sendUserToast(`${supportedServices[serviceName]?.displayName} connected successfully!`)
			await loadIntegrations()
		} catch (err: any) {
			sendUserToast(`Failed to complete OAuth connection: ${err.message}`, true)
		} finally {
			pendingCallback = null
			resourcePath = undefined
			pathError = undefined
		}
	}

	$effect(() => {
		if (
			page.url.searchParams.has('code') &&
			page.url.searchParams.has('state') &&
			page.url.searchParams.has('service') &&
			$workspaceStore
		) {
			const service = page.url.searchParams.get('service')! as NativeServiceName
			const code = page.url.searchParams.get('code')!
			const state = page.url.searchParams.get('state')!
			handleOAuthCallback($workspaceStore, service, code, state)
		}
	})

	function getRedirectUri(serviceName: string): string {
		return `${window.location.origin}/workspace_settings?tab=native_triggers&service=${serviceName}`
	}

	$effect(() => {
		if ($workspaceStore) {
			loadIntegrations()
			checkInstanceSharing()
		}
	})
</script>

<div class="flex flex-col">
	<SettingsPageHeader
		title="原生触发器集成"
		description="将当前工作空间连接到外部服务，用于启用原生触发器和相关能力。这些连接会在工作空间成员之间共享。"
	/>

	{#if pendingCallback}
		{@const serviceName = pendingCallback.serviceName}
		{@const config = supportedServices[serviceName]}
		<div class="border border-gray-200 dark:border-gray-700 rounded-md p-4 bg-surface-tertiary">
			<div class="text-sm font-semibold text-emphasis mb-2">
				将 {config?.displayName ?? serviceName} 凭据保存为资源
			</div>
			<div class="text-xs text-secondary mb-3">
				请选择 OAuth 资源保存位置。该资源会保存此集成的访问令牌。
			</div>
			<Path
				kind="resource"
				initialPath={resourcePath ?? ''}
				namePlaceholder={'native_' + serviceName}
				bind:path={resourcePath}
				bind:error={pathError}
			/>
			<div class="flex gap-2 mt-3">
				<Button
					variant="accent"
					disabled={!resourcePath || !!pathError}
					onclick={finalizePendingCallback}
				>
					保存
				</Button>
				<Button
					onclick={() => {
						pendingCallback = null
						resourcePath = undefined
						pathError = undefined
					}}
				>
					取消
				</Button>
			</div>
		</div>
	{:else if loading}
		<div class="space-y-4">
			{#each new Array(3) as _}
				<Skeleton layout={[[6], 0.4]} />
			{/each}
		</div>
	{:else}
		<div class="space-y-4">
			{#each Object.entries(supportedServices) as [serviceName, config]}
				{@const integration = getIntegrationByService(serviceName)}
				{@const isConnecting = connecting === serviceName}
				{@const isOAuthConfigured = integration && isConfigured(integration)}
				{@const isServiceConnected = integration && isConnected(integration)}
				{@const isShowingConfig = showingConfig === serviceName}

				<div class="border border-gray-200 dark:border-gray-700 rounded-md p-4 bg-surface-tertiary">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3">
							<div class="w-8 h-8 flex items-center justify-center">
								<config.icon class="w-6 h-6" />
							</div>
							<div class="flex flex-col">
								<div class="text-sm font-semibold text-emphasis">{config.displayName}</div>
								<div class="text-xs font-normal text-primary">{config.description}</div>
							</div>
						</div>

						<div class="flex items-center gap-2">
							{#if isServiceConnected}
								<div class="flex items-center gap-1 text-green-600 text-xs">
									<Check size={16} />
									<span class="font-semibold">已连接</span>
								</div>
								<Button
									onclick={() =>
										integration?.oauth_data?.instance_shared
											? connectWithInstanceCredentials(serviceName)
											: connectService(serviceName, getRedirectUri(serviceName))}
									disabled={isConnecting}
									startIcon={{ icon: Plug }}
								>
									{isConnecting ? '重新连接中...' : '重新连接'}
								</Button>
								<Button
									destructive
									onclick={() => deleteIntegration(serviceName)}
									startIcon={{ icon: X }}
								>
									删除
								</Button>
							{:else if isOAuthConfigured}
								<Button
									variant="accent"
									onclick={() => connectService(serviceName, getRedirectUri(serviceName))}
									disabled={isConnecting}
									startIcon={{ icon: Plug }}
								>
									{isConnecting ? '连接中...' : '连接'}
								</Button>
								<Button
									destructive
									onclick={() => deleteIntegration(serviceName)}
									startIcon={{ icon: X }}
								>
									删除
								</Button>
							{:else if instanceSharingAvailable[serviceName]}
								<Button
									variant="accent"
									onclick={() => connectWithInstanceCredentials(serviceName)}
									disabled={isConnecting}
									startIcon={{ icon: Plug }}
								>
									{isConnecting ? '连接中...' : '连接'}
								</Button>
							{:else}
								<Button
									variant="accent"
									onclick={() =>
										(showingConfig = showingConfig === serviceName ? null : serviceName)}
									startIcon={{ icon: Cog }}
								>
									配置 OAuth
								</Button>
							{/if}

						</div>
					</div>

					{#if instanceSharingAvailable[serviceName] && !isOAuthConfigured}
						<div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
							<Alert type="info" title="需要配置重定向 URI">
								<p class="text-sm mb-2">
									实例管理员已为原生触发器配置 Google OAuth。连接前，请确认以下重定向 URI 已由实例管理员添加到
									<a
										href="https://console.cloud.google.com/apis/credentials"
										target="_blank"
										rel="noopener noreferrer"
										class="underline">Google Cloud Console</a
									>：
								</p>
								<ClipboardPanel content={getRedirectUri(serviceName)} size="sm" />
							</Alert>
						</div>
					{/if}

					{#if isShowingConfig}
						<div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
							{#if serviceName === 'nextcloud'}
								<Alert type="info" title="要求" class="mb-4">
									<p>Nextcloud 集成需要：</p>
									<ul class="list-disc pl-4 mt-2 space-y-1">
										<li>Nextcloud 33 或更高版本。</li>
										<li>
											<a
												href="https://apps.nextcloud.com/apps/integration_windmill"
												target="_blank"
												rel="noopener noreferrer"
												class="underline hover:text-blue-600"
											>
												集成应用
											</a>已安装到你的 Nextcloud 实例。
										</li>
										<li>
											<a
												href="https://docs.nextcloud.com/server/latest/admin_manual/installation/source_installation.html#pretty-urls"
												target="_blank"
												rel="noopener noreferrer"
												class="underline hover:text-blue-600"
											>
												美化 URL
											</a>
											已在你的 Nextcloud 实例中启用。
										</li>
									</ul>
								</Alert>
							{/if}
							<OAuthClientConfig
								{serviceName}
								redirectUri={getRedirectUri(serviceName)}
								serviceDisplayName={config.displayName}
								existingConfig={integration?.oauth_data}
								requiresBaseUrl={config.requiresBaseUrl !== false}
								clientIdPlaceholder={config.clientIdPlaceholder}
								clientSecretPlaceholder={config.clientSecretPlaceholder}
								setupInstructions={config.setupInstructions}
								onConfigSaved={async (oauthData) => {
									await createOrUpdateIntegration(serviceName, oauthData)
									showingConfig = null
								}}
							/>
						</div>
					{/if}
				</div>
			{/each}
		</div>

		{#if integrations.length === 0}
			<Alert type="warning" title="尚未连接集成">
				连接上方外部服务后，当前工作空间才能使用对应原生触发器。
			</Alert>
		{/if}
	{/if}
</div>

<ConfirmationModal {...confirmationModal.props} />
