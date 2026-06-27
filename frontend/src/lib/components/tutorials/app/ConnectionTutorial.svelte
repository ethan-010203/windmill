<script lang="ts">
	import { insertNewGridItem, appComponentFromType } from '$lib/components/apps/editor/appUtils'
	import type { AppComponent } from '$lib/components/apps/editor/component'
	import type { AppViewerContext, AppEditorContext } from '$lib/components/apps/types'
	import { push } from '$lib/history.svelte'
	import { getContext } from 'svelte'
	import Tutorial from '../Tutorial.svelte'
	import { clickButtonBySelector } from '../utils'
	import { updateProgress } from '$lib/tutorialUtils'

	interface Props {
		name: string;
		index: number;
	}

	let { name, index }: Props = $props();

	let tutorial: Tutorial | undefined = $state(undefined)

	const { app, selectedComponent, focusedGrid } = getContext<AppViewerContext>('AppViewerContext')
	const { history } = getContext<AppEditorContext>('AppEditorContext')

	export function runTutorial() {
		tutorial?.runTutorial()
	}

	function addComponent(): void {
		push(history, $app)

		const id = insertNewGridItem(
			$app,
			appComponentFromType('textcomponent') as (id: string) => AppComponent,
			$focusedGrid
		)

		$selectedComponent = [id]
		$app = $app
	}
</script>

<Tutorial
	bind:this={tutorial}
	{index}
	{name}
	on:error
	on:skipAll
	getSteps={(driver) => [
		{
			popover: {
				title: '组件连接教程',
				description: '我们会把文本组件的输入连接到一个输出。',
				onNextClick: () => {
					addComponent()
					setTimeout(() => {
						driver.moveNext()
					})
				}
			}
		},
		{
			element: `#component-input`,
			popover: {
				title: '数据源',
				description:
					'这里可以设置文本组件的数据源：可以是静态值、表达式结果，也可以是脚本或流程结果。接下来我们会把数据源连接到一个输出。',
				onNextClick: () => {
					clickButtonBySelector('#component-input')
					setTimeout(() => {
						driver.moveNext()
					})
				}
			}
		},
		{
			element: '[data-connection-button] button[title="Connect"]',
			popover: {
				title: '连接文本组件',
				description: '点击插头图标来连接文本组件',
				onNextClick: () => {
					clickButtonBySelector('[data-connection-button] button[title="Connect"]')
					setTimeout(() => {
						driver.moveNext()
					})
				}
			}
		},
		{
			element: '#output-ctx',
			popover: {
				title: '选择输出',
				description:
					'现在可以在输出菜单中选择输出。这里选择应用上下文中的邮箱。',
				onNextClick: () => {
					clickButtonBySelector('#output-ctx')
					setTimeout(() => {
						driver.moveNext()
					})
				}
			}
		},
		{
			element: '.val',
			popover: {
				title: '点击输出',
				description: '点击输出即可完成连接',
				onNextClick: () => {
					clickButtonBySelector('.val')
					setTimeout(() => {
						driver.moveNext()
					})
				}
			}
		},
		{
			popover: {
				title: '连接完成',
				description: '现在可以看到邮箱输出已经连接到文本组件输入',
				onNextClick: () => {
					updateProgress(6)

					setTimeout(() => {
						driver.moveNext()
					})
				}
			}
		}
	]}
/>
