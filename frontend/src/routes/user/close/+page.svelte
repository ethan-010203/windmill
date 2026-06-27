<script lang="ts">
	import CenteredModal from '$lib/components/CenteredModal.svelte'
	import { Button } from '$lib/components/common'
</script>

<CenteredModal>
	登录过程中出现错误

	<Button on:click={() => window.close()}>关闭</Button>
</CenteredModal>
