<script lang="ts">
	import { goto } from '$lib/navigation'
	import { page } from '$app/stores'
	import { workspaceStore } from '$lib/stores'
	import { emptyString, sendUserToast } from '$lib/utils'
	import SettingsPageHeader from '../settings/SettingsPageHeader.svelte'
	import SettingsFooter from './SettingsFooter.svelte'
	import Select from '../select/Select.svelte'
	import { Button } from '../common'
	import Alert from '../common/alert/Alert.svelte'
	import { convertFrontendToBackendSetting, type S3ResourceSettings } from '$lib/workspace_settings'
	import { WorkspaceService } from '$lib/gen'

	let {
		s3ResourceSettings = $bindable(),
		s3ResourceSavedSettings,
		onSave = undefined,
		onDiscard = undefined
	}: {
		s3ResourceSettings: S3ResourceSettings
		s3ResourceSavedSettings: S3ResourceSettings
		onSave?: () => void
		onDiscard?: () => void
	} = $props()

	async function saveVolumeStorageSettings(): Promise<void> {
		const large_file_storage = convertFrontendToBackendSetting(s3ResourceSettings)
		await WorkspaceService.editLargeFileStorageConfig({
			workspace: $workspaceStore!,
			requestBody: {
				large_file_storage: large_file_storage
			}
		})
		sendUserToast('卷存储设置已保存')
		onSave?.()
	}

	let hasUnsavedChanges = $derived(
		s3ResourceSettings.volumeStorage !== s3ResourceSavedSettings.volumeStorage
	)

	let volumeStorageItems: { value: string; label: string }[] = $derived.by(() => {
		const items: { value: string; label: string }[] = [{ value: '', label: '禁用' }]
		if (!emptyString(s3ResourceSettings.resourcePath)) {
			items.push({ value: 'primary', label: '主存储' })
		}
		for (const [name, s] of s3ResourceSettings.secondaryStorage ?? []) {
			if (!emptyString(s.resourcePath)) {
				items.push({ value: name, label: name })
			}
		}
		return items
	})

	let hasAvailableStorage = $derived(volumeStorageItems.length > 1)

	function goToStorageSettings() {
		const params = new URLSearchParams($page.url.searchParams)
		params.set('tab', 'windmill_lfs')
		goto(`?${params.toString()}`)
	}
</script>

<SettingsPageHeader
	title="卷存储"
	description="选择脚本卷使用的存储位置。禁用后，使用卷的脚本会执行失败。"
/>
{#if s3ResourceSettings}
	{#if hasAvailableStorage}
		<div class="max-w-sm mt-2">
			<Select
				items={volumeStorageItems}
				bind:value={
					() => s3ResourceSettings.volumeStorage ?? '',
					(v) => {
						s3ResourceSettings.volumeStorage = v || undefined
					}
				}
			/>
		</div>

		<SettingsFooter
			class="mt-5 mb-5"
			inline
			{hasUnsavedChanges}
			onSave={saveVolumeStorageSettings}
			onDiscard={() => onDiscard?.()}
			saveLabel="保存卷存储设置"
		/>
	{:else}
		<Alert type="info" title="尚未配置工作空间存储" class="mt-4">
			使用卷之前，需要先配置工作空间对象存储。
		</Alert>
		<Button wrapperClasses="mt-2" variant="default" size="sm" on:click={goToStorageSettings}>
			Go to Object storage settings
		</Button>
	{/if}
{/if}
