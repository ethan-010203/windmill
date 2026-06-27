<script lang="ts">
	import Badge from '$lib/components/common/badge/Badge.svelte'

	interface Props {
		license: string
	}

	let { license = $bindable() }: Props = $props()

	let valid = $state(false)

	async function checkLicenseKey(key: string) {
		try {
			const { LicenseManager } = await import('ag-grid-enterprise')

			let details = LicenseManager.getLicenseDetails(key)
			valid = details.valid
		} catch (e) {
			console.error(e)
		}
	}
	$effect(() => {
		license && checkLicenseKey(license)
	})
</script>

<div class="p-2">
	<span class="text-xs font-semibold">AgGrid 许可证密钥</span>
	<input type="text" bind:value={license} placeholder="许可证密钥" />

	{#if valid}
		<Badge color="green">Valid</Badge>
	{:else}
		<Badge color="red">Invalid</Badge>
	{/if}
</div>
