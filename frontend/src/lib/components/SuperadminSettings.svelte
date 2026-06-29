<script lang="ts">
	import { Drawer, DrawerContent, Button } from '$lib/components/common'
	import SuperadminSettingsInner from './SuperadminSettingsInner.svelte'
	import Version from './Version.svelte'
	import MeltTooltip from './meltComponents/Tooltip.svelte'
	import Toggle from './Toggle.svelte'
	import ConfirmationModal from './common/confirmationModal/ConfirmationModal.svelte'
	import SaveButton from './SaveButton.svelte'
	import { X, FileDiff, Loader2 } from 'lucide-svelte'
	import { fade } from 'svelte/transition'
	import { SettingsService } from '$lib/gen'

	interface Props {
		disableChatOffset?: boolean
	}

	let { disableChatOffset = false }: Props = $props()

	let drawer: Drawer | undefined = $state()
	let diffDrawer: Drawer | undefined = $state()
	let innerComponent: SuperadminSettingsInner | undefined = $state()
	let uptodateVersion: string | undefined = $state(undefined)
	let yamlMode = $state(false)
	let hasUnsavedChanges = $state(false)
	let hasAnyInvalid = $state(false)
	let showCloseConfirmModal = $state(false)
	let diffData: { original: string; modified: string } = $state({ original: '', modified: '' })
	let inlineDiff = $state(false)

	async function loadUptodate() {
		try {
			const res = await SettingsService.backendUptodate()
			if (res != 'yes') {
				const parts = res.split(' -> ')
				uptodateVersion = parts.length > 1 ? parts[parts.length - 1] : res
			}
		} catch {}
	}
	loadUptodate()

	// When true, the next Drawer 'close' event is intentional and should not be intercepted
	let bypassCloseCheck = false

	export function openDrawer() {
		drawer?.openDrawer()
	}

	export function closeDrawer() {
		bypassCloseCheck = true
		drawer?.closeDrawer()
	}

	function handleClose() {
		if (hasUnsavedChanges) {
			showCloseConfirmModal = true
		} else {
			closeDrawer()
		}
	}

	/** Catches click-away and escape closes from the Drawer/Disposable layer */
	function handleDrawerClose() {
		if (!bypassCloseCheck && hasUnsavedChanges) {
			drawer?.openDrawer()
			showCloseConfirmModal = true
		}
		bypassCloseCheck = false
	}

	async function handleSave(): Promise<void> {
		if (!innerComponent?.syncBeforeDiff()) throw new Error('YAML sync failed')
		await innerComponent?.saveSettings()
	}

	async function handleSaveAndCloseDiff(): Promise<void> {
		await handleSave()
		diffDrawer?.closeDrawer()
	}

	function handleDiscard() {
		innerComponent?.discardAll()
	}

	function handleReviewChanges() {
		if (!innerComponent?.syncBeforeDiff()) return
		diffData = innerComponent?.buildFullDiff() ?? { original: '', modified: '' }
		diffDrawer?.openDrawer()
	}
</script>

<Drawer bind:this={drawer} size="1200px" {disableChatOffset} on:close={handleDrawerClose}>
	<DrawerContent noPadding overflow_y={false} title="实例设置" on:close={handleClose}>
		{#snippet titleExtra()}
			<MeltTooltip disablePopup={!uptodateVersion}>
				<div class="text-xs text-secondary flex items-center gap-1 ml-6">
					<Version />
					{#if uptodateVersion}
						<span class="text-accent">→ {uptodateVersion}</span>
					{/if}
				</div>
				{#snippet text()}
					内部部署升级请先在测试环境构建镜像并完成验证，再按部署文档更新生产环境。
				{/snippet}
			</MeltTooltip>
		{/snippet}
		{#snippet actions()}
			<div class="flex items-center gap-2">
				{#if hasUnsavedChanges}
					<div transition:fade={{ duration: 150 }}>
						<Button
							variant="default"
							size="xs"
							startIcon={{ icon: X }}
							onClick={handleDiscard}
						>
							放弃
						</Button>
					</div>
				{/if}
				<Button
					variant="accent"
					size="xs"
					startIcon={{ icon: FileDiff }}
					onClick={handleReviewChanges}
					disabled={!hasUnsavedChanges}
				>
					查看变更
				</Button>
				<Toggle
					bind:checked={yamlMode}
					options={{ right: 'YAML' }}
					size="sm"
				/>
			</div>
		{/snippet}
		<SuperadminSettingsInner
			bind:this={innerComponent}
			closeDrawer={handleClose}
			showHeaderInfo={false}
			{disableChatOffset}
			bind:yamlMode
			bind:hasUnsavedChanges
			bind:hasAnyInvalid
		/>
	</DrawerContent>
</Drawer>

<Drawer bind:this={diffDrawer} size="1200px">
	<DrawerContent title="查看变更" on:close={() => diffDrawer?.closeDrawer()}>
		{#snippet actions()}
			<Toggle
				bind:checked={inlineDiff}
				options={{ right: '统一视图' }}
				size="xs"
			/>
			<SaveButton onSave={handleSaveAndCloseDiff} disabled={!hasUnsavedChanges || hasAnyInvalid} size="xs" />
		{/snippet}
		<!-- DiffEditor reacts to inlineDiff changes via $effect — no {#key} needed -->
		<div class="h-full">
			{#await import('$lib/components/DiffEditor.svelte')}
				<Loader2 class="animate-spin m-4" />
			{:then Module}
				<Module.default
					open={true}
					className="!h-full"
					defaultLang="yaml"
					defaultOriginal={diffData.original}
					defaultModified={diffData.modified}
					readOnly
					{inlineDiff}
				/>
			{/await}
		</div>
	</DrawerContent>
</Drawer>

{#if showCloseConfirmModal}
	<ConfirmationModal
		open={showCloseConfirmModal}
		title="存在未保存变更"
		confirmationText="放弃并关闭"
		on:canceled={() => {
			showCloseConfirmModal = false
		}}
		on:confirmed={() => {
			innerComponent?.discardAll()
			showCloseConfirmModal = false
			closeDrawer()
		}}
	>
		<div class="flex flex-col w-full space-y-4">
			<span>当前存在未保存变更，确定要放弃并关闭吗？</span>
			<Button
				variant="default"
				size="sm"
				startIcon={{ icon: FileDiff }}
				onClick={() => {
					showCloseConfirmModal = false
					handleReviewChanges()
				}}
			>
				查看变更
			</Button>
		</div>
	</ConfirmationModal>
{/if}
