<script lang="ts">
	import { getContext } from 'svelte'
	import type { AppViewerContext } from '../../types'
	import Section from '$lib/components/Section.svelte'
	import Badge from '$lib/components/common/badge/Badge.svelte'
	import { deleteGridItem, findGridItemParentGrid } from '../appUtils'
	import Button from '$lib/components/common/button/Button.svelte'
	import { Trash } from 'lucide-svelte'
	import Alert from '$lib/components/common/alert/Alert.svelte'
	import { allItems, findGridItem } from '../appUtilsCore'

	const { app, initialized } = getContext<AppViewerContext>('AppViewerContext')

	let unintitializedComponents = $derived(allItems($app.grid, $app.subgrids)
		.map((x) => x.id)
		.filter((x) => !$initialized.initializedComponents?.includes(x))
		.sort())

	let subgridsErrors = $derived(Object.keys($app.subgrids ?? {})
		.map((x) => {
			const parentId = x.split('-')[0]
			const parent = findGridItem($app, parentId)
			const subgrid = x.replace(`${parentId}-`, '')
			if (subgrid == '-1') {
				return {
					subGridId: x,
					error: 'Invalid subgrid index -1 '
				}
			} else if (parent === undefined) {
				return {
					subGridId: x,
					error: 'Parent not found'
				}
			} else if (parent?.data?.numberOfSubgrids === undefined) {
				return {
					subGridId: x,
					error: 'Parent is not a container'
				}
			}
		})
		.filter(Boolean))
</script>

	<div class="flex flex-col gap-8" style="all:none;">
		{#if unintitializedComponents?.length === 0 && subgridsErrors?.length === 0}
			<Alert type="success" title="未发现问题">
				当前应用没有子网格错误或未初始化组件。
			</Alert>
		{:else}
			<Alert type="error" title="发现问题">
				当前应用有 {unintitializedComponents.length} 个未初始化组件和 {subgridsErrors.length} 个子网格错误。
				<br />
				请联系系统管理员处理。
			</Alert>
		{/if}
		{#if unintitializedComponents.length > 0}
			<Section label="未初始化组件">
				<div class="max-w-xl">
					<div class="text-sm mb-4">
						当前应用中有 {unintitializedComponents.length} 个未初始化组件。
					</div>

					<div class="grid grid-cols-4 border rounded-md overflow-hidden">
					<!-- Header -->
						<div class="font-semibold bg-gray-100 dark:bg-gray-900 px-2 py-1 text-xs border-b"
							>组件 ID</div
						>
						<div class="font-semibold bg-gray-100 dark:bg-gray-900 px-2 py-1 text-xs border-b"
							>类型</div
						>
						<div class="font-semibold bg-gray-100 dark:bg-gray-900 px-2 py-1 text-xs border-b"
							>状态</div
						>
						<div class="font-semibold bg-gray-100 dark:bg-gray-900 px-2 py-1 text-xs border-b"
							>操作</div
						>

					<!-- Iterate over uninitializedComponents to display each component in the grid -->
					{#each unintitializedComponents as c (c)}
						{@const item = findGridItem($app, c)}
							{#if !item}
								<div>未找到项目 {c}</div>
						{:else}
							<!-- Component Id -->
							<div class="text-xs flex items-center px-2 py-2">
								<Badge>
									{c}
								</Badge>
							</div>

							<div class="text-xs flex items-center px-2 py-2">
								<Badge color="blue">
										{item?.data?.type || '未知'}
								</Badge>
							</div>

							<div class="text-xs flex items-center px-2 py-2">
									<Badge color="red">未初始化</Badge>
							</div>
							<div class="text-xs flex items-center px-2 py-2">
								<Button
									color="light"
									startIcon={{
										icon: Trash
									}}
									size="xs2"
									on:click={() => {
										let parent = findGridItemParentGrid($app, c)
										deleteGridItem($app, item.data, parent)
										$app = $app
									}}
								>
										移除
								</Button>
							</div>
						{/if}
					{/each}
				</div>
			</div>
		</Section>{/if}
	{#if subgridsErrors.length > 0}
			<Section label="子网格错误">
				<div class="max-w-xl">
					<div class="text-sm mb-4">
						当前应用中有 {subgridsErrors.length} 个子网格存在错误。
					</div>

				<div class="grid grid-cols-3 border rounded-md overflow-hidden">
					<!-- Header -->
						<div class="font-semibold bg-gray-100 dark:bg-gray-900 px-2 py-1 text-xs border-b"
							>子网格 ID</div
						>
						<div class="font-semibold bg-gray-100 dark:bg-gray-900 px-2 py-1 text-xs border-b"
							>错误</div
						>
						<div class="font-semibold bg-gray-100 dark:bg-gray-900 px-2 py-1 text-xs border-b"
							>操作</div
						>

					<!-- Iterate over uninitializedComponents to display each component in the grid -->
					{#each subgridsErrors as s (s?.subGridId)}
						<!-- Component Id -->
						<div class="text-xs flex items-center px-2 py-2">
							<Badge>
								{s?.subGridId}
							</Badge>
						</div>

						<div class="text-xs flex items-center px-2 py-2">
							<Badge color="red">
								{s?.error}
							</Badge>
						</div>

						<div class="text-xs flex items-center px-2 py-2">
							<Button
								color="light"
								startIcon={{
									icon: Trash
								}}
								size="xs2"
								on:click={() => {
									if ($app.subgrids && s) {
										delete $app.subgrids[s.subGridId]
										$app = $app
									}
								}}
							>
									移除
							</Button>
						</div>
					{/each}
				</div>
			</div>
		</Section>
	{/if}
</div>
