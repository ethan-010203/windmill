<script lang="ts">
	interface Props {
		license: string
	}

	let { license = $bindable() }: Props = $props()

	let initial = license
</script>

<div class="p-2">
	<span class="text-xs font-semibold">AgCharts 许可证密钥</span>
	<input type="text" bind:value={license} placeholder="许可证密钥" />
	{#if initial != license}
		<div class="text-yellow-500 text-xs"
			>Please reload the page to see the effect of the new license key</div
		>
	{/if}
</div>
