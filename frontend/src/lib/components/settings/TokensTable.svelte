<script lang="ts">
	import { untrack } from 'svelte'
	import TableCustom from '$lib/components/TableCustom.svelte'
	import { displayDate } from '$lib/utils'
	import { UserService, type TruncatedToken } from '$lib/gen'
	import { sendUserToast } from '$lib/toast'
	import CreateToken from './CreateToken.svelte'
	import EditTokenScopesModal from './EditTokenScopesModal.svelte'
	import Button from '../common/button/Button.svelte'
	import Badge from '../common/badge/Badge.svelte'
	import Alert from '../common/alert/Alert.svelte'
	import { Pen, Trash } from 'lucide-svelte'

	// --- Props ---
	interface Props {
		showMcpMode?: boolean
		openWithMcpMode?: boolean
		defaultNewTokenLabel?: string
		defaultNewTokenWorkspace?: string
		scopes?: string[]
		onTokenCreated: (token: string) => void
	}

	let {
		showMcpMode = false,
		openWithMcpMode = false,
		defaultNewTokenLabel,
		defaultNewTokenWorkspace,
		scopes,
		onTokenCreated
	}: Props = $props()

	// --- Local State ---
	let tokens = $state<TruncatedToken[]>([])
	let tokenPage = $state(1)
	let newTokenLabel = $state<string | undefined>(untrack(() => defaultNewTokenLabel))
	let editingToken = $state<
		| {
				prefix: string
				label: string | undefined
				scopes: string[] | undefined
				workspaceId: string | undefined
		  }
		| undefined
	>(undefined)
	let editModalOpen = $state(false)

	$effect(() => {
		listTokens()
	})

	// Mirror of the canonical `is_user_token` in backend/windmill-common/src/auth.rs.
	// When updating this filter, also update that function and the SQL `WHERE`
	// mirror in `update_token_label` (backend/windmill-api-users/src/users.rs).
	function isUserToken(label: string | undefined): boolean {
		if (!label) return true
		return (
			label !== 'session' &&
			!label.toLowerCase().startsWith('ephemeral') &&
			label !== 'debugger-token' &&
			!label.startsWith('mcp-oauth-')
		)
	}

	function daysUntilExpiration(expiration: string | undefined): number | null {
		if (!expiration) return null
		const today = new Date()
		today.setHours(0, 0, 0, 0)
		const exp = new Date(expiration)
		exp.setHours(0, 0, 0, 0)
		return Math.round((exp.getTime() - today.getTime()) / 86400000)
	}

	function expirationBadge(
		expiration: string | undefined,
		label: string | undefined
	): {
		color: 'red' | 'orange' | 'yellow' | 'gray'
		text: string
	} | null {
		if (!isUserToken(label)) return null
		const days = daysUntilExpiration(expiration)
		if (days === null) return null
		if (days < 0) return { color: 'red', text: 'Expired' }
		if (days === 0) return { color: 'red', text: 'Expires today' }
		if (days === 1) return { color: 'orange', text: 'Expires tomorrow' }
		if (days <= 7) return { color: 'orange', text: `Expires in ${days}d` }
		if (days <= 30) return { color: 'yellow', text: `Expires in ${days}d` }
		return null
	}

	let expiringSoonCount = $derived(
		tokens.filter((t) => {
			if (!isUserToken(t.label)) return false
			const days = daysUntilExpiration(t.expiration)
			return days !== null && days >= 0 && days <= 7
		}).length
	)

	function handleTokenCreated(token: string) {
		onTokenCreated(token)
		listTokens()
	}

	async function handleDeleteClick(tokenPrefix: string) {
		await UserService.deleteToken({ tokenPrefix })
		sendUserToast('令牌已删除')
		listTokens()
	}

	function handleEditClick(
		tokenPrefix: string,
		tokenLabel: string | undefined,
		tokenScopes: string[] | undefined,
		tokenWorkspaceId: string | undefined
	) {
		editingToken = {
			prefix: tokenPrefix,
			label: tokenLabel,
			scopes: tokenScopes,
			workspaceId: tokenWorkspaceId
		}
		editModalOpen = true
	}

	async function listTokens(): Promise<void> {
		tokens = await UserService.listTokens({
			excludeEphemeral: true,
			page: tokenPage,
			perPage: 100
		})
	}

	function handleNextPage() {
		tokenPage += 1
		listTokens()
	}

	function handlePreviousPage() {
		tokenPage -= 1
		listTokens()
	}
</script>

<div class="flex flex-col p-4 border border-border-light rounded-md">
	<h2 class="text-emphasis text-sm font-semibold mb-1">令牌</h2>
	<div class="text-xs text-secondary mb-2">
		使用访问令牌认证部门工具平台 API。
	</div>
	{#if expiringSoonCount > 0}
		<div class="mb-2">
			<Alert
				type="warning"
				title="{expiringSoonCount} 个令牌将在 7 天内过期"
				size="xs"
			/>
		</div>
	{/if}
	<CreateToken
		{showMcpMode}
		{openWithMcpMode}
		bind:newTokenLabel
		{defaultNewTokenWorkspace}
		{scopes}
		onTokenCreated={handleTokenCreated}
	/>
	<div class="overflow-auto grow min-h-64 max-h-2/3">
		<TableCustom>
			{#snippet headerRow()}
				<tr>
					<th>前缀</th>
					<th>标签</th>
					<th>过期时间</th>
					<th>权限范围</th>
					<th></th>
				</tr>
			{/snippet}
			{#snippet body()}
				<tbody>
					{#if tokens && tokens.length > 0}
						{#each tokens as { token_prefix, expiration, label, scopes, workspace_id, read_only } (token_prefix)}
							{@const badge = expirationBadge(expiration, label)}
							<tr>
								<td class="w-32 text-xs text-primary">{token_prefix}****</td>
								<td class="min-w-0 max-w-32 truncate text-xs text-primary">{label ?? ''}</td>
								<td class="w-40 whitespace-nowrap text-xs text-secondary">
									<div class="flex items-center gap-1.5">
										{displayDate(expiration ?? '')}
										{#if badge}
											<Badge color={badge.color} small>{badge.text}</Badge>
										{/if}
									</div>
								</td>
								<td
									class="min-w-0 max-w-48 truncate text-xs text-secondary"
									title={scopes?.join(', ') ?? ''}
								>
									<div class="flex items-center gap-1.5 truncate">
										{#if read_only}
											<Badge color="blue" small>只读</Badge>
										{/if}
										<span class="truncate">{scopes?.join(', ') ?? ''}</span>
									</div>
								</td>
								<td class="w-24 text-center">
									<div class="flex items-center justify-center gap-1">
										<Button
											variant="subtle"
											title="编辑令牌"
											on:click={() =>
												handleEditClick(
													token_prefix,
													label ?? undefined,
													scopes ?? undefined,
													workspace_id ?? undefined
												)}
											size="xs"
											startIcon={{ icon: Pen }}
											iconOnly
										/>
										<Button
											variant="subtle"
											destructive
											on:click={() => handleDeleteClick(token_prefix)}
											size="xs"
											startIcon={{ icon: Trash }}
											iconOnly
										/>
									</div>
								</td>
							</tr>
						{/each}
					{:else if tokens && tokens.length === 0}
						<tr class="px-6">
							<td class="text-secondary italic text-2xs">还没有令牌</td>
						</tr>
					{:else}
						<tr><td class="text-secondary text-xs">加载中...</td></tr>
					{/if}
				</tbody>
			{/snippet}
		</TableCustom>
		<div class="flex flex-row-reverse gap-2 w-full mt-2">
			{#if tokens?.length == 100}
				<Button variant="subtle" size="xs" on:click={handleNextPage}>下一页</Button>
			{/if}
			{#if tokenPage > 1}
				<Button variant="subtle" size="xs" on:click={handlePreviousPage}>上一页</Button>
			{/if}
		</div>
	</div>
</div>

<EditTokenScopesModal
	bind:open={editModalOpen}
	tokenPrefix={editingToken?.prefix}
	initialLabel={editingToken?.label}
	labelEditable={isUserToken(editingToken?.label)}
	initialScopes={editingToken?.scopes}
	tokenWorkspaceId={editingToken?.workspaceId}
	onSaved={listTokens}
/>
