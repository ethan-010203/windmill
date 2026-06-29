<script lang="ts">
	import { enterpriseLicense } from '$lib/stores'
	import CronInput from '$lib/components/CronInput.svelte'
	import ScriptPicker from '$lib/components/ScriptPicker.svelte'
	import Section from '$lib/components/Section.svelte'
	import Alert from '$lib/components/common/alert/Alert.svelte'
	import DrawerContent from '$lib/components/common/drawer/DrawerContent.svelte'
	import Tab from '$lib/components/common/tabs/Tab.svelte'
	import Tabs from '$lib/components/common/tabs/Tabs.svelte'
	import {
		FlowService,
		JobService,
		ScheduleService,
		SettingService,
		WorkspaceService
	} from '$lib/gen'
	import { workspaceStore } from '$lib/stores'
	import { base } from '$lib/base'
	import { emptyString, formatCron, sendUserToast, tryEvery } from '$lib/utils'
	import SchemaForm from '$lib/components/SchemaForm.svelte'
	import Button from '$lib/components/common/button/Button.svelte'
	import Toggle from '$lib/components/Toggle.svelte'
	import { RotateCw, Save } from 'lucide-svelte'
	import { CUSTOM_TAGS_SETTING, WORKSPACE_SLACK_BOT_TOKEN_PATH } from '$lib/consts'
	import { loadSchemaFromPath } from '$lib/infer'
	import { hubPaths } from '$lib/hub'
	import { untrack } from 'svelte'
	interface Props {
		appPath: string
		open?: boolean
	}

	let { appPath, open = $bindable(false) }: Props = $props()

	let appReportingEnabled = $state(false)
	let appReportingStartupDuration = $state(5)
	let appReportingSchedule: {
		cron: string
		timezone: string
	} = $state({
		cron: '0 0 12 * *',
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
	})
	let selectedTab: 'email' | 'slack' | 'discord' | 'custom' = $state(
		$enterpriseLicense ? 'slack' : 'custom'
	)

	let screenshotKind: 'pdf' | 'png' = $state('pdf')

	let customPath: string | undefined = $state(undefined)
	let customPathSchema: Record<string, any> = $state({})
	let args: Record<string, any> = $state({})
	let areArgsValid = $state(true)
	let customWidth: null | number = $state(1200)
	let customHeight: null | number = $state(null)

	$effect(() => {
		customPath
			? loadSchemaFromPath(customPath).then((schema) => {
					customPathSchema = schema
						? {
								...schema,
								properties: Object.fromEntries(
									Object.entries(schema.properties ?? {}).filter(
										([key, _]) => key !== 'screenshot' && key !== 'app_path' && key !== 'kind'
									)
								)
							}
						: {}
				})
			: (customPathSchema = {})
	})

	let isSlackConnectedWorkspace = $state(false)
	async function getWorspaceSlackSetting() {
		const settings = await WorkspaceService.getPublicSettings({
			workspace: $workspaceStore!
		})
		if (settings.slack_name) {
			isSlackConnectedWorkspace = true
		} else {
			isSlackConnectedWorkspace = false
		}
	}
	getWorspaceSlackSetting()

	async function getAppReportingInfo() {
		const flowPath = appPath + '_reports'
		try {
			const flow = await FlowService.getFlowByPath({
				workspace: $workspaceStore!,
				path: flowPath
			})

			const schedule = await ScheduleService.getSchedule({
				workspace: $workspaceStore!,
				path: flowPath
			})

			appReportingSchedule = {
				cron: schedule.schedule,
				timezone: schedule.timezone
			}
			appReportingStartupDuration =
				(schedule.args?.startup_duration as number) ?? appReportingStartupDuration
			screenshotKind = (schedule.args?.kind as 'png' | 'pdf') ?? screenshotKind

			selectedTab =
				flow.value.modules[1]?.value.type === 'script'
					? flow.value.modules[1].value.path === notificationScripts.email.path
						? 'email'
						: flow.value.modules[1].value.path === notificationScripts.slack.path
							? 'slack'
							: flow.value.modules[1].value.path === notificationScripts.discord.path
								? 'discord'
								: 'custom'
					: 'custom'

			if (schedule.args?.customWidth) customWidth = schedule.args?.customWidth as number
			if (schedule.args?.customHeight) customHeight = schedule.args?.customHeight as number

			const nargs = schedule.args
				? Object.fromEntries(
						Object.entries(schedule.args).filter(
							([key, _]) => key !== 'app_path' && key !== 'startup_duration' && key !== 'kind'
						)
					)
				: {}
			setTimeout(() => {
				args = structuredClone($state.snapshot(nargs))
			})

			customPath =
				selectedTab === 'custom' &&
				flow.value.modules[1]?.value.type === 'script' &&
				!flow.value.modules[1].value.path.startsWith('hub/')
					? flow.value.modules[1].value.path
					: undefined

			appReportingEnabled = true
		} catch (err) {}
	}

	$effect(() => {
		appPath && untrack(() => getAppReportingInfo())
	})

	async function disableAppReporting() {
		const flowPath = appPath + '_reports'
		await ScheduleService.deleteSchedule({
			workspace: $workspaceStore!,
			path: flowPath
		})
		await FlowService.deleteFlowByPath({
			workspace: $workspaceStore!,
			path: flowPath
		})
		appReportingEnabled = false
		sendUserToast('App reporting disabled')
	}

	const notificationScripts = {
		discord: {
			path: hubPaths.discordReport,
			schema: {
				type: 'object',
				properties: {
					discord_webhook: {
						type: 'object',
						format: 'resource-discord_webhook',
						properties: {},
						required: [],
						description: ''
					}
				},
				required: ['discord_webhook']
			}
		},
		slack: {
			path: hubPaths.slackReport, // if to be updated, also update it in in backend/windmill-queue/src/jobs.rs
			schema: {
				type: 'object',
				properties: {
					channel: {
						type: 'string',
						default: ''
					}
				},
				required: ['channel']
			}
		},
		email: {
			path: hubPaths.smtpReport,
			schema: {
				type: 'object',
				properties: {
					smtp: {
						type: 'object',
						format: 'resource-smtp',
						properties: {},
						required: [],
						description: ''
					},
					from_email: {
						type: 'string',
						default: ''
					},
					to_email: {
						type: 'string',
						default: ''
					}
				},
				required: ['smtp', 'from_email', 'to_email']
			}
		}
	}

	function getFlowArgs() {
		return {
			app_path: appPath,
			startup_duration: appReportingStartupDuration,
			kind: screenshotKind,
			customWidth,
			customHeight,
			...args,
			...(selectedTab === 'slack'
				? {
						slack: '$res:' + WORKSPACE_SLACK_BOT_TOKEN_PATH
					}
				: {})
		}
	}

	function getFlowValue() {
		const notifInputTransforms: {
			[key: string]: {
				expr: string
				type: 'javascript'
			}
		} = {
			app_path: {
				type: 'javascript',
				expr: 'flow_input.app_path'
			},
			screenshot: {
				type: 'javascript',
				expr: 'results.a'
			},
			kind: {
				type: 'javascript',
				expr: 'flow_input.kind'
			},
			customWidth: {
				type: 'javascript',
				expr: 'flow_input.customWidth'
			},
			customHeight: {
				type: 'javascript',
				expr: 'flow_input.customHeight'
			},
			...Object.fromEntries(
				Object.keys(args).map((key) => [
					key,
					{
						type: 'javascript',
						expr: `flow_input.${key}`
					}
				])
			),
			...(selectedTab === 'slack'
				? {
						slack: {
							type: 'javascript',
							expr: 'flow_input.slack'
						}
					}
				: {})
		}

		const value = {
			modules: [
				{
					id: 'a',
					value: {
						type: 'script' as const,
						tag_override: 'chromium',
						path: hubPaths.appReport,
						input_transforms: {
							app_path: {
								expr: 'flow_input.app_path',
								type: 'javascript' as const
							},
							startup_duration: {
								expr: 'flow_input.startup_duration',
								type: 'javascript' as const
							},
							kind: {
								expr: 'flow_input.kind',
								type: 'javascript' as const
							},
							customWidth: {
								expr: 'flow_input.customWidth',
								type: 'javascript' as const
							},
							customHeight: {
								expr: 'flow_input.customHeight',
								type: 'javascript' as const
							}
						}
					}
				},
				{
					id: 'b',
					value: {
						type: 'script' as const,
						path:
							selectedTab === 'custom' ? customPath || '' : notificationScripts[selectedTab].path,
						input_transforms: notifInputTransforms
					}
				}
			]
		}

		return value
	}

	async function enableAppReporting() {
		const flowPath = appPath + '_reports'

		try {
			// will only work if the user is super admin
			const customTags = ((await SettingService.getGlobal({
				key: CUSTOM_TAGS_SETTING
			})) ?? []) as string[]

			if (!customTags.includes('chromium')) {
				await SettingService.setGlobal({
					key: CUSTOM_TAGS_SETTING,
					requestBody: {
						value: [...customTags, 'chromium']
					}
				})
			}
		} catch (err) {}

		await FlowService.deleteFlowByPath({
			workspace: $workspaceStore!,
			path: flowPath
		})

		await FlowService.createFlow({
			workspace: $workspaceStore!,
			requestBody: {
				summary: appPath + ' - Reports flow',
				value: getFlowValue(),
				schema: {
					$schema: 'https://json-schema.org/draft/2020-12/schema',
					properties: {
						app_path: {
							description: '',
							type: 'string',
							default: null,
							format: ''
						},
						startup_duration: {
							description: '',
							type: 'integer',
							default: 5,
							format: ''
						},
						kind: {
							description: '',
							type: 'string',
							enum: ['pdf', 'png'],
							default: 'pdf',
							format: ''
						},
						customWidth: {
							description: '',
							type: 'integer',
							format: '',
							default: 1200
						},
						customHeight: {
							description: '',
							type: 'integer',
							format: '',
							default: 1200
						},
						...(selectedTab === 'custom'
							? customPathSchema.properties
							: notificationScripts[selectedTab].schema.properties),
						...(selectedTab === 'slack'
							? {
									slack: {
										description: '',
										type: 'object',
										format: 'resource-slack',
										properties: {},
										required: []
									}
								}
							: {})
					},
					required: [
						'app_path',
						'startup_duration',
						'kind',
						...(selectedTab === 'custom'
							? customPathSchema.required
							: notificationScripts[selectedTab].schema.required),
						...(selectedTab === 'slack' ? ['slack'] : [])
					],
					type: 'object'
				},
				path: flowPath
			}
		})

		try {
			await ScheduleService.deleteSchedule({
				workspace: $workspaceStore!,
				path: flowPath
			})
		} catch (err) {}

		await ScheduleService.createSchedule({
			workspace: $workspaceStore!,
			requestBody: {
				path: flowPath,
				schedule: formatCron(appReportingSchedule.cron),
				timezone: appReportingSchedule.timezone,
				script_path: flowPath,
				is_flow: true,
				args: getFlowArgs(),
				enabled: true
			}
		})
		appReportingEnabled = true
	}

	let testLoading = $state(false)
	async function testReport() {
		try {
			testLoading = true
			const jobId = await JobService.runFlowPreview({
				workspace: $workspaceStore!,
				requestBody: {
					args: getFlowArgs(),
					value: getFlowValue()
				}
			})
			tryEvery({
				tryCode: async () => {
					let testResult = await JobService.getCompletedJob({
						workspace: $workspaceStore!,
						id: jobId
					})
					testLoading = false
					sendUserToast(
						testResult.success
							? 'Report sent successfully'
							: 'Report error: ' + testResult.result?.['error']?.['message'],
						!testResult.success
					)
				},
				timeoutCode: async () => {
					testLoading = false
					sendUserToast('Reports flow did not return after 30s', true)
					try {
						await JobService.cancelQueuedJob({
							workspace: $workspaceStore!,
							id: jobId,
							requestBody: {
								reason: 'Reports flow did not return after 30s'
							}
						})
					} catch (err) {
						console.error(err)
					}
				},
				interval: 500,
				timeout: 30000
			})
		} catch (err) {
			sendUserToast('Could not test reports flow: ' + err, true)
			testLoading = false
		}
	}

	let disabled = $state(true)
	$effect(() => {
		disabled =
			emptyString(appReportingSchedule.cron) ||
			(selectedTab === 'custom' && emptyString(customPath)) ||
			(selectedTab === 'slack' && !isSlackConnectedWorkspace) ||
			!areArgsValid
	})
</script>

<DrawerContent
	on:close={() => (open = false)}
	title="定时报表"
	tooltip="按计划发送应用的 PDF 或 PNG 预览"
>
	{#snippet actions()}
		<div class="mr-4 center-center">
			<Toggle
				checked={appReportingEnabled}
				options={{ right: '启用', left: '禁用' }}
				on:change={async () => {
					if (appReportingEnabled) {
						disableAppReporting()
					} else {
						await enableAppReporting()
						sendUserToast('应用报表已启用')
					}
				}}
				disabled={disabled && !appReportingEnabled}
			/>
		</div>
		<Button
			variant="accent"
			startIcon={{ icon: Save }}
			unifiedSize="md"
			on:click={async () => {
				await enableAppReporting()
				sendUserToast('应用报表已更新')
				open = false
			}}
			{disabled}
		>
			{appReportingEnabled ? '更新' : '保存并启用'}
		</Button>
	{/snippet}
	<div class="flex flex-col gap-8">
		<Alert type="info" title="定时 PDF/PNG 报表"
			>按计划发送应用的 PDF 或 PNG 预览。启用后会在当前工作区创建一个流程和一个计划任务。
			<br /><br />
			为了执行该流程，需要将某个 worker 的 WORKER_GROUP 环境变量设置为 “reports”，或给某个 worker 组添加 “chromium” 标签。
		</Alert>

		<Section label="报表计划">
			<CronInput
				bind:schedule={appReportingSchedule.cron}
				bind:timezone={appReportingSchedule.timezone}
			/>
		</Section>

		<Section
			label="启动等待秒数"
			tooltip="截图前等待的秒数，用于确保所有启动脚本已经执行完成。"
		>
			<div class="w-full pt-2">
				<input
					type="number"
					class="text-sm w-full font-semibold"
					bind:value={appReportingStartupDuration}
				/>
			</div>
		</Section>

		<Section label="截图类型">
			<div class="w-full pt-2">
				<select class="text-sm w-full font-semibold" bind:value={screenshotKind}>
					<option value="pdf">PDF</option>
					<option value="png">PNG</option>
				</select>
			</div>
		</Section>

		<Section label="自定义分辨率" collapsable>
			<div class="flex gap-4 w-52">
				<input
					type="number"
					class="text-sm"
					bind:value={customWidth}
					placeholder="auto"
					min="768"
				/>
				x
				<input type="number" bind:value={customHeight} placeholder="auto" min="0" />
			</div>
		</Section>

		<Section label="通知">
			<Tabs bind:selected={selectedTab}>
				{#if !$enterpriseLicense}
					<Tab value="custom" label="自定义" />
				{/if}
				<Tab
					value="slack"
					disabled={!$enterpriseLicense}
					label="Slack{!$enterpriseLicense ? '（未开放）' : ''}"
				/>

				<Tab
					value="discord"
					disabled={!$enterpriseLicense}
					label="Discord{!$enterpriseLicense ? '（未开放）' : ''}"
				/>

				<Tab
					value="email"
					disabled={!$enterpriseLicense}
					label="邮件{!$enterpriseLicense ? '（未开放）' : ''}"
				/>

				{#if $enterpriseLicense}
					<Tab value="custom" label="自定义" />
				{/if}
			</Tabs>
			{#if selectedTab === 'custom'}
				<div class="pt-2">
					<ScriptPicker
						on:select={(ev) => {
							customPath = ev.detail.path
						}}
						initialPath={customPath}
						allowRefresh
					/>
				</div>
				<div class="prose text-2xs text-primary mt-2">
					选择一个脚本来处理 PDF/PNG 报表。

					<br />

					脚本会收到参数 `screenshot: string`、`kind: 'pdf' | 'png'`、`app_path: string`。其中
					`screenshot` 是 base64 编码的 PDF/PNG 报表，`kind` 是截图类型，`app_path` 是应用路径。
				</div>
			{/if}
			{#if selectedTab === 'slack'}
				<div class="pt-4">
					{#if isSlackConnectedWorkspace}
						<Alert type="info" title="将使用工作区已关联的 Slack 资源" />
					{:else}
						<Alert type="error" title="工作区未连接 Slack">
							<div class="flex flex-row gap-x-1 w-full items-center">
								<p class="text-clip grow min-w-0">
									使用此功能前需要先连接 Slack。可以在<a
										target="_blank"
										href="{base}/workspace_settings?tab=slack">这里配置</a
									>.
								</p>
								<Button
									variant="default"
									on:click={getWorspaceSlackSetting}
									startIcon={{ icon: RotateCw }}
								/>
							</div>
						</Alert>
					{/if}
				</div>
			{/if}
			<div class="w-full pt-4">
				{#if selectedTab !== 'custom' || customPath !== undefined}
					{#key selectedTab + JSON.stringify(customPathSchema ?? {})}
						<SchemaForm
							onlyMaskPassword
							bind:isValid={areArgsValid}
							bind:args
							schema={selectedTab !== 'custom'
								? notificationScripts[selectedTab].schema
								: customPathSchema}
						/>
					{/key}
				{/if}
			</div>
			<Button
				loading={testLoading}
				{disabled}
				on:click={testReport}
				unifiedSize="md"
				variant="accent"
				btnClasses="w-auto"
			>
				Send test report
			</Button>
		</Section>
	</div>
</DrawerContent>
