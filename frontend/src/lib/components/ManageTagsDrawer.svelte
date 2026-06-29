<script lang="ts">
	import Drawer from './common/drawer/Drawer.svelte'
	import DrawerContent from './common/drawer/DrawerContent.svelte'
	import AssignableTagsInner from './AssignableTagsInner.svelte'
	import DefaultTagsInner from './DefaultTagsInner.svelte'
	import { Section } from './common'

	interface Props {
		defaultTagPerWorkspace?: boolean | undefined
		defaultTagWorkspaces?: string[]
		onRefresh?: () => void
	}

	let {
		defaultTagPerWorkspace = $bindable(undefined),
		defaultTagWorkspaces = $bindable([]),
		onRefresh
	}: Props = $props()

	let drawer: Drawer | undefined = $state(undefined)

	export function openDrawer() {
		drawer?.openDrawer?.()
	}

	export function closeDrawer() {
		drawer?.closeDrawer?.()
	}

	export function toggleDrawer() {
		drawer?.toggleDrawer?.()
	}
</script>

<Drawer bind:this={drawer} size="800px">
		<DrawerContent title="管理标签" on:close={() => drawer?.closeDrawer?.()}>
			<div class="flex flex-col h-full gap-6">
				<!-- Overall Description -->
				<div class="text-xs font-normal text-secondary">
					标签用于决定由哪个 worker 组执行任务。worker 只会处理与自身标签匹配的任务。
				</div>

			<!-- Content Sections -->
			<div class="flex flex-col gap-8 flex-1">
				<!-- Custom Tags Section -->
				<Section label="Custom tags">
					<AssignableTagsInner
						variant="drawer"
						on:refresh={() => {
							if (onRefresh) {
								onRefresh()
							}
						}}
					/>
				</Section>

				<!-- Default Tags Section -->
				<DefaultTagsInner bind:defaultTagPerWorkspace bind:defaultTagWorkspaces />

				<!-- Extra padding -->
				<div class="pb-10"></div>
			</div>
		</div>
	</DrawerContent>
</Drawer>
