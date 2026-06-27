<script lang="ts">
	import { updateProgress } from '$lib/tutorialUtils'
	import Tutorial from '../Tutorial.svelte'
	import type { DriveStep } from 'driver.js'
	import { goto } from '$app/navigation'
	import { base } from '$lib/base'
	import { page } from '$app/state'

	interface Props {
		index: number
	}

	let { index }: Props = $props()

	let tutorial: Tutorial | undefined = $state(undefined)

	export function runTutorial() {
		// Check if we're on the homepage
		if (page.url.pathname !== `${base}/` && page.url.pathname !== `${base}`) {
			// Redirect to homepage with a tutorial parameter
			goto(`${base}/?tutorial=workspace-onboarding`)
		} else {
			tutorial?.runTutorial()
		}
	}
</script>

<Tutorial
	bind:this={tutorial}
	index={index}
	name="workspace-onboarding"
	tainted={false}
	on:skipAll
	getSteps={(driver) => {
		const steps: DriveStep[] = [
			{
				popover: {
					title: '欢迎来到你的工作空间！🎉',
					description:
						'我们快速浏览一下工作空间的主要区域。',
					onNextClick: () => {
						// Wait a bit to ensure the page is fully rendered before moving to next step
						setTimeout(() => {
							const button = document.querySelector('#create-script-button') as HTMLElement | null
							if (button) {
								driver.moveNext()
							} else {
								alert('找不到“创建脚本”按钮。请确认你当前在首页。')
							}
						}, 100)
					}
				}
			},
			{
				popover: {
					title: '创建第一个脚本',
					description:
						'<img src="/languages.png" alt="编程语言" style="width: 100%; max-width: 400px; margin-bottom: 12px; border-radius: 8px; display: block; margin-left: auto; margin-right: auto;" /><p>脚本可以把代码变成可直接使用的工具。你可以使用 Python、TypeScript、Go、Bash、SQL 等语言编写，并手动运行、定时运行，或通过 Webhook 触发。</p>',
					onNextClick: async () => {
						// Move to the next step (Create Flow button)
						setTimeout(() => {
							const button = document.querySelector('#create-flow-button') as HTMLElement | null
							if (button) {
								driver.moveNext()
							} else {
								alert('找不到“创建流程”按钮。请确认你当前在首页。')
							}
						}, 100)
					}
				},
				element: '#create-script-button',
			},
			{
				popover: {
					title: '创建第一个流程',
					description:
						'<img src="/flow.png" alt="流程" style="width: 100%; max-width: 400px; margin-bottom: 12px; border-radius: 8px; display: block; margin-left: auto; margin-right: auto;" /><p>流程用于编排多个脚本。你可以把脚本串联起来，并通过分支、循环和错误处理构建复杂工作流。</p>',
					onNextClick: async () => {
						// Move to the next step (Create App button)
						setTimeout(() => {
							const button = document.querySelector('#create-app-button') as HTMLElement | null
							if (button) {
								driver.moveNext()
							} else {
								alert('找不到“创建应用”按钮。请确认你当前在首页。')
							}
						}, 100)
					}
				},
				element: '#create-flow-button',
			},
			{
				popover: {
					title: '创建第一个应用',
					description:
						'<img src="/app.png" alt="应用" style="width: 100%; max-width: 400px; margin-bottom: 12px; border-radius: 8px; display: block; margin-left: auto; margin-right: auto;" /><p>应用是通过拖拽方式构建的自定义界面。你可以组合表格、表单、图表和按钮，并触发脚本或流程。本次导览到这里就结束了。</p><p style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(128,128,128,0.3); font-size: 0.9em; opacity: 0.9;"><strong>💡 想继续学习？</strong>你可以从主菜单的 <strong>教程</strong> 页面，或 <strong>帮助</strong> 子菜单访问更多教程。</p>',
					onNextClick: async () => {
						// Mark tutorial as complete
						updateProgress(index)
						driver.destroy()

						// Clean up URL parameter if present
						if (page.url.searchParams.has('tutorial')) {
							goto(`${base}/`, { replaceState: true })
						}
					}
				},
				element: '#create-app-button',
			}
		]

		return steps
	}}
/>
