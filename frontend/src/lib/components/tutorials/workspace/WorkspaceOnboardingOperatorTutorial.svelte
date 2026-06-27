<script lang="ts">
	import { updateProgress } from '$lib/tutorialUtils'
	import Tutorial from '../Tutorial.svelte'
	import type { DriveStep } from 'driver.js'
	import { goto } from '$app/navigation'
	import { base } from '$lib/base'
	import { page } from '$app/state'
	import { wait } from '$lib/utils'
	import { DELAY_MEDIUM } from '../utils'

	interface Props {
		index: number
	}

	let { index }: Props = $props()

	let tutorial: Tutorial | undefined = $state(undefined)

	export function runTutorial() {
		// Check if we're on the homepage
		if (page.url.pathname !== `${base}/` && page.url.pathname !== `${base}`) {
			// Redirect to homepage with a tutorial parameter
			goto(`${base}/?tutorial=workspace-onboarding-operator`)
		} else {
			tutorial?.runTutorial()
		}
	}
</script>

<Tutorial
	bind:this={tutorial}
	{index}
	name="workspace-onboarding-operator"
	tainted={false}
	on:skipAll
	getSteps={(driver) => {
		const steps: DriveStep[] = [
			{
				popover: {
					title: '欢迎使用部门工具平台！🎉',
					description:
						'我们快速看一下你会用到的三个主要工具：脚本、流程和应用。',
					onNextClick: () => {
						// Wait a bit to ensure the page is fully rendered before moving to next step
						setTimeout(() => {
							// Try to find the script tab button
							const scriptsButton = document.querySelector('[data-value="script"]') as HTMLElement | null

							if (scriptsButton) {
								driver.moveNext()
							} else {
								// If we can't find the button, just move to next step anyway
								driver.moveNext()
							}
						}, 100)
					}
				}
			},
			{
				popover: {
					title: '脚本：运行自动化任务',
					description:
						'<img src="/script-tutorial-operator.png" alt="脚本示例" style="width: 100%; max-width: 400px; margin-bottom: 12px; border-radius: 8px; display: block; margin-left: auto; margin-right: auto;" /><p><strong>脚本</strong>是可直接使用的任务，可以帮你自动完成操作。</p><p style="margin-top: 8px;">你可以在需要时<strong>运行脚本</strong>，例如生成报表、发送通知或处理数据。</p>',
					onNextClick: async () => {
						// Move to the next step (Flows)
						setTimeout(() => {
							const flowsButton = document.querySelector('[data-value="flow"]') as HTMLElement | null

							if (flowsButton) {
								driver.moveNext()
							} else {
								driver.moveNext()
							}
						}, 100)
					}
				},
				element: '[data-value="script"]'
			},
			{
				popover: {
					title: '流程：运行多步骤处理',
					description:
						'<img src="/flow.png" alt="流程" style="width: 100%; max-width: 400px; margin-bottom: 12px; border-radius: 8px; display: block; margin-left: auto; margin-right: auto;" /><p><strong>流程</strong>会按顺序运行多个任务，一步接一步自动完成。</p><p style="margin-top: 8px;">你可以<strong>启动流程</strong>并查看每个步骤自动完成，适合有多个阶段的工作。</p>',
					onNextClick: async () => {
						// Move to the next step (Apps)
						setTimeout(() => {
							const appsButton = document.querySelector('[data-value="app"]') as HTMLElement | null

							if (appsButton) {
								driver.moveNext()
							} else {
								driver.moveNext()
							}
						}, 100)
					}
				},
				element: '[data-value="flow"]'
			},
			{
				popover: {
					title: '应用：使用自定义工具',
					description:
						'<img src="/app.png" alt="应用" style="width: 100%; max-width: 400px; margin-bottom: 12px; border-radius: 8px; display: block; margin-left: auto; margin-right: auto;" /><p><strong>应用</strong>是为团队定制的易用工具，里面可以包含按钮、表单和展示区域。</p><p style="margin-top: 8px;">你可以<strong>打开应用</strong>处理数据、填写表单或触发任务，不需要技术背景。</p>',
					onNextClick: async () => {
						// Move to the next step (cursor animation)
						driver.moveNext()
					}
				},
				element: '[data-value="app"]'
			},
			{
				popover: {
					title: '最后看看菜单区域',
					description: '你可以在这里访问运行历史、定时脚本、教程进度等栏目。<p style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(128,128,128,0.3); font-size: 0.9em; opacity: 0.9;"><strong>💡 想继续学习？</strong>你可以从主菜单的 <strong>教程</strong> 页面访问更多教程。</p>',
					onNextClick: async () => {
						// Find the target button and click it
						const targetButton = document.querySelector('[role="menuitem"]') as HTMLElement | null
						if (targetButton) {
							targetButton.click()
						}

						// Wait for menu to open
						await wait(DELAY_MEDIUM)

						// Mark tutorial as complete
						updateProgress(index)
						driver.destroy()

						// Clean up URL parameter if present
						if (page.url.searchParams.has('tutorial')) {
							goto(`${base}/`, { replaceState: true })
						}
					}
				},
				element: '[role="menuitem"]'
			}
		]

		return steps
	}}
/>
