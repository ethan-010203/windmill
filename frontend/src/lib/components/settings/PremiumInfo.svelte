<script lang="ts">
	import SettingsPageHeader from '$lib/components/settings/SettingsPageHeader.svelte'
	import Alert from '$lib/components/common/alert/Alert.svelte'
</script>

<div class="flex flex-col gap-4 mt-8">
	<SettingsPageHeader title="部署方案" class="mb-0" />
	<Alert type="info" title="内部部署">
		当前系统按内部自托管方式部署，未开放云端计费、升级套餐和客户门户入口。
	</Alert>
</div>
