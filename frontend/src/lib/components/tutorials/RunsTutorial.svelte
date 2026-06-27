<script lang="ts">
	import Tutorial from './Tutorial.svelte'
	import type { DriveStep } from 'driver.js'
	import { updateProgress } from '$lib/tutorialUtils'
	import { JobService, FlowService, type Flow } from '$lib/gen'
	import { workspaceStore, userStore } from '$lib/stores'
	import { wait } from '$lib/utils'
	import { waitJob } from '$lib/components/waitJob'
	import { DELAY_SHORT, DELAY_MEDIUM, DELAY_LONG, createFakeCursor, animateCursorToElementAndClick, animateFakeCursorClick } from './utils'
	import { goto } from '$app/navigation'
	import { base } from '$lib/base'
	import { sendUserToast } from '$lib/toast'

	interface Props {
		index: number
	}

	let { index }: Props = $props()

	let tutorial: Tutorial | undefined = $state(undefined)
	let tutorialFlowPaths: string[] = $state([])

	// Flags to track if steps are complete
	let step2Complete = $state(false)
	let step3Complete = $state(false)
	let step5Complete = $state(false)
	let step6Complete = $state(false)

	// Create a simple flow
	async function createTutorialFlow(): Promise<string> {
		const flowPath = `f/tutorial/runs-tutorial-flow-${Date.now()}`
		const flow: Flow = {
			summary: '教程：简单问候流程',
			description: '为运行记录教程创建的简单流程',
			value: {
				modules: [
					{
						id: 'hello',
						value: {
							type: 'rawscript',
							content: 'export async function main() {\n  return {\n    message: "Hello from the Runs tutorial!",\n    timestamp: new Date().toISOString()\n  };\n}',
							language: 'bun',
							input_transforms: {}
						},
						summary: '输出问候'
					}
				]
			},
			schema: {
				$schema: 'https://json-schema.org/draft/2020-12/schema',
				type: 'object',
				properties: {},
				required: [],
				order: []
			},
			path: flowPath,
			edited_at: '',
			edited_by: '',
			archived: false,
			extra_perms: {}
		}

		await FlowService.createFlow({
			workspace: $workspaceStore!,
			requestBody: flow
		})

		return flowPath
	}

	// Create a broken flow that will fail
	async function createBrokenFlow(): Promise<string> {
		const flowPath = `f/tutorial/runs-tutorial-broken-${Date.now()}`
		const flow: Flow = {
			summary: '教程：异常流程示例',
			description: '用于演示错误处理的故障流程',
			value: {
				modules: [
					{
						id: 'error',
						value: {
							type: 'rawscript',
							content: 'export async function main() {\n  throw new Error("Intentional error for tutorial - this demonstrates how failed jobs appear in the runs list");\n}',
							language: 'bun',
							input_transforms: {}
						},
						summary: '抛出错误'
					}
				]
			},
			schema: {
				$schema: 'https://json-schema.org/draft/2020-12/schema',
				type: 'object',
				properties: {},
				required: [],
				order: []
			},
			path: flowPath,
			edited_at: '',
			edited_by: '',
			archived: false,
			extra_perms: {}
		}

		await FlowService.createFlow({
					workspace: $workspaceStore!,
			requestBody: flow
		})

		return flowPath
	}

	// Run the flow and wait for completion
	async function runFlowAndWait(flowPath: string): Promise<string> {
		const jobId = await JobService.runFlowByPath({
			workspace: $workspaceStore!,
			path: flowPath,
			requestBody: {},
			skipPreprocessor: true
		})

		// Wait for job to complete
		await waitJob(jobId)
		return jobId
	}

	function getTutorialSteps(driver: any): DriveStep[] {
		return [
		{
			popover: {
				title: '欢迎来到监控看板！',
				description: "<p>开始之前，先了解一个关键概念：任务。任务就是脚本或流程的一次运行。每次运行代码时，系统都会创建一个任务，用来记录它是否成功、耗时多久以及结果是什么。</p><p style='margin-top: 12px;'>在本教程中，我们会查看：</p><ul style='margin-top: 8px; padding-left: 20px;'><li style='margin-bottom: 8px;'><svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' style='color: #22c55e; display: inline-block; vertical-align: middle; margin-right: 6px;'><circle cx='12' cy='12' r='10'/><path d='m9 12 2 2 4-4'/></svg>一次成功执行的任务。</li><li style='margin-bottom: 8px;'><svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' style='color: #ef4444; display: inline-block; vertical-align: middle; margin-right: 6px;'><circle cx='12' cy='12' r='10'/><path d='m12 8v4'/><path d='m12 16h.01'/></svg>一次失败执行的任务。</li><li><svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' style='color: #3b82f6; display: inline-block; vertical-align: middle; margin-right: 6px;'><circle cx='11' cy='11' r='8'/><path d='m21 21-4.35-4.35'/></svg>如何筛选监控视图。</li></ul>",
				onNextClick: () => {
					driver.moveNext()
				},
				onPrevClick: () => {
					sendUserToast('此步骤不能返回上一步', true, [], undefined, 3000)
				}
			}
		},
			{
				element: '#runs-table-wrapper',
				onHighlighted: async () => {
					step2Complete = false
					await wait(DELAY_MEDIUM)
					
					// Find all jobs
					const allJobRows = Array.from(
						document.querySelectorAll('#runs-table-wrapper .cursor-pointer')
					) as HTMLElement[]
					
					// Find successful job (green badge/check icon) - first one that's not failed
					const successfulJobRow = allJobRows.find((el) => {
						const hasRedBadge = el.querySelector('[class*="bg-red"], [class*="text-red"]')
						const hasGreenBadge = el.querySelector('[class*="bg-green"], [class*="text-green"]')
						return !hasRedBadge && hasGreenBadge !== null
					}) || allJobRows[0]

					if (successfulJobRow) {
						// Create cursor
						const cursor = createFakeCursor()
						
						// Click on successful job
						await animateCursorToElementAndClick(cursor, successfulJobRow)
						
						// Wait for navigation to job details page
						await wait(DELAY_LONG)
						
						// Navigate back to runs page using SvelteKit navigation
						await goto(`${base}/runs?tutorial=runs-tutorial`, { replaceState: true })
						await wait(DELAY_LONG)
						
						// Remove the cursor
						cursor.remove()
						step2Complete = true
					}
				},
				popover: {
					title: '查看成功执行的任务 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #22c55e; display: inline-block; vertical-align: middle;"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
					description:
						'我们点击一个成功任务，看看如何查看已完成的执行。',
					side: 'bottom',
					onNextClick: async () => {
						if (!step2Complete) {
							sendUserToast('请等待任务点击完成...', false, [], undefined, 3000)
							return
						}
						// Click on the successful job again (without showing cursor)
						const successfulJobRow = Array.from(
							document.querySelectorAll('#runs-table-wrapper .cursor-pointer')
						).find((el) => {
							const hasRedBadge = el.querySelector('[class*="bg-red"], [class*="text-red"]')
							const hasGreenBadge = el.querySelector('[class*="bg-green"], [class*="text-green"]')
							return !hasRedBadge && hasGreenBadge !== null
						}) as HTMLElement || Array.from(
							document.querySelectorAll('#runs-table-wrapper .cursor-pointer')
						)[0] as HTMLElement
						
						if (successfulJobRow) {
							successfulJobRow.click()
							await wait(DELAY_SHORT)
							
							// Wait for navigation to job details page
							await wait(DELAY_LONG)
							
							// Navigate back to runs page using SvelteKit navigation
							await goto(`${base}/runs?tutorial=runs-tutorial`, { replaceState: true })
							await wait(DELAY_LONG)
						}
						
						driver.moveNext()
					},
					onPrevClick: () => {
						sendUserToast('此步骤不能返回上一步', true, [], undefined, 3000)
					}
				}
			},
			{
				element: '#runs-table-wrapper',
				onHighlighted: async () => {
					step3Complete = false
					await wait(DELAY_MEDIUM)
					
					// Find all jobs
					const allJobRows = Array.from(
						document.querySelectorAll('#runs-table-wrapper .cursor-pointer')
					) as HTMLElement[]
					
					// Find failed job (red badge/X icon)
					const failedJobRow = allJobRows.find((el) => {
						const badge = el.querySelector('[class*="bg-red"], [class*="text-red"]')
						return badge !== null
					}) as HTMLElement

					if (failedJobRow) {
						// Create cursor
						const cursor = createFakeCursor()
						
						// Click on failed job
						await animateCursorToElementAndClick(cursor, failedJobRow)
						
						// Wait for navigation to job details page
						await wait(DELAY_LONG)
						
						// Navigate back to runs page using SvelteKit navigation
						await goto(`${base}/runs?tutorial=runs-tutorial`, { replaceState: true })
						await wait(DELAY_LONG)
						
						// Remove the cursor
						cursor.remove()
						step3Complete = true
					}
				},
				popover: {
					title: '查看失败执行的任务 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #ef4444; display: inline-block; vertical-align: middle;"><circle cx="12" cy="12" r="10"/><path d="m12 8v4"/><path d="m12 16h.01"/></svg>',
					description:
						'现在点击一个失败任务，看看如何排查失败执行。',
					side: 'bottom',
					onNextClick: async () => {
						if (!step3Complete) {
							sendUserToast('请等待任务点击完成...', false, [], undefined, 3000)
							return
						}
						// Click on the failed job again (without showing cursor)
						const failedJobRow = Array.from(
							document.querySelectorAll('#runs-table-wrapper .cursor-pointer')
						).find((el) => {
							const badge = el.querySelector('[class*="bg-red"], [class*="text-red"]')
							return badge !== null
						}) as HTMLElement
						
						if (failedJobRow) {
							failedJobRow.click()
							await wait(DELAY_SHORT)
							
							// Wait for navigation to job details page
							await wait(DELAY_LONG)
							
							// Navigate back to runs page using SvelteKit navigation
							await goto(`${base}/runs?tutorial=runs-tutorial`, { replaceState: true })
							await wait(DELAY_LONG)
						}
						
						driver.moveNext()
					},
					onPrevClick: () => {
						sendUserToast('此步骤不能返回上一步', true, [], undefined, 3000)
					}
				}
			},
			{
				element: 'div.p-2.px-4.pt-8.w-full.border-b',
				popover: {
					title: '可视化运行历史',
					description:
						'这个图表可以直观展示运行历史。耗时图会显示每个任务在不同时间的完成耗时。',
					side: 'bottom',
					onNextClick: () => {
						driver.moveNext()
					},
					onPrevClick: () => {
						sendUserToast('此步骤不能返回上一步', true, [], undefined, 3000)
					}
				}
			},
			{
				element: 'div.p-2.px-4.pt-8.w-full.border-b',
				onHighlighted: async () => {
					step5Complete = false
					await wait(DELAY_MEDIUM)
					// Find the button with data-value="ConcurrencyChart"
					const concurrencyButton = document.querySelector(
						'button[data-value="ConcurrencyChart"]'
					) as HTMLElement
					
					if (concurrencyButton) {
						await animateFakeCursorClick(concurrencyButton)
						await wait(DELAY_MEDIUM)
						step5Complete = true
					}
				},
				popover: {
					title: '切换图表视图',
					description:
						'你可以在不同图表视图之间切换来分析运行情况。并发图可以显示不同时间有多少任务同时运行。',
					side: 'bottom',
					onNextClick: () => {
						if (!step5Complete) {
							sendUserToast('请等待图表切换完成...', false, [], undefined, 3000)
							return
						}
						driver.moveNext()
					},
					onPrevClick: () => {
						sendUserToast('此步骤不能返回上一步', true, [], undefined, 3000)
					}
				}
			},
			{
				element: 'div.flex.flex-row.items-start.w-full.border-b.px-4.gap-8',
				onHighlighted: async () => {
					step6Complete = false
					await wait(DELAY_MEDIUM)
					
					// Find the success and failure filter buttons
					const successButton = document.querySelector(
						'button[data-value="success"]'
					) as HTMLElement
					const failureButton = document.querySelector(
						'button[data-value="failure"]'
					) as HTMLElement
					
					if (successButton && failureButton) {
						// Create cursor once for both clicks
						const cursor = createFakeCursor()
						
						// Click on failure button first
						await animateCursorToElementAndClick(cursor, failureButton)
						await wait(DELAY_MEDIUM)
						
						// Click on success button
						await animateCursorToElementAndClick(cursor, successButton)
						
						// Remove the cursor
						cursor.remove()
						await wait(DELAY_MEDIUM)
						step6Complete = true
					}
				},
				popover: {
					title: '按日期、类型和状态筛选任务',
					description:
						'你可以筛选任务，例如按状态筛选失败、运行中或成功的任务。这能帮助你聚焦特定类型的执行记录。',
					side: 'bottom',
					onNextClick: () => {
						if (!step6Complete) {
							sendUserToast('请等待筛选点击完成...', false, [], undefined, 3000)
							return
						}
						driver.moveNext()
					},
					onPrevClick: () => {
						sendUserToast('此步骤不能返回上一步', true, [], undefined, 3000)
					}
				}
			},
			{
				element: 'div.flex.flex-row.gap-4.items-center.px-2.py-1.grow-0.justify-between',
				popover: {
					title: '更多筛选选项',
					description:
						'这里还有更多筛选条件，可以帮助你精确找到需要的运行记录。你可以继续调整筛选条件来缩小范围。',
					side: 'bottom',
					onNextClick: () => {
						driver.moveNext()
					},
					onPrevClick: () => {
						sendUserToast('此步骤不能返回上一步', true, [], undefined, 3000)
					}
				}
			},
			{
				popover: {
					title: '教程完成！🎉',
					description:
						'你现在已经知道如何使用运行记录页面监控执行、查看成功结果并排查失败任务。<p style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(128,128,128,0.3); font-size: 0.9em; opacity: 0.9;"><strong>💡 想继续学习？</strong>你可以从主菜单的 <strong>教程</strong> 页面访问更多教程。</p>',
					onNextClick: async () => {
						updateProgress(index)
						driver.destroy()
						// Cleanup tutorial flows silently
						await cleanupTutorialFlows()
					}
				}
			}
		]
	}


	// Cleanup function to delete tutorial flows
	async function cleanupTutorialFlows() {
		// Don't delete flows if user is an operator (they don't have permission)
		if ($userStore?.operator) {
			return
		}
		
		for (const flowPath of tutorialFlowPaths) {
			try {
				await FlowService.deleteFlowByPath({
					workspace: $workspaceStore!,
					path: flowPath
				})
			} catch (error) {
				console.error(`Error deleting tutorial flow ${flowPath}:`, error)
			}
		}
	}

	// Start tutorial - create and run both jobs first
	export async function runTutorial() {
		// Create and run both flows at the beginning
		try {
			const successfulFlowPath = await createTutorialFlow()
			const brokenFlowPath = await createBrokenFlow()
			
			// Store flow paths for cleanup
			tutorialFlowPaths = [successfulFlowPath, brokenFlowPath]
			
			// Run both flows in parallel
			await Promise.all([
				runFlowAndWait(successfulFlowPath),
				runFlowAndWait(brokenFlowPath)
			])
			
			// Wait a bit for jobs to appear
			await wait(DELAY_LONG)
		} catch (error) {
			console.error('Error creating/running tutorial flows:', error)
		}
		
		tutorial?.runTutorial()
	}
</script>

<Tutorial
	bind:this={tutorial}
	{index}
	name="runs-tutorial"
	tainted={false}
	on:error
	on:skipAll
	getSteps={(driver) => {
		return getTutorialSteps(driver)
	}}
/>
