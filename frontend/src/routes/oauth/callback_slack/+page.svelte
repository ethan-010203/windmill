<script lang="ts">
	import { goto } from '$lib/navigation'
	import { page } from '$app/state'
	import { sendUserToast } from '$lib/toast'
	import { onMount } from 'svelte'
	import { OauthService } from '$lib/gen'
	import { workspaceStore } from '$lib/stores'
	import CenteredPage from '$lib/components/CenteredPage.svelte'
	import PageHeader from '$lib/components/PageHeader.svelte'
	import WindmillIcon from '$lib/components/icons/WindmillIcon.svelte'

	let error = page.url.searchParams.get('error')
	let code = page.url.searchParams.get('code') ?? undefined
	let state = page.url.searchParams.get('state') ?? undefined

	onMount(async () => {
		if (error) {
			sendUserToast(`添加 Slack 连接失败：${error}`, true)
		} else if (code && state) {
			await OauthService.connectSlackCallback({
				workspace: $workspaceStore!,
				requestBody: { code, state }
			})
			sendUserToast(
				'Slack 工作区已连接，Slack 令牌已保存到 `f/slack_bot/bot_token`。'
			)
		} else {
			sendUserToast('缺少 code 或 state 查询参数', true)
		}
		goto('/workspace_settings?tab=slack')
	})
</script>

<CenteredPage>
	<PageHeader title="正在连接 Slack" />
	<div class="mx-auto w-0">
		<WindmillIcon height="80px" width="80px" spin="fast" />
	</div>
</CenteredPage>
