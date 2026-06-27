<script lang="ts">
	import { scimSamlSetting, settings, settingsKeys } from './instanceSettings'
	import { Alert, Button, Tab, TabContent, Tabs } from '$lib/components/common'
	import { SettingService, SettingsService } from '$lib/gen'
	import type { TeamsChannel } from '$lib/gen/types.gen'

	import { sendUserToast } from '$lib/toast'
	import { deepEqual } from 'fast-equals'

	import { sleep } from '$lib/utils'
	import { enterpriseLicense } from '$lib/stores'

	import { createEventDispatcher } from 'svelte'
	import { setLicense } from '$lib/enterpriseUtils'
	import AuthSettings from './AuthSettings.svelte'
	import oauthConnectRegistry from '$oauth_connect_registry'
	import InstanceSetting from './InstanceSetting.svelte'
	import { writable, type Writable } from 'svelte/store'
	import { Loader2 } from 'lucide-svelte'
	import YAML from 'yaml'
	import Toggle from './Toggle.svelte'
	import SettingsFooter from './workspaceSettings/SettingsFooter.svelte'
	import SettingsPageHeader from './settings/SettingsPageHeader.svelte'
	import WorkspaceRegistries from './instanceSettings/WorkspaceRegistries.svelte'
	import DbHealth from './instanceSettings/DbHealth.svelte'

	interface Props {
		tab?: string
		hideTabs?: boolean
		closeDrawer?: (() => void) | undefined
		authSubTab?: 'sso' | 'oauth' | 'scim'
		onNavigateToTab?: (category: string) => void
		quickSetup?: boolean
		yamlMode?: boolean
		hasUnsavedChanges?: boolean
		hasAnyInvalid?: boolean
	}

	let {
		tab = $bindable('Core'),
		hideTabs = false,
		closeDrawer = () => {},
		authSubTab = $bindable('sso'),
		onNavigateToTab,
		quickSetup = false,
		yamlMode = $bindable(false),
		hasUnsavedChanges = $bindable(false),
		hasAnyInvalid = $bindable(false)
	}: Props = $props()

	let values: Writable<Record<string, any>> = writable({})
	let initialOauths: Record<string, any> = $state({})
	let initialRequirePreexistingUserForOauth: boolean = $state(false)
	let requirePreexistingUserForOauth: boolean = $state(false)

	let initialValues: Record<string, any> = $state({})
	let baseUrlIsFallback = $state(false)
	// Per-instance OAuth providers (Snowflake, ServiceNow, …): instance name
	// keyed by provider, used to build their per-instance connect_config URLs.
	let instanceInputs: Record<string, string> = $state({})
	let version: string = $state('')
	let loading = $state(true)

	const categoryLabels: Record<string, string> = {
		Core: '核心配置',
		SMTP: '邮件服务',
		Registries: '私有依赖源',
		Alerts: '告警',
		Webhooks: '回调',
		'OTEL/Prom': '监控指标',
		Indexer: '全文索引',
		Telemetry: '遥测',
		Jobs: '任务',
		'Object Storage': '对象存储',
		'Private Hub': '内部模板库',
		'Secret Storage': '密钥存储',
		'GitHub Enterprise App': 'GitHub App',
		'DB Health': '数据库健康',
		'Auth/OAuth/SAML': '登录认证',
		'内部模板库': '内部模板库'
	}

	function categoryLabel(category: string): string {
		return categoryLabels[category] ?? category
	}

	export function getVersion(): string {
		return version
	}

	export function getLicenseKey(): string {
		return $values?.['license_key'] ?? ''
	}

	loadSettings()
	loadVersion()

	// When the user enables object storage for the first time, default
	// `monitor_logs_on_s3` to true so S3 log files get cleaned up with their
	// jobs. Backend still defaults to false for backwards compat with
	// operators who never touched the setting.
	$effect(() => {
		if ($values['object_store_cache_config'] && $values['monitor_logs_on_s3'] === undefined) {
			values.update((v) => ({ ...v, monitor_logs_on_s3: true }))
		}
	})

	const dispatch = createEventDispatcher()

	async function loadVersion() {
		version = await SettingsService.backendVersion()
	}
	let oauths: Record<string, any> = $state({})

	/** Ensure object/array-typed settings have a non-null default for the form UI */
	const formDefaults: Record<string, any> = {
		smtp_settings: {},
		otel: {},
		indexer_settings: {},
		critical_error_channels: [],
		github_enterprise_app: {}
	}

	function applyFormDefaults(vals: Record<string, any>): void {
		for (const [key, defaultVal] of Object.entries(formDefaults)) {
			if (vals[key] == undefined) {
				vals[key] =
					typeof defaultVal === 'object' ? JSON.parse(JSON.stringify(defaultVal)) : defaultVal
			}
		}
	}

	async function loadSettings() {
		loading = true

		// Bulk-load all settings in a single API call
		const config = await SettingService.getInstanceConfig()
		const gs = (config.global_settings ?? {}) as Record<string, any>

		initialOauths = gs['oauths'] ?? {}
		requirePreexistingUserForOauth = gs['require_preexisting_user_for_oauth'] ?? false
		initialRequirePreexistingUserForOauth = requirePreexistingUserForOauth
		oauths = JSON.parse(JSON.stringify(initialOauths))

		let nvalues: Record<string, any> = { ...gs }

		baseUrlIsFallback = !nvalues['base_url']
		if (nvalues['retention_period_secs'] == undefined) {
			nvalues['retention_period_secs'] = 60 * 60 * 24 * 30
		}
		applyFormDefaults(nvalues)

		// Apply select/select_python defaults so initialValues matches what InstanceSetting's $effect does
		for (const category of settingsKeys) {
			for (const s of settings[category]) {
				if (
					(s.fieldType === 'select' || s.fieldType === 'select_python') &&
					nvalues[s.key] == undefined &&
					s.defaultValue
				) {
					nvalues[s.key] = s.defaultValue()
				}
			}
		}

		// Snapshot initialValues before applying the base_url fallback so that
		// the dirty-check detects the unsaved default and enables the Save button.
		initialValues = JSON.parse(JSON.stringify(nvalues))

		if (baseUrlIsFallback) {
			nvalues['base_url'] = window.location.origin
		}
		$values = nvalues
		loading = false

		// populate per-instance OAuth provider inputs (snowflake, servicenow, …) from db
		loadInstanceInputs(oauths)
	}

	export async function saveSettings() {
		if (yamlMode) {
			if (!syncYamlToForm()) {
				return
			}
		}

		setupTemplatedOauthUrls()

		// Remove empty or invalid entries for critical error channels
		$values.critical_error_channels = $values.critical_error_channels.filter((entry: any) => {
			if (!entry || typeof entry !== 'object') return false
			if ('teams_channel' in entry) {
				return isValidTeamsChannel(entry.teams_channel)
			}
			if ('slack_channel' in entry) {
				return typeof entry.slack_channel === 'string' && entry.slack_channel.trim() !== ''
			}
			if ('email' in entry) {
				return typeof entry.email === 'string' && entry.email.trim() !== ''
			}
			// Unknown shape
			return false
		})

		let shouldReloadPage = false
		let willRestart = false
		if ($values) {
			// Trim license key before saving
			if ($values['license_key'] && typeof $values['license_key'] === 'string') {
				$values['license_key'] = $values['license_key'].trim()
			}

			// Check which settings require a page reload or server restart
			const allSettings = [...Object.values(settings), scimSamlSetting].flat()
			let licenseKeySet = false
			for (const s of allSettings) {
				if (s.storage === 'setting' && !deepEqual(initialValues?.[s.key], $values?.[s.key])) {
					if (s.key === 'license_key') {
						licenseKeySet = true
					}
					if (s.requiresReloadOnChange) {
						shouldReloadPage = true
					}
					if (s.triggersRestart) {
						willRestart = true
					}
				}
			}

			// Build the full global_settings object for the bulk PUT
			const globalSettings: Record<string, any> = { ...$values }

			// Send explicit null for keys that were set on load but are now
			// missing/cleared, so the Merge-mode bulk endpoint deletes them
			// instead of silently preserving the old DB value. Covers both:
			//   - YAML mode: user removed a line / set it to null / set it to {}.
			//   - Form mode: user toggled a setting off (e.g.
			//     object_store_cache_config), making the value undefined.
			const isClearedValue = (v: any) => {
				if (v === undefined || v === null) return true
				if (typeof v === 'object') {
					return Array.isArray(v) ? v.length === 0 : Object.keys(v).length === 0
				}
				return false
			}
			for (const key of Object.keys(initialValues ?? {})) {
				if (excludedKeys.has(key)) continue
				if (key === 'oauths' || key === 'require_preexisting_user_for_oauth') continue
				if (!isClearedValue(globalSettings[key])) continue
				// Only flag for deletion if it was non-empty before — otherwise
				// every save would delete-then-recreate harmless `{}`/`[]` defaults.
				if (isClearedValue(initialValues[key])) continue
				globalSettings[key] = null
			}

			// Include oauths and require_preexisting_user_for_oauth
			if (!deepEqual(initialOauths, oauths)) {
				globalSettings['oauths'] = oauths
			}
			if (initialRequirePreexistingUserForOauth !== requirePreexistingUserForOauth) {
				globalSettings['require_preexisting_user_for_oauth'] = requirePreexistingUserForOauth
			}

			await SettingService.setInstanceConfig({
				requestBody: { global_settings: globalSettings }
			})

			initialValues = JSON.parse(JSON.stringify($values))
			initialOauths = JSON.parse(JSON.stringify(oauths))
			initialRequirePreexistingUserForOauth = requirePreexistingUserForOauth
			baseUrlIsFallback = false

			if (yamlMode) {
				yamlCodeInitial = yamlCode
			}

			if (licenseKeySet) {
				setLicense()
			}
		} else {
			console.error('Values not loaded')
		}
		if (shouldReloadPage) {
			sendUserToast('设置已更新，正在重新加载页面...')
			await sleep(1000)
			window.location.reload()
		} else if (willRestart) {
			sendUserToast(
				'设置已更新。服务正在重启，变更完全生效可能需要约一分钟。',
				false,
				[],
				undefined,
				8000
			)
			dispatch('saved')
		} else {
			sendUserToast('设置已更新')
			dispatch('saved')
		}
	}

	// Per-instance OAuth providers (Snowflake, ServiceNow, …) keyed by name ->
	// their registry connect_config_template. Adding a new one needs only a
	// registry entry — no code here.
	// Every per-instance templated provider is configurable here: authorization-code
	// ones (ServiceNow, Snowflake) provide an `auth_url`, client-credentials-only
	// ones (Coupa) provide only a `token_url`. Both need the admin to enter their
	// instance host so the shared credentials point at the right endpoint.
	const connectConfigTemplates: Record<string, any> = Object.fromEntries(
		Object.entries(oauthConnectRegistry)
			.filter(([, cfg]) => cfg && typeof cfg === 'object' && 'connect_config_template' in cfg)
			.map(([name, cfg]) => [name, (cfg as any).connect_config_template])
	)

	function normalizeInstanceInput(tmpl: any, raw: string): string {
		let v = (raw ?? '').replace(/\s/g, '')
		if (tmpl.strip_suffix) {
			// accept a full host/URL or a bare name -> reduce to the bare instance
			v = v.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
			if (v.endsWith(tmpl.strip_suffix)) {
				v = v.slice(0, -tmpl.strip_suffix.length)
			}
		}
		return v
	}

	// Build each per-instance provider's connect_config from the admin-entered
	// instance name + its registry template (substituting {instance} into the
	// URLs). Replaces the old per-provider setup functions.
	function setupTemplatedOauthUrls() {
		for (const [name, tmpl] of Object.entries(connectConfigTemplates)) {
			if (!oauths?.[name]) continue
			const key = tmpl.extra_params_key ?? 'instance'
			const v = normalizeInstanceInput(tmpl, instanceInputs[name] ?? '')
			instanceInputs[name] = v
			if (oauths[name].connect_config?.extra_params?.[key] === v) continue
			oauths[name].connect_config = {
				scopes: tmpl.scopes ?? [],
				// CC-only templated providers have no auth_url; store an empty string
				// (not omitted) so the instance-config parser still types the entry.
				// The backend treats an empty auth_url as the unused placeholder for
				// the client-credentials grant.
				auth_url: tmpl.auth_url ? tmpl.auth_url.replaceAll('{instance}', v) : '',
				token_url: tmpl.token_url.replaceAll('{instance}', v),
				req_body_auth: tmpl.req_body_auth ?? false,
				extra_params: { [key]: v },
				extra_params_callback: {}
			}
		}
	}

	// Recover the instance-name inputs from a saved oauths config (for load/discard).
	function loadInstanceInputs(savedOauths: Record<string, any>) {
		for (const [name, tmpl] of Object.entries(connectConfigTemplates)) {
			const key = tmpl.extra_params_key ?? 'instance'
			instanceInputs[name] = savedOauths?.[name]?.connect_config?.extra_params?.[key] ?? ''
		}
	}

	let sendingStats = $state(false)
	async function sendStats() {
		try {
			sendingStats = true
			await SettingService.sendStats()
		sendUserToast('使用情况已发送')
		} catch (err) {
			throw err
		} finally {
			sendingStats = false
		}
	}

	let downloadingStats = $state(false)
	async function downloadStats() {
		try {
			downloadingStats = true
			const result = await SettingService.getStats()
			const blob = new Blob([result.data ?? ''], { type: 'application/json' })
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			const date = new Date().toISOString().split('T')[0]
			a.download = `windmill-telemetry-${date}-${result.signature}.json`
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
			URL.revokeObjectURL(url)
			sendUserToast('遥测数据已下载')
		} catch (err) {
			throw err
		} finally {
			downloadingStats = false
		}
	}

	function isValidTeamsChannel(value: any): value is TeamsChannel {
		return (
			typeof value === 'object' &&
			value !== null &&
			typeof value.team_id === 'string' &&
			value.team_id.trim() !== '' &&
			typeof value.team_name === 'string' &&
			value.team_name.trim() !== '' &&
			typeof value.channel_id === 'string' &&
			value.channel_id.trim() !== '' &&
			typeof value.channel_name === 'string' &&
			value.channel_name.trim() !== ''
		)
	}

	function openSmtpSettings() {
		if (onNavigateToTab) {
			onNavigateToTab('SMTP')
		} else {
			tab = 'SMTP'
		}
	}

	// --- Dirty state tracking (YAML-based) ---

	function stripEmpty(obj: Record<string, any>): Record<string, any> {
		return Object.fromEntries(
			Object.entries(obj)
				.filter(([_, v]) => v !== undefined && v !== '')
				.map(([k, v]) =>
					v != null && typeof v === 'object' && !Array.isArray(v) ? [k, stripEmpty(v)] : [k, v]
				)
		)
	}

	function getSettingsForCategory(category: string) {
		if (category === 'Auth/OAuth/SAML') {
			return [...(settings[category] ?? []), ...scimSamlSetting]
		}
		const base = settings[category] ?? []
		// In quick setup, reorder Core: base settings (without license_key), then extras from Jobs
		if (quickSetup && category === 'Core') {
			const licenseKey = base.find((s) => s.key === 'license_key')
			const baseWithout = base.filter((s) => s.key !== 'license_key')
			const jobSettings = settings['Jobs'] ?? []
			const jobIsolation = jobSettings.find((s) => s.key === 'job_isolation')
			const retentionPeriod = jobSettings.find((s) => s.key === 'retention_period_secs')
			const objectStorage = settings['Object Storage']?.find(
				(s) => s.key === 'object_store_cache_config'
			)
			return [
				...baseWithout,
				...(jobIsolation ? [jobIsolation] : []),
				...(licenseKey ? [licenseKey] : []),
				...(retentionPeriod ? [retentionPeriod] : []),
				...(objectStorage ? [objectStorage] : [])
			]
		}
		return base
	}

	function normalizeValue(value: any, key?: string): any {
		if (value == null) return undefined
		if (value === false) return undefined
		if (typeof value === 'string' && value.trim() === '') return undefined
		if (Array.isArray(value) && value.length === 0) return undefined
		if (typeof value === 'object' && !Array.isArray(value)) {
			// Recursively normalize: if all values in the object normalize to undefined,
			// the object itself is effectively empty (e.g. {smtp_tls_implicit: false} ≡ {})
			const hasNonEmpty = Object.values(value).some((v) => normalizeValue(v) !== undefined)
			if (!hasNonEmpty) return undefined
		}

		// Key-specific defaults: these values are equivalent to "not set"
		if (key === 'secret_backend') {
			if (
				typeof value === 'object' &&
				value?.type === 'Database' &&
				Object.keys(value).length === 1
			) {
				return undefined
			}
		}
		if (key === 'automate_username_creation' && value === true) {
			return undefined
		}
		if (key === 'critical_alerts_on_db_oversize' && typeof value === 'object') {
			if (!value.enabled && (!value.value || value.value === 0)) {
				return undefined
			}
		}

		return value
	}
	function buildCategoryYaml(
		category: string,
		vals: Record<string, any>,
		oauthsObj: Record<string, any>,
		reqPreexisting: boolean
	): string {
		const categorySettings = getSettingsForCategory(category)
		const obj: Record<string, any> = {}
		for (const s of categorySettings) {
			const normalized = normalizeValue(vals[s.key], s.key)
			if (normalized !== undefined) {
				obj[s.key] = vals[s.key]
			}
		}
		if (category === 'Auth/OAuth/SAML') {
			if (Object.keys(stripEmpty(oauthsObj)).length > 0) {
				obj['oauths'] = oauthsObj
			}
			if (reqPreexisting) {
				obj['require_preexisting_user_for_oauth'] = reqPreexisting
			}
		}
		if (category === 'Registries') {
			obj['workspace_registries'] = vals['workspace_registries'] ?? null
		}
		return YAML.stringify(obj)
	}

	let dirtyCategories: Record<string, boolean> = $derived.by(() => {
		const result: Record<string, boolean> = {}
		for (const category of settingsKeys) {
			const initialYaml = buildCategoryYaml(
				category,
				initialValues,
				initialOauths,
				initialRequirePreexistingUserForOauth
			)
			const currentYaml = buildCategoryYaml(
				category,
				$values,
				oauths,
				requirePreexistingUserForOauth
			)
			result[category] = initialYaml !== currentYaml
		}
		return result
	})

	let invalidCategories: Record<string, boolean> = $derived.by(() => {
		const currentValues = $values
		const result: Record<string, boolean> = {}
		for (const category of settingsKeys) {
			const categorySettings = getSettingsForCategory(category)
			result[category] = categorySettings.some((s) => {
				if (s.isValid && !s.isValid(currentValues?.[s.key])) return true
				if (s.validate) {
					const errors = s.validate(currentValues?.[s.key])
					return Object.keys(errors).length > 0
				}
				return false
			})
		}
		return result
	})

	$effect(() => {
		hasAnyInvalid = Object.values(invalidCategories).some(Boolean)
	})

	export function isDirty(category: string): boolean {
		return dirtyCategories[category] ?? false
	}

	export function discardCategory(category: string) {
		const categorySettings = getSettingsForCategory(category)
		for (const s of categorySettings) {
			const v = initialValues[s.key]
			$values[s.key] = v !== undefined ? JSON.parse(JSON.stringify(v)) : undefined
		}
		if (category === 'Auth/OAuth/SAML') {
			oauths = JSON.parse(JSON.stringify(initialOauths))
			requirePreexistingUserForOauth = initialRequirePreexistingUserForOauth
			loadInstanceInputs(initialOauths)
		} else if (category === 'Registries') {
			const v = initialValues['workspace_registries']
			$values['workspace_registries'] = v !== undefined ? JSON.parse(JSON.stringify(v)) : undefined
		}
	}

	export function discardAll() {
		// Reset all values to initial state (deep copy to avoid reference sharing)
		$values = JSON.parse(JSON.stringify(initialValues))
		oauths = JSON.parse(JSON.stringify(initialOauths))
		requirePreexistingUserForOauth = initialRequirePreexistingUserForOauth
		loadInstanceInputs(initialOauths)
		if (yamlMode) {
			syncFormToYaml()
		}
	}

	export async function saveCategorySettings(category: string) {
		// Category-specific pre-processing
		if (category === 'Auth/OAuth/SAML') {
			setupTemplatedOauthUrls()
		}

		if (category === 'Alerts' && $values?.critical_error_channels) {
			$values.critical_error_channels = $values.critical_error_channels.filter((entry: any) => {
				if (!entry || typeof entry !== 'object') return false
				if ('teams_channel' in entry) return isValidTeamsChannel(entry.teams_channel)
				if ('slack_channel' in entry)
					return typeof entry.slack_channel === 'string' && entry.slack_channel.trim() !== ''
				if ('email' in entry) return typeof entry.email === 'string' && entry.email.trim() !== ''
				return false
			})
		}

		if (
			category === 'Core' &&
			$values?.['license_key'] &&
			typeof $values['license_key'] === 'string'
		) {
			$values['license_key'] = $values['license_key'].trim()
		}

		let shouldReloadPage = false
		let willRestart = false
		const categorySettings = getSettingsForCategory(category)

		let licenseKeySet = false
		await Promise.all(
			categorySettings
				.filter((x) => {
					return (
						x.storage === 'setting' &&
						!deepEqual(initialValues?.[x.key], $values?.[x.key]) &&
						($values?.[x.key] !== '' ||
							initialValues?.[x.key] !== undefined ||
							initialValues?.[x.key] !== null)
					)
				})
				.map(async (x) => {
					if (x.key === 'license_key') licenseKeySet = true
					if (x.requiresReloadOnChange) shouldReloadPage = true
					if (x.triggersRestart) willRestart = true
					let value = $values?.[x.key]
					if (x.fieldType === 'codearea' && typeof value === 'string' && value.trim() === '') {
						value = undefined
					}
					return await SettingService.setGlobal({
						key: x.key,
						requestBody: { value }
					})
				})
		)

		// Update only the saved category's initial values
		for (const s of categorySettings) {
			const v = $values[s.key]
			initialValues[s.key] = v !== undefined ? JSON.parse(JSON.stringify(v)) : undefined
		}
		if (categorySettings.some((s) => s.key === 'base_url')) {
			baseUrlIsFallback = false
		}

		// Handle Auth/OAuth/SAML-specific saves
		if (category === 'Auth/OAuth/SAML') {
			if (!deepEqual(stripEmpty(initialOauths), stripEmpty(oauths))) {
				await SettingService.setGlobal({
					key: 'oauths',
					requestBody: { value: oauths }
				})
				initialOauths = JSON.parse(JSON.stringify(oauths))
			}
			if (initialRequirePreexistingUserForOauth !== requirePreexistingUserForOauth) {
				await SettingService.setGlobal({
					key: 'require_preexisting_user_for_oauth',
					requestBody: { value: requirePreexistingUserForOauth }
				})
				initialRequirePreexistingUserForOauth = requirePreexistingUserForOauth
			}
		}

		// Handle workspace_registries (saved separately like oauths)
		if (category === 'Registries') {
			if (!deepEqual(initialValues['workspace_registries'], $values['workspace_registries'])) {
				await SettingService.setGlobal({
					key: 'workspace_registries',
					requestBody: { value: $values['workspace_registries'] ?? null }
				})
				initialValues['workspace_registries'] = $values['workspace_registries']
					? JSON.parse(JSON.stringify($values['workspace_registries']))
					: undefined
			}
		}

		if (licenseKeySet) setLicense()

		if (shouldReloadPage) {
			sendUserToast('设置已更新，正在重新加载页面...')
			await sleep(1000)
			window.location.reload()
		} else if (willRestart) {
			sendUserToast(
				'设置已更新。服务正在重启，变更完全生效可能需要约一分钟。',
				false,
				[],
				undefined,
				8000
			)
			dispatch('saved')
		} else {
			sendUserToast('设置已更新')
			dispatch('saved')
		}
	}

	let yamlCode = $state('')
	let yamlCodeInitial = $state('')
	let yamlEditor: any | undefined = $state(undefined)
	let yamlError = $state('')
	let showSensitive = $state(false)

	const SENSITIVE_UNCHANGED = '__SENSITIVE_AND_UNCHANGED__'

	const sensitiveKeys: Set<string> = new Set([
		...[...Object.values(settings), scimSamlSetting]
			.flatMap((s) => Object.values(s))
			.filter((s) => s.fieldType === 'password' || s.fieldType === 'license_key')
			.map((s) => s.key),
		'ducklake_user_pg_pwd',
		'jwt_secret',
		'workspace_registries'
	])

	// Settings that should never appear in YAML export/import.
	// `worker_configs` is a legacy ghost key: worker configs live in the `config`
	// table (managed from /workers), not in `global_settings`. Older DBs may
	// still carry a stale `global_settings.worker_configs` row; filter it here
	// so it never round-trips through this editor.
	const excludedKeys: Set<string> = new Set(['worker_configs'])

	// Nested fields inside object-valued settings that contain secrets.
	// Each entry maps a top-level key to its sensitive sub-field names.
	const nestedSensitiveFields: Record<string, string[]> = {
		smtp_settings: ['smtp_password'],
		secret_backend: ['token'],
		object_store_cache_config: ['secret_key', 'serviceAccountKey'],
		custom_instance_pg_databases: ['user_pwd'],
		rsa_keys: ['private_key'],
		github_enterprise_app: ['private_key']
	}

	/** Returns SENSITIVE_UNCHANGED if the value is non-empty and matches the initial */
	function maskField(current: any, initial: any): string | undefined {
		if (current != null && current !== '' && current === initial) return SENSITIVE_UNCHANGED
		return undefined
	}

	function maskSensitive(obj: Record<string, any>): Record<string, any> {
		const masked: Record<string, any> = {}
		for (const [key, value] of Object.entries(obj)) {
			if (key === 'oauths' && typeof value === 'object' && value !== null) {
				const maskedOauths: Record<string, any> = {}
				for (const [provider, config] of Object.entries(value as Record<string, any>)) {
					if (typeof config === 'object' && config !== null && 'secret' in config) {
						const m = maskField(config.secret, initialOauths?.[provider]?.secret)
						maskedOauths[provider] = m ? { ...config, secret: m } : config
					} else {
						maskedOauths[provider] = config
					}
				}
				masked[key] = maskedOauths
			} else if (key in nestedSensitiveFields && typeof value === 'object' && value !== null) {
				const cp = { ...value }
				const init = initialValues?.[key]
				for (const field of nestedSensitiveFields[key]) {
					const m = maskField(
						field === 'serviceAccountKey' ? JSON.stringify(cp[field]) : cp[field],
						field === 'serviceAccountKey' ? JSON.stringify(init?.[field]) : init?.[field]
					)
					if (m) cp[field] = m
				}
				masked[key] = cp
			} else if (sensitiveKeys.has(key) && value != null && value !== '') {
				masked[key] = value === initialValues?.[key] ? SENSITIVE_UNCHANGED : value
			} else {
				masked[key] = value
			}
		}
		return masked
	}

	/**
	 * Builds a sorted YAML string of all instance settings.
	 * - normalize: strip keys whose values match the default (empty/falsy or key-specific defaults)
	 * - mask: replace sensitive values with placeholder (for display)
	 */
	function buildSettingsYaml(
		vals: Record<string, any>,
		oauthsObj: Record<string, any>,
		reqPreexisting: boolean,
		opts: { normalize?: boolean; mask?: boolean } = {}
	): string {
		// Merge all settings (including oauths) into one object so they sort together
		const merged: Record<string, any> = { ...vals }
		if (oauthsObj && Object.keys(stripEmpty(oauthsObj)).length > 0) {
			merged['oauths'] = oauthsObj
		}
		if (reqPreexisting) {
			merged['require_preexisting_user_for_oauth'] = reqPreexisting
		}
		const obj: Record<string, any> = {}
		for (const key of Object.keys(merged).sort()) {
			if (excludedKeys.has(key)) continue
			if (opts.normalize && normalizeValue(merged[key], key) === undefined) continue
			obj[key] = merged[key]
		}
		// Strip runtime-only `databases` sub-field from custom_instance_pg_databases
		if (obj['custom_instance_pg_databases']?.databases) {
			obj['custom_instance_pg_databases'] = { ...obj['custom_instance_pg_databases'] }
			delete obj['custom_instance_pg_databases'].databases
		}
		return YAML.stringify(opts.mask ? maskSensitive(obj) : obj)
	}

	function syncFormToYaml() {
		yamlCode = buildSettingsYaml($values, oauths, requirePreexistingUserForOauth, {
			normalize: true,
			mask: !showSensitive
		})
		yamlCodeInitial = buildSettingsYaml(
			initialValues,
			initialOauths,
			initialRequirePreexistingUserForOauth,
			{ normalize: true, mask: !showSensitive }
		)
		yamlEditor?.setCode(yamlCode)
		yamlError = ''
	}

	function syncYamlToForm(): boolean {
		try {
			// Flush the editor's current content (bypasses the 200ms debounce in SimpleEditor)
			const currentCode = yamlEditor?.getCode() ?? yamlCode
			if (currentCode !== yamlCode) {
				yamlCode = currentCode
			}
			const parsed = YAML.parse(yamlCode)
			if (typeof parsed !== 'object' || parsed === null) {
				sendUserToast('YAML 必须是映射结构（key: value）', true)
				return false
			}

			// Restore sensitive values that were not changed (placeholder → original value)
			if ('oauths' in parsed && typeof parsed['oauths'] === 'object') {
				for (const [provider, config] of Object.entries(parsed['oauths'] as Record<string, any>)) {
					if (
						typeof config === 'object' &&
						config !== null &&
						config.secret === SENSITIVE_UNCHANGED
					) {
						config.secret = initialOauths?.[provider]?.secret
					}
				}
				oauths = parsed['oauths'] ?? {}
				delete parsed['oauths']
			}
			if ('require_preexisting_user_for_oauth' in parsed) {
				requirePreexistingUserForOauth = parsed['require_preexisting_user_for_oauth'] ?? false
				delete parsed['require_preexisting_user_for_oauth']
			}

			// Restore unchanged sensitive settings (placeholder → original value)
			for (const key of sensitiveKeys) {
				if (key in parsed && parsed[key] === SENSITIVE_UNCHANGED) {
					parsed[key] = initialValues?.[key]
				}
			}
			// Restore nested sensitive fields
			for (const [parentKey, fields] of Object.entries(nestedSensitiveFields)) {
				if (parsed[parentKey] && typeof parsed[parentKey] === 'object') {
					const init = initialValues?.[parentKey]
					for (const field of fields) {
						if (parsed[parentKey][field] === SENSITIVE_UNCHANGED) {
							parsed[parentKey][field] = init?.[field]
						}
					}
				}
			}

			// Preserve excluded keys from current form state
			for (const key of excludedKeys) {
				if (key in $values) {
					parsed[key] = $values[key]
				}
			}

			// Preserve runtime-only `databases` sub-field in custom_instance_pg_databases
			const existingDatabases = initialValues?.['custom_instance_pg_databases']?.databases
			if (existingDatabases && parsed['custom_instance_pg_databases']) {
				parsed['custom_instance_pg_databases'].databases = existingDatabases
			}

			$values = parsed
			applyFormDefaults($values)

			yamlError = ''
			return true
		} catch (e) {
			yamlError = String(e)
			sendUserToast('YAML 无效：' + e, true)
			return false
		}
	}

	let prevYamlMode = false
	let prevLoading = true
	$effect(() => {
		if (yamlMode && !prevYamlMode) {
			syncFormToYaml()
		} else if (!yamlMode && prevYamlMode) {
			if (!syncYamlToForm()) {
				// Reset toggle back to YAML on parse failure
				yamlMode = true
			}
		} else if (yamlMode && prevLoading && !loading) {
			// Settings just finished loading while in YAML mode
			syncFormToYaml()
		}
		prevYamlMode = yamlMode
		prevLoading = loading
	})

	function handleShowSensitiveToggle(checked: boolean) {
		// Sync any in-progress edits back to form state before re-rendering
		syncYamlToForm()
		showSensitive = checked
		syncFormToYaml()
	}

	/** Call before entering diff mode to sync YAML edits into form state */
	export function syncBeforeDiff(): boolean {
		if (yamlMode) {
			return syncYamlToForm()
		}
		return true
	}

	export function buildFullDiff(): { original: string; modified: string } {
		return {
			original: buildSettingsYaml(
				initialValues,
				initialOauths,
				initialRequirePreexistingUserForOauth,
				{ normalize: true }
			),
			modified: buildSettingsYaml($values, oauths, requirePreexistingUserForOauth, {
				normalize: true
			})
		}
	}

	$effect(() => {
		if (yamlMode) {
			// In YAML mode, compare editor content against snapshot taken on entry
			hasUnsavedChanges = yamlCodeInitial !== '' && yamlCode !== yamlCodeInitial
		} else {
			// Reuse per-category dirty tracking instead of rebuilding full YAML
			hasUnsavedChanges = Object.values(dirtyCategories).some(Boolean)
		}
	})
</script>

<div class="pb-12">
	{#if yamlMode}
		<div class="flex flex-row justify-between">
			<p class="text-2xs text-tertiary">
				使用此 YAML 以代码方式管理实例设置。
			</p>
			<!-- svelte-ignore a11y_label_has_associated_control -->
			<div class="flex items-center justify-end gap-4 mb-2">
				<Toggle
					checked={showSensitive}
					on:change={(e) => handleShowSensitiveToggle(e.detail)}
					options={{ right: '显示敏感值' }}
					size="xs"
				/>
			</div>
		</div>
		<div class="border rounded w-full h-[calc(100vh-12rem)]">
			{#await import('$lib/components/SimpleEditor.svelte')}
				<Loader2 class="animate-spin" />
			{:then Module}
				<Module.default
					bind:this={yamlEditor}
					class="h-full"
					lang="yaml"
					bind:code={yamlCode}
					fixedOverflowWidgets={false}
				/>
			{/await}
		</div>
		{#if yamlError}
			<div class="text-red-500 text-xs mt-1">{yamlError}</div>
		{/if}
	{:else if hideTabs}
		{@render categoryContent(tab)}
	{:else}
		<Tabs bind:selected={tab}>
			{#each settingsKeys as category}
				<Tab value={category} label={categoryLabel(category)}></Tab>
			{/each}

			{#snippet content()}
				<div class="pt-4"></div>
				{#each Object.keys(settings) as category}
					<TabContent value={category}>
						{@render categoryContent(category)}
					</TabContent>
				{/each}
			{/snippet}
		</Tabs>
	{/if}

	{#snippet categoryContent(category: string)}
		{#if category == 'Core'}
			<SettingsPageHeader
				title="核心配置"
				description="配置当前实例的基础行为。"
			/>
		{:else if category == 'SMTP'}
			<SettingsPageHeader
				title="邮件服务"
				description="配置 SMTP 后，可以发送用户邀请、成员加入通知和重要告警邮件。"
			/>
		{:else if category == 'Registries'}
			<SettingsPageHeader
				title="私有依赖源"
				description="配置 Python、Bun、npm 等运行环境使用的内部依赖源。"
			/>
			{#if !$enterpriseLicense}
				<Alert type="info" title="当前部署未开放私有仓库配置" class="mb-2" />
			{/if}
		{:else if category == 'Alerts'}
			<SettingsPageHeader
				title="告警"
				description="配置任务异常、Worker 故障、队列延迟等系统事件的通知方式。"
			/>
		{:else if category == 'OTEL/Prom'}
			<SettingsPageHeader
				title="OpenTelemetry / Prometheus"
				description="配置 OpenTelemetry 和 Prometheus 指标导出，用于监控当前实例。"
			/>
		{:else if category == 'Indexer'}
			<SettingsPageHeader
				title="全文索引"
				description="配置运行记录和服务日志的全文搜索索引服务。该能力需要单独的索引容器。"
			/>
			{#if !$enterpriseLicense}
				<Alert
					type="info"
					title="当前部署未开放运行记录和服务日志全文搜索"
					class="mb-2"
				/>
			{/if}
		{:else if category == 'Telemetry'}
			<SettingsPageHeader title="遥测" />
			{#if $enterpriseLicense}
				<div class="text-primary pb-4 text-xs">
					启用授权能力时需要保留最小遥测以满足授权合规要求。启用最小遥测后，仅会发送以下数据：
					<ul class="list-disc list-inside pl-2">
						<li>实例版本</li>
						<li>实例基础访问地址</li>
						<li>登录方式使用情况（登录方式、数量）</li>
						<li>Worker 使用情况（Worker、Worker 实例、vCPU、内存）</li>
						<li>用户使用情况（开发者数量、操作员数量）</li>
						<li>超级管理员邮箱地址</li>
						<li>开发实例状态</li>
					</ul>
					<br />关闭最小遥测时，还会收集以下数据：
					<ul class="list-disc list-inside pl-2">
						<li>任务使用情况（语言、总耗时、数量）</li>
						<li>Git 同步仓库数量（同步模式与发布模式）</li>
						<li
							>AI 对话使用情况（供应商、模型、模式、会话数量、消息数量，最近 30 天）</li
						>
					</ul>
					<br />对于隔离网络实例，可以下载遥测数据并手动发送。
				</div>
				<div class="flex gap-2 mb-4">
					<Button
						on:click={sendStats}
						variant="default"
						btnClasses="w-auto"
						loading={sendingStats}
						size="xs"
					>
						发送使用情况
					</Button>
					<Button
						on:click={downloadStats}
						variant="default"
						btnClasses="w-auto"
						loading={downloadingStats}
						size="xs"
					>
						下载使用情况
					</Button>
				</div>
			{:else}
				<div class="text-primary pb-4 text-xs">
					系统会收集匿名使用数据，用于改进产品体验。
					<br />会收集以下信息：
					<ul class="list-disc list-inside pl-2">
						<li>实例版本</li>
						<li>实例基础访问地址</li>
						<li>任务使用情况（语言、总耗时、数量）</li>
						<li>登录方式使用情况（登录方式、数量）</li>
						<li>Worker 使用情况（Worker、Worker 实例、vCPU、内存）</li>
						<li>用户使用情况（开发者数量、操作员数量）</li>
						<li>开发实例状态</li>
						<li
							>AI 对话使用情况（供应商、模型、模式、会话数量、消息数量，最近 30 天）</li
						>
					</ul>
				</div>
			{/if}
		{:else if category == 'Jobs'}
			<SettingsPageHeader
				title="任务"
				description="配置任务执行的默认超时和数据保留策略。"
			/>
		{:else if category == 'Object Storage'}
			<SettingsPageHeader
				title="对象存储"
				description="配置兼容 S3 的对象存储，用于大型日志和分布式依赖缓存。"
			/>
		{:else if category == 'Private Hub'}
			<SettingsPageHeader
				title="内部模板库"
				description="连接内部模板库，用于共享脚本模板和集成模板。"
			/>
		{:else if category == 'Secret Storage'}
			<SettingsPageHeader
				title="密钥存储"
				description="配置密钥变量的存储位置。"
			/>
		{:else if category == 'GitHub Enterprise App'}
			<SettingsPageHeader
				title="GitHub App"
				description="配置自管理 GitHub App，用于 Git 同步。"
			/>
		{:else if category == 'DB Health'}
			<SettingsPageHeader
				title="数据库健康"
				description="按需执行数据库诊断，分析表大小、任务保留、连接池健康、Vacuum 状态等信息。"
			/>
			<DbHealth />
		{:else if category == 'Auth/OAuth/SAML'}
			<AuthSettings
				bind:oauths
				bind:instanceInputs
				bind:requirePreexistingUserForOauth
				baseUrl={$values?.base_url}
				bind:tab={authSubTab}
				{hideTabs}
			>
				{#snippet scim()}
					<div class="flex-col flex gap-6 pb-4">
						{#each scimSamlSetting as setting}
							<InstanceSetting
								on:closeDrawer={() => closeDrawer?.()}
								{loading}
								{setting}
								{values}
								{version}
								{oauths}
							/>
						{/each}
					</div>
				{/snippet}
			</AuthSettings>
		{/if}

		<div class="flex-col flex gap-6 pb-6">
			{#each settings[category] as setting}
				<!-- slack connect is handled with the alert channels settings, smtp_connect is handled in InstanceSetting -->
				{#if setting.fieldType != 'slack_connect' && !(quickSetup && setting.hideInQuickSetup) && !(quickSetup && category === 'Core' && setting.key === 'license_key')}
					<InstanceSetting
						{openSmtpSettings}
						on:closeDrawer={() => closeDrawer?.()}
						{loading}
						{setting}
						{values}
						{version}
						{oauths}
						warning={setting.key === 'base_url' && baseUrlIsFallback
							? 'Auto-detected from browser — not yet saved'
							: setting.key === 'nuget_config' &&
								  $values['nuget_config'] &&
								  !/<clear\s*\/>/.test($values['nuget_config'])
								? 'Missing <clear /> in <packageSources>. Without it, default sources (like nuget.org) are merged with your custom sources, which is likely not what you want.'
								: undefined}
					/>
				{/if}
				{#if quickSetup && category === 'Core' && setting.key === 'base_url'}
					{@const licenseKeySetting = settings['Core'].find((s) => s.key === 'license_key')}
					{#if licenseKeySetting}
						<InstanceSetting
							{openSmtpSettings}
							on:closeDrawer={() => closeDrawer?.()}
							{loading}
							setting={licenseKeySetting}
							{values}
							{version}
							{oauths}
						/>
					{/if}
				{/if}
			{/each}
			{#if quickSetup && category === 'Core'}
				{@const extraSettings = [
					...settings['Jobs'].filter((s) => s.key === 'job_isolation'),
					...settings['Jobs'].filter((s) => s.key === 'retention_period_secs'),
					...(settings['Object Storage']?.filter((s) => s.key === 'object_store_cache_config') ??
						[])
				]}
				{#each extraSettings as setting}
					<InstanceSetting
						{openSmtpSettings}
						on:closeDrawer={() => closeDrawer?.()}
						{loading}
						{setting}
						{values}
						{version}
						{oauths}
					/>
				{/each}
			{/if}
		</div>

		{#if category === 'Registries'}
			<WorkspaceRegistries {values} {loading} />
		{/if}

		{#if !loading && !quickSetup && !hideTabs}
			<SettingsFooter
				hasUnsavedChanges={dirtyCategories[category] ?? false}
				disabled={invalidCategories[category] ?? false}
				onSave={() => saveCategorySettings(category)}
				onDiscard={() => discardCategory(category)}
				saveLabel={`Save ${category.toLowerCase()} settings`}
				class="bg-surface"
			/>
		{/if}
	{/snippet}
</div>
