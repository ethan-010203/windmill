<script lang="ts">
	import { untrack } from 'svelte'
	import { UserService } from '$lib/gen'
	import { sendUserToast } from '$lib/toast'
	import { workspaceStore } from '$lib/stores'
	import Button from '../common/button/Button.svelte'
	import Modal from '../common/modal/Modal.svelte'
	import TextInput from '../text_input/TextInput.svelte'
	import ScopesPicker from './ScopesPicker.svelte'

	interface Props {
		open: boolean
		tokenPrefix?: string
		initialLabel?: string
		/** When false, the label is shown read-only (system tokens — see `isUserToken`). */
		labelEditable?: boolean
		initialScopes?: string[]
		tokenWorkspaceId?: string
		onSaved?: () => void
	}

	let {
		open = $bindable(),
		tokenPrefix,
		initialLabel,
		labelEditable = true,
		initialScopes,
		tokenWorkspaceId,
		onSaved
	}: Props = $props()

	// Treat as MCP only when *all* existing scopes are mcp:* — mixed-scope or
	// null-scope tokens fall back to the standard picker so non-MCP scopes are
	// never silently dropped.
	const isMcp = $derived(
		(initialScopes ?? []).length > 0 && (initialScopes ?? []).every((s) => s.startsWith('mcp:'))
	)
	const mcpWorkspaceId = $derived(tokenWorkspaceId ?? $workspaceStore ?? '')

	let labelValue = $state('')
	let pickedScopes = $state<string[] | null>(null)
	let saving = $state(false)

	// Seed the label field from the token whenever the modal opens or the token
	// identity changes (untracked read so typing doesn't reset it). ScopesPicker
	// seeds itself via the `{#key tokenPrefix}` remount below.
	$effect(() => {
		tokenPrefix
		if (open) {
			untrack(() => {
				labelValue = initialLabel ?? ''
			})
		}
	})

	function scopesEqual(a: string[] | null, b: string[] | null): boolean {
		if (a === null || b === null) return a === b
		if (a.length !== b.length) return false
		const sa = [...a].sort()
		const sb = [...b].sort()
		return sa.every((s, i) => s === sb[i])
	}

	async function save() {
		if (!tokenPrefix) return
		saving = true
		try {
			const trimmed = labelValue.trim()
			const labelChanged = labelEditable && trimmed !== (initialLabel ?? '')
			const scopesChanged = !scopesEqual(pickedScopes, initialScopes ?? null)

			if (labelChanged) {
				await UserService.updateTokenLabel({
					tokenPrefix,
					requestBody: { label: trimmed === '' ? null : trimmed }
				})
			}
			if (scopesChanged) {
				await UserService.updateTokenScopes({
					tokenPrefix,
					requestBody: { scopes: pickedScopes }
				})
			}
			if (labelChanged || scopesChanged) {
				sendUserToast('令牌已更新')
			}
			onSaved?.()
			open = false
		} catch (err) {
			sendUserToast(`Failed to update token: ${err.body ?? err.message}`, true)
		} finally {
			saving = false
		}
	}

	const saveDisabled = $derived(saving || !tokenPrefix || (isMcp && !pickedScopes))
</script>

<Modal bind:open title="编辑令牌" class="!max-w-3xl">
	<div class="flex flex-col gap-3">
		<div class="text-xs text-secondary">
			令牌 <span class="font-mono">{tokenPrefix}****</span>
		</div>

		<div class="flex flex-col gap-1">
			<span class="text-xs font-semibold text-emphasis">标签</span>
			<TextInput
				inputProps={{ type: 'text', disabled: !labelEditable, placeholder: '添加标签...' }}
				bind:value={labelValue}
				class="w-full"
			/>
			{#if !labelEditable}
				<span class="text-2xs text-tertiary">系统令牌标签不能修改。</span>
			{/if}
		</div>

		<div class="flex flex-col gap-1">
			<span class="text-xs font-semibold text-emphasis">权限范围</span>
			{#key tokenPrefix}
				<ScopesPicker
					mode={isMcp ? 'mcp' : 'standard'}
					workspaceId={mcpWorkspaceId}
					{initialScopes}
					bind:value={pickedScopes}
				/>
			{/key}
		</div>
	</div>

	{#snippet actions()}
		<Button size="sm" variant="accent" disabled={saveDisabled} on:click={save}>保存</Button>
	{/snippet}
</Modal>
