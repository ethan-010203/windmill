<script lang="ts">
	import { getContext } from 'svelte'
	import { GitBranch } from 'lucide-svelte'
	import SimpleEditor from '$lib/components/SimpleEditor.svelte'
	import type { AppViewerContext } from '../../types'
	import { Pane, Splitpanes } from 'svelte-splitpanes'
	import CssHelperPanel from './CssHelperPanel.svelte'
	import { enterpriseLicense, workspaceStore } from '$lib/stores'
	import Tooltip from '$lib/components/Tooltip.svelte'
	import { Button, Drawer, DrawerContent, Tab, Tabs } from '$lib/components/common'
	import ThemeList from './ThemeList.svelte'
	import SplitPanesWrapper from '$lib/components/splitPanes/SplitPanesWrapper.svelte'
	import { resolveTheme } from './themeUtils'
	import ThemeCodePreview from './ThemeCodePreview.svelte'
	import { sendUserToast } from '$lib/toast'
	import EEOnly from '$lib/components/EEOnly.svelte'
	const { app, appPath } = getContext<AppViewerContext>('AppViewerContext')

	let cssEditor: SimpleEditor | undefined = $state(undefined)
	let alertHeight: number | undefined = $state(undefined)
	let themeViewer: any = $state(undefined)
	let selectedTab: 'css' | 'theme' = $state('css')

	function insertSelector(selector: string) {
		if ($app?.theme?.type === 'path') {
			sendUserToast(
				'You cannot edit the theme because it is a path theme. Fork the theme to edit it.',
				true
			)
			return
		}

		const code = cssEditor?.getCode()
		cssEditor?.setCode(code + '\n' + selector)
		$app = $app
	}
</script>

<Drawer bind:this={themeViewer} size="800px">
	<DrawerContent title="View themes" on:close={themeViewer.closeDrawer}>sa</DrawerContent>
</Drawer>

<Tabs bind:selected={selectedTab}>
	<Tab value="css" label="Code" />
	<Tab value="theme" label="Theme" />
	{#snippet content()}
		{#if selectedTab === 'css'}
			<SplitPanesWrapper>
				<Splitpanes horizontal>
					<Pane size={60}>
						{#if $enterpriseLicense === undefined}
							<div bind:clientHeight={alertHeight} class="p-2 flex flex-row gap-2">
								<div class="flex flex-row items-center text-yellow-500 text-xs">
									<EEOnly />
									<Tooltip light>
										应用 CSS 编辑器当前未开放。你可以在编辑器中预览，但部署后不会生效。
									</Tooltip>
								</div>
								<div class="flex flex-row items-center text-blue-500 text-xs">
									组件样式仍可配置
									<Tooltip light>
										仍可在组件配置的样式区域调整组件样式。
									</Tooltip>
								</div>
							</div>
						{/if}
						<div style="height: calc(100% - {alertHeight || 0}px);">
							{#if $app.theme?.type === 'inlined'}
								<SimpleEditor
									class="h-full"
									lang="css"
									bind:code={$app.theme.css}
									fixedOverflowWidgets={true}
									small
									automaticLayout
									bind:this={cssEditor}
									key={`app-global-css-editor-${$workspaceStore}-${$appPath}`}
								/>
							{:else}
								<ThemeCodePreview theme={$app.theme}>
									<div class="p-2 w-min whitespace-nowrap">
										<Button
											size="xs"
											color="dark"
											on:click={async () => {
												const theme = await resolveTheme($app.theme, $workspaceStore)
												$app.theme = {
													type: 'inlined',
													css: theme
												}
											}}
											startIcon={{ icon: GitBranch }}
										>
											Fork theme to edit
										</Button>
									</div>
								</ThemeCodePreview>
							{/if}
						</div>
					</Pane>
					<Pane size={40}>
						<CssHelperPanel on:insertSelector={(e) => insertSelector(e.detail)} />
					</Pane>
				</Splitpanes>
			</SplitPanesWrapper>
		{/if}
		{#if selectedTab === 'theme'}
			<ThemeList
				on:setCodeTab={() => {
					selectedTab = 'css'
				}}
			/>
		{/if}
	{/snippet}
</Tabs>
