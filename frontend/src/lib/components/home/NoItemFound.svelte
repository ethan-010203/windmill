<script lang="ts">
	interface Props {
		hasFilters?: boolean
	}

	let { hasFilters = false }: Props = $props()
</script>

{#if hasFilters}
	<div class="flex justify-center items-center h-48">
		<div class="text-primary text-center">
			<div class="text-lg font-semibold text-emphasis">未找到内容</div>
			<div class="text-xs font-normal text-hint">请调整搜索条件或筛选条件</div>
		</div>
	</div>
{:else}
	<div class="flex justify-center items-center h-48">
		<div class="text-primary text-center">
			<div class="text-lg font-semibold text-emphasis">欢迎使用部门工具平台</div>
			<div class="text-xs font-normal text-hint">可以先创建脚本、流程或应用</div>
		</div>
	</div>
{/if}
