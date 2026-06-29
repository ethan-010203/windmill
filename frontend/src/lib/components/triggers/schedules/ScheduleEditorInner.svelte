<script lang="ts">
	import { Alert, Badge, Button, ButtonType, Tab, Tabs } from '$lib/components/common'
	import TriggerAdvancedBadges from '../TriggerAdvancedBadges.svelte'
	import Drawer from '$lib/components/common/drawer/Drawer.svelte'
	import DrawerContent from '$lib/components/common/drawer/DrawerContent.svelte'
	import CronInput from '$lib/components/CronInput.svelte'
	import Path from '$lib/components/Path.svelte'
	import LabelsInput from '$lib/components/LabelsInput.svelte'
	import Required from '$lib/components/Required.svelte'
	import ScriptPicker from '$lib/components/ScriptPicker.svelte'
	import PipelineLockedRunnableInfo from '$lib/components/triggers/PipelineLockedRunnableInfo.svelte'
	import ErrorOrRecoveryHandler from '$lib/components/ErrorOrRecoveryHandler.svelte'
	import Toggle from '$lib/components/Toggle.svelte'
	import Tooltip from '$lib/components/Tooltip.svelte'
	import Dropdown from '$lib/components/DropdownV2.svelte'
	import {
		FlowService,
		ScheduleService,
		type Script,
		ScriptService,
		type Flow,
		SettingService,
		type Retry,
		type Schedule,
		type ErrorHandler
	} from '$lib/gen'
	import { enterpriseLicense, userStore, workspaceStore } from '$lib/stores'
	import { canWrite, emptyString, formatCron, sendUserToast, cronV1toV2 } from '$lib/utils'
	import { base } from '$lib/base'
	import Section from '$lib/components/Section.svelte'
	import { List, Loader2, Save, AlertTriangle } from 'lucide-svelte'
	import autosize from '$lib/autosize'
	import TriggerEditorToolbar from '$lib/components/triggers/TriggerEditorToolbar.svelte'
	import { saveScheduleFromCfg } from '$lib/components/flows/scheduleUtils'
	import DateTimeInput from '$lib/components/DateTimeInput.svelte'
	import FlowRetries from '$lib/components/flows/content/FlowRetries.svelte'
	import Label from '$lib/components/Label.svelte'
	import WorkerTagPicker from '$lib/components/WorkerTagPicker.svelte'
	import { runScheduleNow } from '../scheduled/utils'
	import { handleConfigChange } from '../utils'
	import { withForkConflictRetry } from '$lib/utils/forkConflict'
	import { useTriggerDraftSync } from '../useTriggerDraftSync.svelte'
	import LocalDraftBanner from '$lib/components/LocalDraftBanner.svelte'
	import TextInput from '$lib/components/text_input/TextInput.svelte'
	import { twMerge } from 'tailwind-merge'
	import PermissionedAsLine from '../PermissionedAsLine.svelte'

	let {
		useDrawer = true,
		hideTarget = false,
		docDescription = undefined,
		allowDraft = false,
		draftSchema = undefined,
		customLabel = undefined,
		isDeployed = false,
		onUpdate = undefined,
		onConfigChange = undefined,
		onDelete = undefined,
		onReset = undefined,
		trigger = undefined
	} = $props()

	let optionTabSelected:
		| 'error_handler'
		| 'recovery_handler'
		| 'success_handler'
		| 'retries'
		| 'dynamic_skip' = $state('error_handler')
	let initialPath = $state('')
	let edit = $state(true)
	let schedule: string = $state('0 0 12 * *')
	let cronVersion: string = $state('v2')
	let isLatestCron = $state(true)
	let initialCronVersion: string = $state('v2')
	let initialSchedule: string
	let timezone: string = $state(Intl.DateTimeFormat().resolvedOptions().timeZone)
	let paused_until: string | undefined = $state(undefined)
	let itemKind: 'flow' | 'script' = $state('script')
	let is_flow: boolean = $derived.by(() => itemKind === 'flow')
	let errorHandleritemKind: 'flow' | 'script' = $state('script')
	let wsErrorHandlerMuted: boolean = $state(false)
	let errorHandlerPath: string | undefined = $state(undefined)
	let errorHandlerSelected: ErrorHandler = $state('slack')
	let errorHandlerExtraArgs: Record<string, any> = $state({})
	let recoveryHandlerPath: string | undefined = $state(undefined)
	let recoveryHandlerSelected: ErrorHandler = $state('slack')
	let recoveryHandlerItemKind: 'flow' | 'script' = $state('script')
	let recoveryHandlerExtraArgs: Record<string, any> = $state({})
	let successHandlerPath: string | undefined = $state(undefined)
	let successHandlerSelected: ErrorHandler = $state('slack')
	let successHandlerItemKind: 'flow' | 'script' = $state('script')
	let successHandlerExtraArgs: Record<string, any> = $state({})
	let failedTimes = $state(1)
	let failedExact = $state(false)
	let recoveredTimes = $state(1)
	let retry: Retry | undefined = $state(undefined)
	let dynamicSkipPath: string | undefined = $state(undefined)
	let script_path = $state('')
	let initialScriptPath = $state('')
	// When non-empty, the drawer was opened from the pipeline editor for an
	// already-bound script. We swap the runnable ScriptPicker for a read-only
	// viewer so the trigger can't be silently reassigned off the pipeline.
	let fixedScriptPath = $state('')
	let runnable: Script | Flow | undefined = $state()
	let args: Record<string, any> = $state({})
	let loading = $state(false)
	let drawerLoading = $state(true)
	let showLoading = $state(false)
	let initialConfig: Record<string, any> | undefined = undefined
	let extraPerms: Record<string, boolean> = $state({})
	let can_write = $state(true)
	let initNewPath = $state(false)
	let path: string = $state('')
	let enabled: boolean = $state(false)
	let pathError = $state('')
	let summary = $state('')
	let labels: string[] | undefined = $state(undefined)
	let description = $state('')
	let no_flow_overlap = $state(false)
	let tag: string | undefined = $state(undefined)
	let validCRON = $state(true)
	let isValid = $state(true)
	let allowSchedule = $derived(isValid && validCRON && script_path != '')
	let deploymentLoading = $state(false)
	let permissionedAs = $state<string | undefined>(undefined)
	let selectedPermissionedAs = $state<string | undefined>(undefined)
	let preservePermissionedAs = $state(false)

	const saveDisabled = $derived(
		!allowSchedule ||
			pathError != '' ||
			emptyString(script_path) ||
			(errorHandlerSelected == 'slack' &&
				!emptyString(errorHandlerPath) &&
				emptyString(errorHandlerExtraArgs['channel'])) ||
			!can_write
	)
	const scheduleCfg = $derived.by(getScheduleCfg)

	const draftSync = useTriggerDraftSync({
		itemKind: 'trigger_schedule',
		path: () => initialPath,
		workspace: () => $workspaceStore,
		drawerLoading: () => drawerLoading,
		getCfg: () => scheduleCfg,
		applyCfg: loadScheduleCfg,
		deployed: () => initialConfig
	})

	export async function openEdit(
		ePath: string,
		isFlow: boolean,
		defaultCfg?: Record<string, any>,
		fixedScriptPath_?: string
	) {
		let loadingTimeout = setTimeout(() => {
			showLoading = true
		}, 100) // Do not show loading spinner for the first 100ms
		drawerLoading = true
		try {
			drawer?.openDrawer()
			initialPath = ePath
			itemKind = isFlow ? 'flow' : 'script'
			path = defaultCfg?.path ?? ePath
			fixedScriptPath = fixedScriptPath_ ?? ''
			const { overlay: draftOverlay, noDeployed } = await loadSchedule(defaultCfg)
			// Draft-only schedules have no deployed row, so saving must CREATE (update 404s).
			edit = !noDeployed
			if (!defaultCfg) {
				// Form holds DEPLOYED here; capture it as `initialConfig` so the
				// dirty check / banner fires whenever a saved draft exists.
				initialConfig = structuredClone($state.snapshot(getScheduleCfg()))
			}
			if (draftOverlay) await loadScheduleCfg(draftOverlay)
			await draftSync.maybeRestore()
		} finally {
			clearTimeout(loadingTimeout)
			drawerLoading = false
			showLoading = false
		}
	}

	async function setScheduleHandler(s?: Schedule) {
		if (s) {
			if (s.on_failure) {
				let splitted = s.on_failure.split('/')
				errorHandleritemKind = splitted[0] as 'flow' | 'script'
				errorHandlerPath = splitted.slice(1)?.join('/')
				failedTimes = s.on_failure_times ?? 1
				failedExact = s.on_failure_exact ?? false
				errorHandlerExtraArgs = s.on_failure_extra_args ?? {}
				errorHandlerSelected = getHandlerType('error', errorHandlerPath)
			} else {
				errorHandlerPath = undefined
				errorHandleritemKind = 'script'
				errorHandlerExtraArgs = {}
				failedExact = false
				failedTimes = 1
				errorHandlerSelected = 'slack'
			}
			if (s.on_recovery) {
				let splitted = s.on_recovery.split('/')
				recoveryHandlerItemKind = splitted[0] as 'flow' | 'script'
				recoveryHandlerPath = splitted.slice(1)?.join('/')
				recoveredTimes = s.on_recovery_times ?? 1
				recoveryHandlerExtraArgs = s.on_recovery_extra_args ?? {}
				recoveryHandlerSelected = getHandlerType('recovery', recoveryHandlerPath)
			} else {
				recoveryHandlerPath = undefined
				recoveryHandlerItemKind = 'script'
				recoveredTimes = 1
				recoveryHandlerSelected = 'slack'
				recoveryHandlerExtraArgs = {}
			}
			if (s.on_success) {
				let splitted = s.on_success.split('/')
				successHandlerItemKind = splitted[0] as 'flow' | 'script'
				successHandlerPath = splitted.slice(1)?.join('/')
				successHandlerExtraArgs = s.on_success_extra_args ?? {}
				successHandlerSelected = getHandlerType('success', successHandlerPath)
			} else {
				successHandlerPath = undefined
				successHandlerItemKind = 'script'
				successHandlerSelected = 'slack'
				successHandlerExtraArgs = {}
			}
		} else {
			let defaultErrorHandlerMaybe = undefined
			let defaultRecoveryHandlerMaybe = undefined
			let defaultSuccessHandlerMaybe = undefined
			if ($workspaceStore) {
				defaultErrorHandlerMaybe = (await SettingService.getGlobal({
					key: 'default_error_handler_' + $workspaceStore!
				})) as any
				defaultRecoveryHandlerMaybe = (await SettingService.getGlobal({
					key: 'default_recovery_handler_' + $workspaceStore!
				})) as any
				defaultSuccessHandlerMaybe = (await SettingService.getGlobal({
					key: 'default_success_handler_' + $workspaceStore!
				})) as any
			}

			if (defaultErrorHandlerMaybe !== undefined && defaultErrorHandlerMaybe !== null) {
				wsErrorHandlerMuted = defaultErrorHandlerMaybe['wsErrorHandlerMuted']
				let splitted = (defaultErrorHandlerMaybe['errorHandlerPath'] as string).split('/')
				errorHandleritemKind = splitted[0] as 'flow' | 'script'
				errorHandlerPath = splitted.slice(1)?.join('/')
				errorHandlerExtraArgs = defaultErrorHandlerMaybe['errorHandlerExtraArgs']
				errorHandlerSelected = getHandlerType('error', errorHandlerPath)
				failedTimes = defaultErrorHandlerMaybe['failedTimes']
				failedExact = defaultErrorHandlerMaybe['failedExact']
			} else {
				wsErrorHandlerMuted = false
				errorHandlerPath = undefined
				errorHandleritemKind = 'script'
				errorHandlerExtraArgs = {}
				errorHandlerSelected = 'slack'
				failedTimes = 1
				failedExact = false
			}
			if (defaultRecoveryHandlerMaybe !== undefined && defaultRecoveryHandlerMaybe !== null) {
				let splitted = (defaultRecoveryHandlerMaybe['recoveryHandlerPath'] as string).split('/')
				recoveryHandlerItemKind = splitted[0] as 'flow' | 'script'
				recoveryHandlerPath = splitted.slice(1)?.join('/')
				recoveryHandlerExtraArgs = defaultRecoveryHandlerMaybe['recoveryHandlerExtraArgs']
				recoveryHandlerSelected = getHandlerType('recovery', recoveryHandlerPath)
				recoveredTimes = defaultRecoveryHandlerMaybe['recoveredTimes']
			} else {
				recoveryHandlerPath = undefined
				recoveryHandlerItemKind = 'script'
				recoveryHandlerExtraArgs = {}
				recoveryHandlerSelected = 'slack'
				recoveredTimes = 1
			}
			if (defaultSuccessHandlerMaybe !== undefined && defaultSuccessHandlerMaybe !== null) {
				let splitted = (defaultSuccessHandlerMaybe['successHandlerPath'] as string).split('/')
				successHandlerItemKind = splitted[0] as 'flow' | 'script'
				successHandlerPath = splitted.slice(1)?.join('/')
				successHandlerExtraArgs = defaultSuccessHandlerMaybe['successHandlerExtraArgs']
				successHandlerSelected = getHandlerType('success', successHandlerPath)
				recoveredTimes = defaultSuccessHandlerMaybe['recoveredTimes']
			} else {
				successHandlerPath = undefined
				successHandlerItemKind = 'script'
				successHandlerExtraArgs = {}
				successHandlerSelected = 'slack'
			}
		}
	}

	export async function openNew(
		nis_flow: boolean,
		initial_script_path?: string,
		defaultValues?: Schedule,
		schedule_path?: string,
		fixedScriptPath_?: string,
		opts: { getDraft?: boolean } = {}
	) {
		const getDraft = opts.getDraft ?? true
		let loadingTimeout = setTimeout(() => {
			showLoading = true
		}, 100) // Do not show loading spinner for the first 100ms
		drawerLoading = true
		try {
			let s: Schedule | undefined
			if (schedule_path) {
				const resp = await ScheduleService.getSchedule({
					workspace: $workspaceStore!,
					path: schedule_path,
					getDraft
				})
				// `.draft` holds the saved Schedule; layer it over the deployed
				// fields so the form assignments below see the last-saved state.
				const { draft: draftFromBackend, ...deployedSchedule } = resp as any
				s = draftFromBackend
					? ({ ...deployedSchedule, ...draftFromBackend } as Schedule)
					: (deployedSchedule as Schedule)
				initNewPath = true
			} else if (defaultValues) {
				s = defaultValues
			}
			drawer?.openDrawer()
			runnable = undefined
			edit = false
			// No deployed baseline for a brand-new schedule. The editor instance
			// is reused across open() calls, so clear any baseline left by a prior
			// openEdit — otherwise the "unsaved changes" banner / dirty check would
			// compare against a stale config.
			initialConfig = undefined
			itemKind = (s?.is_flow ?? nis_flow) ? 'flow' : 'script'
			initialScriptPath = initial_script_path ?? ''
			fixedScriptPath = fixedScriptPath_ ?? ''
			path = initNewPath
				? ''
				: (defaultValues?.path ?? (trigger?.isPrimary ? initialScriptPath : ''))
			initialPath = path
			cronVersion = s?.cron_version ?? 'v2'
			initialCronVersion = cronVersion
			isLatestCron = cronVersion == 'v2'
			schedule = s?.schedule ?? '0 0 12 * *'
			initialSchedule = schedule
			timezone = s?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
			paused_until = s?.paused_until ?? undefined
			showPauseUntil = paused_until !== undefined
			summary = s?.summary ?? ''
			labels = s?.labels ?? undefined
			description = s?.description ?? ''
			script_path = s?.script_path ?? initialScriptPath
			args = s?.args ?? {}
			tag = s?.tag ?? undefined

			await loadScript(script_path)

			no_flow_overlap = s?.no_flow_overlap ?? false
			wsErrorHandlerMuted = s?.ws_error_handler_muted ?? false
			retry = s?.retry ?? undefined

			await setScheduleHandler(s)
			permissionedAs = undefined
			selectedPermissionedAs = undefined
			preservePermissionedAs = false
		} finally {
			clearTimeout(loadingTimeout)
			drawerLoading = false
			showLoading = false
		}
	}

	// set isValid to true when a script/flow without any properties is selected
	$effect(() => {
		setDefaultValid(draftSchema ?? runnable?.schema)
	})

	function setDefaultValid(schema: Record<string, any> | undefined) {
		if (!isValid) {
			let isEmpty = schema?.properties == undefined || Object.keys(schema.properties).length === 0
			if (isEmpty) {
				isValid = true
			}
		}
	}

	async function loadScript(p: string | undefined): Promise<void> {
		if (p) {
			runnable = undefined
			try {
				if (is_flow) {
					runnable = await FlowService.getFlowByPath({ workspace: $workspaceStore!, path: p })
				} else {
					runnable = await ScriptService.getScriptByPath({ workspace: $workspaceStore!, path: p })
				}
			} catch (err) {}
		} else {
			runnable = undefined
		}
	}

	async function saveAsDefaultErrorHandler(overrideExisting: boolean) {
		if (!$enterpriseLicense) {
			sendUserToast(`Setting default error handler is an enterprise edition feature`, true)
			return
		}
		if ($workspaceStore) {
			await ScheduleService.setDefaultErrorOrRecoveryHandler({
				workspace: $workspaceStore!,
				requestBody: {
					handler_type: 'error',
					override_existing: overrideExisting,
					path:
						errorHandlerPath == undefined
							? undefined
							: `${errorHandleritemKind}/${errorHandlerPath}`,
					extra_args: errorHandlerExtraArgs,
					number_of_occurence: failedTimes,
					number_of_occurence_exact: failedExact,
					workspace_handler_muted: wsErrorHandlerMuted
				}
			})
			if (errorHandlerPath !== undefined) {
				sendUserToast(`Default error handler saved to ${errorHandlerPath}`, false)
			} else {
				sendUserToast(`Default error handler reset`, false)
			}
		}
	}

	async function saveAsDefaultRecoveryHandler(overrideExisting: boolean) {
		if (!$enterpriseLicense) {
			sendUserToast(`Setting default recovery handler is an enterprise edition feature`, true)
			return
		}
		if ($workspaceStore) {
			await ScheduleService.setDefaultErrorOrRecoveryHandler({
				workspace: $workspaceStore!,
				requestBody: {
					handler_type: 'recovery',
					override_existing: overrideExisting,
					path:
						recoveryHandlerPath === undefined
							? undefined
							: `${recoveryHandlerItemKind}/${recoveryHandlerPath}`,
					extra_args: recoveryHandlerExtraArgs,
					number_of_occurence: recoveredTimes
				}
			})
			if (recoveryHandlerPath !== undefined) {
				sendUserToast(`Default recovery handler saved to ${recoveryHandlerPath}`, false)
			} else {
				sendUserToast(`Default recovery handler reset`, false)
			}
		}
	}

	async function saveAsDefaultSuccessHandler(overrideExisting: boolean) {
		if (!$enterpriseLicense) {
			sendUserToast(`Setting default success handler is an enterprise edition feature`, true)
			return
		}
		if ($workspaceStore) {
			await ScheduleService.setDefaultErrorOrRecoveryHandler({
				workspace: $workspaceStore!,
				requestBody: {
					handler_type: 'success',
					override_existing: overrideExisting,
					path:
						successHandlerPath === undefined
							? undefined
							: `${successHandlerItemKind}/${successHandlerPath}`,
					extra_args: successHandlerExtraArgs,
					number_of_occurence: recoveredTimes
				}
			})
			if (successHandlerPath !== undefined) {
				sendUserToast(`Default success handler saved to ${successHandlerPath}`, false)
			} else {
				sendUserToast(`Default success handler reset`, false)
			}
		}
	}

	/**
	 * Apply the deployed config to the form, then return the saved-draft overlay
	 * so the caller captures `initialConfig` from the deployed-only form BEFORE
	 * applying the draft, making the banner fire whenever a draft is present.
	 */
	async function loadSchedule(
		defaultCfg?: Record<string, any>
	): Promise<{ overlay: Record<string, any> | undefined; noDeployed: boolean }> {
		if (defaultCfg) {
			await loadScheduleCfg(defaultCfg)
			return { overlay: undefined, noDeployed: false }
		}
		try {
			const s = await ScheduleService.getSchedule({
				workspace: $workspaceStore!,
				path: initialPath,
				getDraft: true
			})
			const { draft: draftFromBackend, ...deployedSchedule } = s as any
			await loadScheduleCfg(deployedSchedule)
			return {
				overlay: draftFromBackend
					? ({ ...deployedSchedule, ...draftFromBackend } as Record<string, any>)
					: undefined,
				// Draft-only: synthesized stand-in, no row, so saving must CREATE.
				noDeployed: !!(s as any).no_deployed
			}
		} catch (err) {
			sendUserToast(`Could not load schedule: ${err}`, true)
			return { overlay: undefined, noDeployed: false }
		}
	}

	async function loadScheduleCfg(cfg: Record<string, any>): Promise<void> {
		loading = true

		cronVersion = cfg.cron_version ?? 'v2'
		initialCronVersion = cronVersion
		isLatestCron = cronVersion == 'v2'
		enabled = cfg.enabled
		schedule = cfg.schedule
		initialSchedule = schedule
		timezone = cfg.timezone
		paused_until = cfg.paused_until
		showPauseUntil = paused_until !== undefined
		summary = cfg.summary ?? ''
		labels = cfg.labels ?? undefined
		description = cfg.description ?? ''
		script_path = cfg.script_path ?? ''
		await loadScript(script_path)

		itemKind = cfg.is_flow ? 'flow' : 'script'
		no_flow_overlap = cfg.no_flow_overlap ?? false
		wsErrorHandlerMuted = cfg.ws_error_handler_muted ?? false
		retry = cfg.retry
		if (cfg.on_failure) {
			let splitted = cfg.on_failure.split('/')
			errorHandleritemKind = splitted[0] as 'flow' | 'script'
			errorHandlerPath = splitted.slice(1)?.join('/')
			failedTimes = cfg.on_failure_times ?? 1
			failedExact = cfg.on_failure_exact ?? false
			errorHandlerExtraArgs = cfg.on_failure_extra_args ?? {}
			errorHandlerSelected = getHandlerType('error', errorHandlerPath ?? '')
		} else {
			errorHandlerPath = undefined
			errorHandleritemKind = 'script'
			errorHandlerExtraArgs = {}
			failedExact = false
			failedTimes = 1
			errorHandlerSelected = 'slack'
		}
		if (cfg.on_recovery) {
			let splitted = cfg.on_recovery.split('/')
			recoveryHandlerItemKind = splitted[0] as 'flow' | 'script'
			recoveryHandlerPath = splitted.slice(1)?.join('/')
			recoveredTimes = cfg.on_recovery_times ?? 1
			recoveryHandlerExtraArgs = cfg.on_recovery_extra_args ?? {}
			recoveryHandlerSelected = getHandlerType('recovery', recoveryHandlerPath ?? '')
		} else {
			recoveryHandlerPath = undefined
			recoveryHandlerItemKind = 'script'
			recoveredTimes = 1
			recoveryHandlerSelected = 'slack'
			recoveryHandlerExtraArgs = {}
		}
		if (cfg.on_success) {
			let splitted = cfg.on_success.split('/')
			successHandlerItemKind = splitted[0] as 'flow' | 'script'
			successHandlerPath = splitted.slice(1)?.join('/')
			successHandlerExtraArgs = cfg.on_success_extra_args ?? {}
			successHandlerSelected = getHandlerType('success', successHandlerPath ?? '')
		} else {
			successHandlerPath = undefined
			successHandlerItemKind = 'script'
			successHandlerSelected = 'slack'
			successHandlerExtraArgs = {}
		}
		dynamicSkipPath = cfg.dynamic_skip
		args = cfg.args ?? {}
		extraPerms = cfg.extra_perms ?? {}
		can_write = canWrite(cfg.path, cfg.extra_perms, $userStore)
		tag = cfg.tag
		permissionedAs = cfg.permissioned_as
		selectedPermissionedAs = cfg.permissioned_as
		preservePermissionedAs = !!cfg.permissioned_as

		loading = false
	}

	async function scheduleScript(): Promise<void> {
		const previousPath = initialPath
		const scheduleCfg = getScheduleCfg()
		deploymentLoading = true
		const isSaved = await saveScheduleFromCfg(scheduleCfg, edit, $workspaceStore!)
		if (isSaved) {
			draftSync.discard(previousPath, scheduleCfg)
			onUpdate?.(scheduleCfg.path)
			drawer?.closeDrawer()
		}
		deploymentLoading = false
	}

	function getHandlerType(
		isHandler: 'error' | 'recovery' | 'success',
		scriptPath: string
	): ErrorHandler {
		const handlerMap = {
			error: {
				teams: '/workspace-or-schedule-error-handler-teams',
				slack: '/workspace-or-schedule-error-handler-slack'
			},
			recovery: {
				teams: '/schedule-recovery-handler-teams',
				slack: '/schedule-recovery-handler-slack'
			},
			success: {
				teams: '/schedule-success-handler-teams',
				slack: '/schedule-success-handler-slack'
			}
		}

		for (const [type, suffix] of Object.entries(handlerMap[isHandler])) {
			if (scriptPath.startsWith('hub/') && scriptPath.endsWith(suffix)) {
				return type as ErrorHandler
			}
		}
		return 'custom'
	}

	let drawer: Drawer | undefined = $state()

	let pathC: Path | undefined = $state()
	let dirtyPath = $state(false)

	let showPauseUntil = $state(false)
	$effect(() => {
		!showPauseUntil && (paused_until = undefined)
	})

	function onVersionChange() {
		cronVersion = isLatestCron ? 'v2' : 'v1'
		if (cronVersion === 'v2' && initialCronVersion === 'v1') {
			// switches day-of-week from v1 -> v2
			schedule = cronV1toV2(schedule)
		} else if (
			cronVersion === 'v1' &&
			initialCronVersion === 'v1' &&
			schedule !== initialSchedule
		) {
			// revert back to original
			schedule = initialSchedule
		}
	}

	function getScheduleCfg(): Record<string, any> {
		return {
			path: path,
			schedule: formatCron(schedule),
			timezone: timezone,
			script_path: script_path,
			is_flow: is_flow,
			args: args,
			enabled: enabled,
			on_failure: errorHandlerPath ? `${errorHandleritemKind}/${errorHandlerPath}` : undefined,
			on_failure_times: failedTimes,
			on_failure_exact: failedExact,
			on_failure_extra_args: errorHandlerPath ? errorHandlerExtraArgs : undefined,
			on_recovery: recoveryHandlerPath
				? `${recoveryHandlerItemKind}/${recoveryHandlerPath}`
				: undefined,
			on_recovery_times: recoveredTimes,
			on_recovery_extra_args: recoveryHandlerPath ? recoveryHandlerExtraArgs : {},
			on_success: successHandlerPath
				? `${successHandlerItemKind}/${successHandlerPath}`
				: undefined,
			on_success_extra_args: successHandlerPath ? successHandlerExtraArgs : {},
			ws_error_handler_muted: wsErrorHandlerMuted,
			retry: retry,
			summary: summary != '' ? summary : undefined,
			labels: labels,
			description: description,
			no_flow_overlap: no_flow_overlap,
			tag: tag,
			paused_until: paused_until,
			cron_version: cronVersion,
			extra_perms: extraPerms,
			dynamic_skip: dynamicSkipPath,
			permissioned_as: selectedPermissionedAs,
			preserve_permissioned_as: preservePermissionedAs || undefined
		}
	}

	async function handleToggleEnabled(nEnabled: boolean) {
		const previousEnabled = enabled
		enabled = nEnabled
		if (!trigger?.draftConfig) {
			const ok = await withForkConflictRetry(
				(force) =>
					ScheduleService.setScheduleEnabled({
						path: initialPath,
						workspace: $workspaceStore ?? '',
						requestBody: { enabled: nEnabled, force }
					}),
				'schedule'
			)
			if (!ok) {
				enabled = previousEnabled
				return
			}
			sendUserToast(`${nEnabled ? 'enabled' : 'disabled'} schedule ${initialPath}`)
			onUpdate?.(initialPath)
		}
	}

	$effect(() => {
		if (!drawerLoading) {
			handleConfigChange(scheduleCfg, initialConfig, saveDisabled, edit, onConfigChange)
		}
	})
</script>

<!-- {JSON.stringify({ allowSchedule, path: script_path, validCRON, isValid })} -->
{#snippet saveButton()}
	{#if !drawerLoading}
		<TriggerEditorToolbar
			{trigger}
			permissions={drawerLoading || !can_write ? 'none' : 'create'}
			{saveDisabled}
			mode={enabled ? 'enabled' : 'disabled'}
			{allowDraft}
			{edit}
			isLoading={deploymentLoading}
			onUpdate={scheduleScript}
			{onReset}
			{onDelete}
			onToggleMode={(mode) => handleToggleEnabled(mode === 'enabled')}
			{isDeployed}
			disableSuspendedMode
		>
			{#snippet extra()}
				{#if !drawerLoading && edit}
					<div class="mr-12 flex flex-row gap-3">
						<Button
							size="sm"
							variant="default"
							startIcon={{ icon: List }}
							disabled={!allowSchedule || pathError != '' || emptyString(script_path)}
							href={`${base}/runs/?schedule_path=${path}&job_trigger_kind=schedule&show_future_jobs=true`}
						>
							View runs
						</Button>
						<Button
							size="sm"
							variant="default"
							disabled={!allowSchedule || pathError != '' || emptyString(script_path)}
							on:click={() => {
								runScheduleNow(script_path, path, is_flow, $workspaceStore!)
							}}
						>
							Run now
						</Button>
					</div>
				{/if}
			{/snippet}
		</TriggerEditorToolbar>
	{/if}
{/snippet}

{#snippet content()}
	{#if drawerLoading}
		{#if showLoading}
			<Loader2 class="animate-spin" />
		{/if}
	{:else}
		<PermissionedAsLine
			{permissionedAs}
			{path}
			onPermissionedAsChange={(pa, preserve) => {
				selectedPermissionedAs = pa
				preservePermissionedAs = preserve
			}}
		/>
		<div class="flex flex-col gap-8">
			<Section label="元数据">
				<div class="flex flex-col gap-6">
					<label class="flex flex-col gap-1">
						<span class="text-xs font-semibold text-emphasis">摘要</span>
						<!-- svelte-ignore a11y_autofocus -->
						<TextInput
							inputProps={{
								autofocus: true,
								type: 'text',
								placeholder: '列表中显示的简短摘要',
								disabled: !can_write,
								onkeyup: () => {
									if (!edit && summary?.length > 0 && !dirtyPath) {
										pathC?.setName(
											summary
												.toLowerCase()
												.replace(/[^a-z0-9_]/g, '_')
												.replace(/-+/g, '_')
												.replace(/^-|-$/g, '')
										)
									}
								}
							}}
							bind:value={summary}
						/>
					</label>
					<LabelsInput bind:labels />

					<div class="flex flex-col gap-1">
							<label for="path" class="text-xs font-semibold text-emphasis">路径</label>
						{#if !edit && !trigger?.isPrimary}
							<Path
								bind:dirty={dirtyPath}
								bind:this={pathC}
								checkInitialPathExistence={!edit}
								bind:error={pathError}
								bind:path
								{initialPath}
								namePlaceholder="schedule"
								kind="schedule"
								disableEditing={!can_write}
							/>
						{:else}
							<div class="flex justify-start w-full">
								<Badge
									color="gray"
									class={twMerge(
										'center-center !bg-surface-secondary !text-secondary rounded-r-none border',
										ButtonType.UnifiedMinHeightClasses['md']
									)}
								>
									定时任务路径（不可编辑）
								</Badge>
								<input
									type="text"
									readonly
									value={path}
									size={path?.length || 50}
									class={twMerge(
										'font-mono !text-2xs grow shrink overflow-x-auto !py-0 !border-l-0 !rounded-l-none',
										ButtonType.UnifiedMinHeightClasses['md']
									)}
									onfocus={({ currentTarget }) => {
										currentTarget.select()
									}}
								/>
								<!-- <span class="font-mono text-sm break-all">{path}</span> -->
							</div>
						{/if}
					</div>

					<label class="flex flex-col gap-1">
						<span class="text-xs font-semibold text-emphasis">描述</span>
						<textarea
							rows="4"
							use:autosize
							bind:value={description}
							placeholder="说明这个定时任务的用途和使用方式"
							disabled={!can_write}
						></textarea>
					</label>
				</div>
			</Section>

			<Section label="定时任务">
				{#snippet header()}
					{#if cronVersion === 'v1'}
						<Tooltip>定时任务使用 CRON 语法，秒字段必填。</Tooltip>
					{:else}
						<Tooltip>定时任务使用扩展 CRON 语法。</Tooltip>
					{/if}
				{/snippet}
				<div class="flex flex-col gap-6">
					{#if initialCronVersion !== 'v2'}
						<div class="flex flex-row">
							<AlertTriangle color="orange" class="mr-2" size={16} />
								<Toggle
									options={{
										right: '启用新版 Cron 语法',
										rightTooltip:
											'新版 Cron 语法更灵活，适合配置更复杂的定时规则。'
									}}
								size="xs"
								bind:checked={isLatestCron}
								on:change={onVersionChange}
								disabled={!can_write}
							/>
						</div>
					{/if}
					<CronInput
						disabled={!can_write}
						bind:schedule
						bind:timezone
						bind:validCRON
						bind:cronVersion
					/>
					<div class="flex flex-col gap-1">
								<Toggle
									options={{
										right: '暂停定时任务直到...',
										rightTooltip:
											'暂停后，下一次任务会按恢复时间重新计算，而不是从当前时间开始计算。'
									}}
							bind:checked={showPauseUntil}
							disabled={!can_write}
						/>
						{#if showPauseUntil}
							<DateTimeInput bind:value={paused_until} />
						{/if}
					</div>
				</div>
			</Section>

			<Section label="执行对象">
				{#if !hideTarget}
					{#if fixedScriptPath != ''}
						<PipelineLockedRunnableInfo path={fixedScriptPath} />
					{:else if !edit}
						<p class="text-xs mb-1 text-secondary">
							Pick a script or flow to be triggered by the schedule<Required required={true} />
						</p>
						<ScriptPicker
							disabled={(initialScriptPath != '' && !initNewPath) || !can_write}
							initialPath={initialScriptPath}
							kinds={['script']}
							allowFlow={true}
							allowRefresh={can_write}
							bind:itemKind
							bind:scriptPath={script_path}
							on:select={(e) => {
								loadScript(e.detail.path)
							}}
							clearable
						/>
					{:else}
						<Alert type="info" title="Runnable path cannot be edited" collapsible>
							Once a schedule is created, the runnable path cannot be changed. However, when
							renaming a script or a flow, the runnable path will automatically update itself.
						</Alert>
						<div class="my-2"></div>
						<ScriptPicker
							disabled
							initialPath={script_path}
							scriptPath={script_path}
							allowFlow={true}
							{itemKind}
							allowView={script_path != '' && !!runnable}
							allowEdit={script_path != '' && !!runnable && !$userStore?.operator}
						/>
					{/if}
					{#if itemKind == 'flow'}
						<Toggle
							options={{ right: 'no overlap of flows' }}
							bind:checked={no_flow_overlap}
							class="mt-2"
						/>
					{/if}
					{#if itemKind == 'script'}
						<div class="flex gap-2 items-center mt-2">
							<Toggle options={{ right: 'no overlap' }} checked={true} disabled /><Tooltip
								>Currently, overlapping scripts' executions is not supported. The next execution
								will be scheduled only after the previous iteration has completed.</Tooltip
							>
						</div>
					{/if}
				{/if}
				<div class={!hideTarget ? 'mt-6' : ''}>
					{#if !loading}
						{#if runnable || draftSchema}
							{@const schema = draftSchema ?? runnable?.schema}
							{#if schema && schema.properties && Object.keys(schema.properties).length > 0}
								{#await import('$lib/components/SchemaForm.svelte')}
									<Loader2 class="animate-spin" />
								{:then Module}
									<Module.default
										showReset
										onlyMaskPassword
										disabled={!can_write}
										schema={$state.snapshot(schema)}
										bind:isValid
										bind:args
									/>
								{/await}
							{:else}
								<div class="text-xs text-secondary">
									This {is_flow ? 'flow' : 'script'} takes no argument
								</div>
							{/if}
						{:else if script_path != ''}
							<div class="text-xs text-secondary my-2">
								You cannot see the the {is_flow ? 'flow' : 'script'} input form as you do not have access
								to it.
							</div>
						{:else}
							<div class="text-xs text-secondary my-2">
								Pick a {is_flow ? 'flow' : 'script'} and fill its argument here
							</div>
						{/if}
					{:else}
						<Loader2 class="animate-spin" />
					{/if}
				</div>
			</Section>

			<Section label="Advanced" collapsable>
				{#snippet header()}
					<TriggerAdvancedBadges
						error_handler_path={errorHandlerPath}
						{retry}
						extraBadges={[
							{ name: 'Recovery Handler', active: !!recoveryHandlerPath },
							{ name: 'Success Handler', active: !!successHandlerPath },
							{ name: 'Dynamic Skip', active: !!dynamicSkipPath },
							{ name: 'Custom Tag', active: !!tag }
						]}
					/>
				{/snippet}
				{@render errorHandler()}
			</Section>
			<div class="pb-8"></div>
		</div>
	{/if}
{/snippet}

{#snippet errorHandler()}
	<div class="flex flex-col gap-2 min-h-96">
		{#if !loading}
			<Tabs bind:selected={optionTabSelected}>
					<Tab value="error_handler" label="错误处理" />
					<Tab value="recovery_handler" label="恢复处理" />
					<Tab value="success_handler" label="成功处理" />
					<Tab value="retries" label="重试" />
					<Tab value="dynamic_skip" label="动态跳过" />
					{#if itemKind === 'script'}
						<Tab value="tag" label="自定义标签" />
					{/if}
			</Tabs>
			{#if optionTabSelected === 'error_handler'}
				<Section label="错误处理">
					{#snippet header()}
						<div class="flex flex-row gap-2">
							{#if !$enterpriseLicense}<span class="text-xs text-secondary">(当前部署未开放)</span>{/if}
						</div>
					{/snippet}
					{#snippet action()}
						<div class="flex flex-row items-center gap-1 text-xs text-secondary">
							<Dropdown
								disabled={!can_write}
								items={[
									{
										displayName: `仅覆盖未来的定时任务`,
										action: () => saveAsDefaultErrorHandler(false)
									},
									{
										displayName: '覆盖所有已有定时任务',
										type: 'delete',
										action: () => saveAsDefaultErrorHandler(true)
									}
								]}
							>
								{#snippet buttonReplacement()}
									<Save size={12} class="mr-1" />
									设为默认
								{/snippet}
							</Dropdown>
						</div>
					{/snippet}
					<div class="flex flex-row py-2">
						<Toggle
							size="xs"
							disabled={!can_write || !$enterpriseLicense}
							bind:checked={wsErrorHandlerMuted}
							options={{ right: '本定时任务不触发工作区错误处理器' }}
						/>
					</div>

					<ErrorOrRecoveryHandler
						isEditable={can_write}
						errorOrRecovery="error"
						showScriptHelpText={true}
						bind:handlerSelected={errorHandlerSelected}
						bind:handlerPath={errorHandlerPath}
						toggleText="出错时通知频道"
						bind:customHandlerKind={errorHandleritemKind}
						bind:handlerExtraArgs={errorHandlerExtraArgs}
					>
						{#snippet customTabTooltip()}
							<Tooltip>
								<div class="flex gap-20 items-start mt-3">
									<div class="text-xs"
								>以下参数会传递给错误处理器：
										<ul class="mt-1 ml-2">
											<li
										><b>workspace_id</b>: 定时任务所属工作区 ID。</li
									>
									<li><b>job_id</b>: 出错任务的 UUID。</li>
									<li><b>path</b>: 失败脚本或流程的路径。</li>
									<li><b>is_flow</b>: 执行对象是否为流程。</li>
									<li><b>schedule_path</b>: 定时任务路径。</li>
									<li><b>error</b>: 错误详情。</li>
									<li
										><b>failed_times</b>: 调用错误处理器前，定时任务连续失败的最小次数。</li
									>
									<li><b>started_at</b>: 最近一次失败任务的开始时间。</li>
										</ul>
									</div>
								</div>
							</Tooltip>
						{/snippet}
					</ErrorOrRecoveryHandler>
					<div class="flex flex-row items-center justify-between">
						<div class="flex flex-row items-center mt-4 font-semibold text-xs gap-2">
							<p class={emptyString(errorHandlerPath) ? 'text-primary' : ''}>
								定时任务失败时触发</p
							>
							<select
								class="!w-14"
								bind:value={failedExact}
								disabled={!$enterpriseLicense || emptyString(errorHandlerPath)}
							>
								<option value={false}>&gt;=</option>
								<option value={true}>==</option>
							</select>
							<input
								type="number"
								class="!w-14 text-center {emptyString(errorHandlerPath) ? 'text-primary' : ''}"
								bind:value={failedTimes}
								disabled={!$enterpriseLicense}
								min="1"
							/>
								<p class={emptyString(errorHandlerPath) ? 'text-primary' : ''}>次</p>
						</div>
					</div>
				</Section>
			{:else if optionTabSelected === 'recovery_handler'}
				{@const disabled = !can_write || emptyString($enterpriseLicense)}
				<Section label="恢复处理">
					{#snippet header()}
						<div class="flex flex-row gap-2">
							{#if !$enterpriseLicense}<span class="text-xs text-secondary">(当前部署未开放)</span>{/if}
						</div>
					{/snippet}
					{#snippet action()}
						<div class="flex flex-row items-center text-secondary text-xs gap-2">
							默认值
							<Dropdown
								{disabled}
								items={[
									{
										displayName: `仅覆盖未来的定时任务`,
										action: () => saveAsDefaultRecoveryHandler(false)
									},
									{
										displayName: '覆盖所有已有定时任务',
										type: 'delete',
										action: () => saveAsDefaultRecoveryHandler(true)
									}
								]}
							>
								{#snippet buttonReplacement()}
									<Save size={12} class="mr-1" />
									设为默认
								{/snippet}
							</Dropdown>
						</div>
					{/snippet}
					<ErrorOrRecoveryHandler
						isEditable={!disabled}
						errorOrRecovery="recovery"
						bind:handlerSelected={recoveryHandlerSelected}
						bind:handlerPath={recoveryHandlerPath}
						toggleText="错误恢复时通知频道"
						bind:customHandlerKind={recoveryHandlerItemKind}
						bind:handlerExtraArgs={recoveryHandlerExtraArgs}
					>
						{#snippet customTabTooltip()}
							<Tooltip>
								<div class="flex gap-20 items-start mt-3">
									<div class="text-xs"
								>以下参数会传递给恢复处理器：
								<ul class="mt-1 ml-2">
									<li><b>path</b>: 已恢复脚本或流程的路径。</li>
									<li><b>is_flow</b>: 执行对象是否为流程。</li>
									<li><b>schedule_path</b>: 定时任务路径。</li>
									<li><b>error</b>: 上一次失败任务的错误信息。</li>
									<li
										><b>error_started_at</b>: 上一次失败任务的开始时间。</li
									>
									<li
										><b>success_times</b>: 调用恢复处理器前，定时任务连续成功的次数。</li
									>
									<li><b>success_result</b>: 最近一次成功任务的结果。</li>
									<li
										><b>success_started_at</b>: 最近一次成功任务的开始时间。</li
									>
										</ul>
									</div>
								</div>
							</Tooltip>
						{/snippet}
					</ErrorOrRecoveryHandler>
					<div class="flex flex-row items-center justify-between">
						<div
							class="flex flex-row items-center mt-5 font-semibold text-xs {emptyString(
								recoveryHandlerPath
							)
								? 'text-primary'
								: ''}"
						>
							<p>定时任务恢复时触发</p>
							<input
								type="number"
								class="!w-14 mx-2 text-center"
								bind:value={recoveredTimes}
								min="1"
								{disabled}
							/>
							<p>次</p>
						</div>
					</div>
				</Section>
			{:else if optionTabSelected === 'success_handler'}
				{@const disabled = !can_write || emptyString($enterpriseLicense)}
				<Section label="成功处理">
					{#snippet header()}
						<div class="flex flex-row gap-2">
							{#if !$enterpriseLicense}<span class="text-xs text-secondary">(当前部署未开放)</span>{/if}
						</div>
					{/snippet}
					{#snippet action()}
						<div class="flex flex-row items-center text-secondary text-xs gap-2">
							默认值
							<Dropdown
								{disabled}
								items={[
									{
										displayName: `仅覆盖未来的定时任务`,
										action: () => saveAsDefaultSuccessHandler(false)
									},
									{
										displayName: '覆盖所有已有定时任务',
										type: 'delete',
										action: () => saveAsDefaultSuccessHandler(true)
									}
								]}
							>
								{#snippet buttonReplacement()}
									<Save size={12} class="mr-1" />
									设为默认
								{/snippet}
							</Dropdown>
						</div>
					{/snippet}
					<ErrorOrRecoveryHandler
						isEditable={!disabled}
						errorOrRecovery="success"
						bind:handlerSelected={successHandlerSelected}
						bind:handlerPath={successHandlerPath}
						toggleText="成功时通知频道"
						bind:customHandlerKind={successHandlerItemKind}
						bind:handlerExtraArgs={successHandlerExtraArgs}
					>
						{#snippet customTabTooltip()}
							<Tooltip>
								<div class="flex gap-20 items-start mt-3">
									<div class="text-xs"
								>以下参数会传递给成功处理器：
								<ul class="mt-1 ml-2">
									<li><b>path</b>: 成功执行的脚本或流程路径。</li>
									<li><b>is_flow</b>: 执行对象是否为流程。</li>
									<li><b>schedule_path</b>: 定时任务路径。</li>
									<li><b>success_result</b>: 成功任务的结果。</li>
									<li><b>success_started_at</b>: 成功任务的开始时间。</li>
								</ul>
									</div>
								</div>
							</Tooltip>
						{/snippet}
					</ErrorOrRecoveryHandler>
				</Section>
			{:else if optionTabSelected === 'retries'}
				{@const disabled = !can_write || emptyString($enterpriseLicense)}
			<Section label="重试">
				{#snippet header()}
					<div class="flex flex-row gap-2">
						{#if !$enterpriseLicense}<span class="text-xs text-secondary">(当前部署未开放)</span>{/if}
					</div>
					<Tooltip>
						配置后，定时任务出错时会按下方设置延迟重试，并限制最大重试次数。
						<br />
						该设置仅适用于单个脚本。流程的重试规则可以在流程编辑器的每个步骤中单独配置。
					</Tooltip>
				{/snippet}
				{#if itemKind !== 'script'}
					<Alert type="info" title="仅适用于脚本" class="mb-2">
						错误处理和重试配置仅适用于脚本。流程请在流程编辑器中配置内置错误处理和步骤重试。
					</Alert>
					{:else}
						<FlowRetries
							bind:flowModuleRetry={retry}
							disabled={itemKind !== 'script' || disabled}
						/>
					{/if}
				</Section>
			{:else if optionTabSelected === 'dynamic_skip'}
			<Section label="动态跳过">
				{#snippet header()}
					<Tooltip>
						可选脚本，用于过滤计划执行时间。脚本接收候选时间并返回布尔值：true 表示执行，false 表示跳过本次。
					</Tooltip>
				{/snippet}
				<div class="flex flex-col gap-6">
					<Label label="动态跳过脚本">
						<div class="flex flex-row">
								<ScriptPicker
									disabled={!can_write}
									bind:scriptPath={dynamicSkipPath}
									kinds={['script']}
									allowRefresh={can_write}
									clearable
								/>
						</div>
					</Label>
					<Alert type="info" size="xs" title="脚本要求">
						脚本必须返回布尔值。返回 true 表示执行定时任务，返回 false 表示跳过。
					</Alert>
				</div>
				</Section>
			{:else if optionTabSelected === 'tag'}
				<Section
					label="Custom script tag"
					tooltip="When set, the script tag will be overridden by this tag"
				>
					<WorkerTagPicker bind:tag popupPlacement="top-end" disabled={!can_write} />
				</Section>
			{/if}
		{:else}
			<Loader2 class="animate-spin" />
		{/if}
	</div>
{/snippet}

{#if useDrawer}
	<Drawer size="900px" bind:this={drawer}>
		<DrawerContent
			title={edit
				? can_write
					? `Edit schedule ${initialPath}`
					: `View schedule ${initialPath}`
				: 'New schedule'}
			on:close={drawer.closeDrawer}
		>
			{#snippet actions()}
				<div class="flex flex-row gap-4 items-center">
					{@render saveButton()}
				</div>
			{/snippet}
			{#snippet banner()}
				<LocalDraftBanner
					show={draftSync.hasDraft}
					getDeployed={() => draftSync.deployed}
					getCurrent={() => draftSync.current}
					onDiscard={() => draftSync.resetToDeployed(initialPath)}
					disabled={!can_write}
				/>
			{/snippet}
			{@render content()}
		</DrawerContent>
	</Drawer>
{:else}
	<Section label={!customLabel ? '定时任务' : ''} headerClass="grow min-w-0 h-[30px]">
		{#snippet header()}
			{#if customLabel}
				{@render customLabel()}
			{/if}
		{/snippet}
		{#snippet action()}
			<div class="flex flex-row gap-2 items-center">
				{@render saveButton()}
			</div>
		{/snippet}
		{#if docDescription}
			{@render docDescription()}
		{/if}
		{@render content()}
	</Section>
{/if}
