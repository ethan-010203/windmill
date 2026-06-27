<script lang="ts">
	import { updateProgress } from '$lib/tutorialUtils'
	import { type DriveStep } from 'driver.js'
	import Tutorial from '../Tutorial.svelte'
	import { clickButtonBySelector } from '../utils'

	interface Props {
		name: string;
		index: number;
	}

	let { name, index }: Props = $props();

	let tutorial: Tutorial | undefined = $state(undefined)

	export function runTutorial(skipStepsCount: number | undefined = undefined) {
		tutorial?.runTutorial({ skipStepsCount })
	}
</script>

<Tutorial
	bind:this={tutorial}
	{index}
	{name}
	on:error
	on:skipAll
	getSteps={(driver, options) => {
		const steps: DriveStep[] = [
			{
				element: '#app-editor-runnable-panel',
				popover: {
					title: '运行项面板',
					description:
						'这是运行项面板。你可以在这里向应用添加后台运行项。后台运行项本质上是可在后台执行的脚本，你可以按需添加多个。'
				}
			},
			{
				element: '#create-background-runnable',
				popover: {
					title: '创建运行项',
					description:
						'点击这里创建一个运行项。运行项是可在后台执行的脚本，你可以按需添加多个。',
					onNextClick: () => {
						clickButtonBySelector('#create-background-runnable')
						setTimeout(() => driver.moveNext())
					}
				}
			},
			{
				element: '#app-editor-empty-runnable',
				popover: {
					title: '空运行项面板',
					description:
						'这是空的运行项面板。你可以在这里向应用添加后台运行项，也可以从工作空间或插件中心选择脚本或流程。'
				}
			},

			{
				element: '#app-editor-backend-runnables',
				popover: {
					title: '后端运行项',
					description:
						'后端运行项是在服务器上执行的脚本，可用于完成浏览器端无法完成的任务，例如发送邮件、执行数据库操作等。'
				}
			},
			{
				element: '#app-editor-frontend-runnables',
				popover: {
					title: '前端运行项',
					description:
						'前端脚本会在浏览器中执行，可以直接操作应用上下文，也可以通过组件控制项与组件交互。',
					onNextClick: () => {
						setTimeout(() => {
							driver.moveNext()

							updateProgress(5)
						})
					}
				}
			}
		]

		// Remove steps if we want to skip them (excpet the first one)

		if (options?.skipStepsCount) {
			steps.splice(1, options.skipStepsCount)
		}

		return steps
	}}
/>
