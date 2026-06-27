<script lang="ts">
	import {
		AI_USER_DISABLED_SETTING_NAME,
		aiUserDisabled,
		codeCompletionSessionEnabled,
		metadataCompletionEnabled,
		stepInputCompletionEnabled
	} from '$lib/stores'
	import { getLocalSetting, storeLocalSetting } from '$lib/utils'
	import Toggle from '../Toggle.svelte'
	import type { Writable } from 'svelte/store'
	import UserAIPromptsSettings from './UserAIPromptsSettings.svelte'

	$effect(() => {
		loadSettings()
	})

	function loadSettings() {
		$aiUserDisabled = (getLocalSetting(AI_USER_DISABLED_SETTING_NAME) ?? 'false') == 'true'
		$codeCompletionSessionEnabled =
			(getLocalSetting('codeCompletionSessionEnabled') ?? 'true') == 'true'
		$metadataCompletionEnabled = (getLocalSetting('metadataCompletionEnabled') ?? 'true') == 'true'
		$stepInputCompletionEnabled =
			(getLocalSetting('stepInputCompletionEnabled') ?? 'true') == 'true'
	}

	function updateSetting(store: Writable<boolean>, value: boolean, setting: string) {
		store.set(value)
		storeLocalSetting(setting, value.toString())
	}

	// The toggle reads as enablement; the stored flag is the inverse (opt-out).
	function updateAiEnabled(enabled: boolean) {
		$aiUserDisabled = !enabled
		storeLocalSetting(AI_USER_DISABLED_SETTING_NAME, (!enabled).toString())
	}
</script>

<div class="border border-border-light rounded-md p-4 h-full">
	<h2 class="text-emphasis text-sm font-semibold mb-2">智能助手设置</h2>

	<div class="flex flex-col gap-4">
		<Toggle
			on:change={(e) => {
				updateAiEnabled(e.detail)
			}}
			checked={!$aiUserDisabled}
			options={{
				right: '部门工具平台 AI',
				rightTooltip:
					'在此设备上为你的账号启用部门工具平台 AI。关闭后会隐藏 AI 对话、代码补全、元数据补全和流程步骤输入补全。'
			}}
		/>

		<div class="flex flex-col gap-4 pl-2 border-l border-border-light">
			<Toggle
				disabled={$aiUserDisabled}
				on:change={(e) => {
					updateSetting(codeCompletionSessionEnabled, e.detail, 'codeCompletionSessionEnabled')
				}}
				checked={$codeCompletionSessionEnabled}
				options={{
					right: '代码补全',
					rightTooltip: '代码编辑器中的 AI 补全'
				}}
			/>

			<Toggle
				disabled={$aiUserDisabled}
				on:change={(e) => {
					updateSetting(metadataCompletionEnabled, e.detail, 'metadataCompletionEnabled')
				}}
				checked={$metadataCompletionEnabled}
				options={{
					right: '元数据补全',
					rightTooltip: '用于摘要和说明的 AI 补全'
				}}
			/>
			<Toggle
				disabled={$aiUserDisabled}
				on:change={(e) => {
					updateSetting(stepInputCompletionEnabled, e.detail, 'stepInputCompletionEnabled')
				}}
				checked={$stepInputCompletionEnabled}
				options={{
					right: '流程步骤输入补全',
					rightTooltip: '用于流程步骤输入的 AI 补全'
				}}
			/>
		</div>
	</div>

	<UserAIPromptsSettings />
</div>
