import type { ButtonType } from './common/button/model'
import { z } from 'zod'

// Languages that support HTTP request tracing via OTEL proxy
export const OTEL_TRACING_PROXY_LANGUAGES = [
	'nativets',
	'python3',
	'deno',
	'bun',
	'go',
	'bash',
	'rust',
	'csharp',
	'nu',
	'ruby'
] as const

export interface Setting {
	label: string
	description?: string
	placeholder?: string
	cloudonly?: boolean
	ee_only?: string
	tooltip?: string
	key: string
	// If value is not specified for first element, it will automatcally use undefined
	select_items?: {
		label: string
		tooltip?: string
		// If not specified, label will be used
		value?: string
	}[]
	fieldType:
		| 'text'
		| 'number'
		| 'boolean'
		| 'password'
		| 'select'
		| 'select_python'
		| 'textarea'
		| 'codearea'
		| 'seconds'
		| 'email'
		| 'license_key'
		| 'object_store_config'
		| 'critical_error_channels'
		| 'critical_alerts_on_db_oversize'
		| 'slack_connect'
		| 'smtp_connect'
		| 'indexer_rates'
		| 'otel'
		| 'otel_tracing_proxy'
		| 'secret_backend'
		| 'github_enterprise_app'
		| 'ws_connectivity'
	storage: SettingStorage
	advancedToggle?: {
		label: string
		onChange: (values: Record<string, any>) => Record<string, any>
		checked: (values: Record<string, any>) => boolean
	}
	hiddenIfNull?: boolean
	hiddenIfEmpty?: boolean
	hiddenInEe?: boolean
	hideInQuickSetup?: boolean
	requiresReloadOnChange?: boolean
	triggersRestart?: boolean
	isValid?: (value: any) => boolean
	validate?: (value: any) => Record<string, string>
	error?: string
	defaultValue?: () => any
	codeAreaLang?: string
	actionButton?: {
		label: string
		onclick: (values: Record<string, any>) => Promise<void>
		variant?: ButtonType.Variant
	}
}

export type SettingStorage = 'setting'

const positiveNumber = z.number().positive('Must be a positive number')
const nonNegativeNumber = z.number().nonnegative('Must be zero or a positive number')

const indexerSettingsSchema = z
	.object({
		writer_memory_budget: positiveNumber.optional(),
		commit_job_max_batch_size: positiveNumber.optional(),
		refresh_index_period: positiveNumber.optional(),
		max_indexed_job_log_size: positiveNumber.optional(),
		commit_log_max_batch_size: positiveNumber.optional(),
		refresh_log_index_period: positiveNumber.optional(),
		max_index_time_window_secs: nonNegativeNumber.optional()
	})
	.passthrough()

function validateIndexerSettings(v: any): Record<string, string> {
	if (!v) return {}
	const result = indexerSettingsSchema.safeParse(v)
	if (result.success) return {}
	const errors: Record<string, string> = {}
	for (const issue of result.error.issues) {
		const field = issue.path[0]?.toString()
		if (field) errors[field] = issue.message
	}
	return errors
}

export const scimSamlSetting: Setting[] = [
	{
		label: 'SCIM token',
		description: 'Token used to authenticate requests from the IdP',
		key: 'scim_token',
		fieldType: 'password',
		placeholder: 'mytoken',
		storage: 'setting',
		ee_only: ''
	},
	{
		label: 'SAML metadata',
		description: 'XML metadata url OR content for the SAML IdP',
		key: 'saml_metadata',
		fieldType: 'textarea',
		placeholder: 'https://dev-2578259.okta.com/app/exkaell8gidiiUWrg5d7/sso/saml/metadata ',
		storage: 'setting',
		ee_only: '',
		triggersRestart: true
	}
]

export const settings: Record<string, Setting[]> = {
	Core: [
		{
			label: 'Base url',
			description:
				'实例对用户公开访问的基础地址。',
			key: 'base_url',
			fieldType: 'text',
			placeholder: 'https://windmill.com',
			storage: 'setting',
			error: 'Base url must start with http:// or https:// and not end with / or a space',
			isValid: (value: string | undefined) =>
				value == undefined ||
				(value?.startsWith('http') &&
					value.includes('://') &&
					!value?.endsWith('/') &&
					!value?.endsWith(' '))
		},
		{
			label: 'Email domain',
			description: 'Domain to display in webhooks for email triggers (should match the MX record)',
			key: 'email_domain',
			fieldType: 'text',
			placeholder: 'mail.windmill.com',
			storage: 'setting',
			triggersRestart: true,
			error: 'Must be a valid domain',
			isValid: (value: string | undefined) =>
				value == undefined ||
				value === '' ||
				/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/.test(
					value
				)
		},
		{
			label: 'Request size limit in MB',
			description: 'Maximum size of HTTP requests in MB.',
			cloudonly: true,
			key: 'request_size_limit_mb',
			fieldType: 'number',
			placeholder: '50',
			storage: 'setting',
			triggersRestart: true
		},
		{
			label: '授权配置',
			description:
				'用于启用当前部署未开放的高级能力。普通内部使用无需配置。',
			key: 'license_key',
			fieldType: 'license_key',
			placeholder: '内部部署通常无需填写',
			storage: 'setting'
		},
		{
			label: 'Non-prod instance',
			description:
				'是否将当前实例标记为非生产环境。',
			key: 'dev_instance',
			fieldType: 'boolean',
			storage: 'setting',
			ee_only: '',
			hideInQuickSetup: true
		},
		{
			label: 'App workspace prefix',
			description:
				'When enabled apps will be accessible at /a/{workspace_id}/{custom_path} instead of /a/{custom_path} allowing you to define same custom path for apps in different workspace without conflict',
			key: 'app_workspaced_route',
			fieldType: 'boolean',
			storage: 'setting',
			ee_only: '',
			hideInQuickSetup: true
		},
		{
			label: 'HTTP route workspace prefix',
			description:
				'When enabled HTTP routes will be accessible at /api/r/{workspace_id}/{route} instead of /api/r/{route} allowing you to define same route path in different workspaces without conflict',
			key: 'http_route_workspaced_route',
			fieldType: 'boolean',
			storage: 'setting',
			ee_only: '',
			hideInQuickSetup: true
		},
		{
			label: 'Audit log retention (days)',
			key: 'audit_log_retention_days',
			description: 'How long to keep audit log entries in the database. Default: 365 days.',
			fieldType: 'number',
			placeholder: '365',
			storage: 'setting',
			ee_only: '',
			hideInQuickSetup: true
		}
	],
	Jobs: [
		{
			label: 'Job isolation',
			key: 'job_isolation',
			fieldType: 'select',
			description:
				'任务执行隔离模式。None 表示不隔离；Unshare 使用 PID namespace 隔离；Nsjail 使用完整 nsjail 沙箱。',
			storage: 'setting',
			select_items: [
				{
					label: 'None',
					value: 'none'
				},
				{
					label: 'Unshare',
					value: 'unshare'
				},
				{
					label: 'Nsjail',
					value: 'nsjail_sandboxing'
				}
			]
		},
		{
			label: 'Nsjail /tmp backing',
			key: 'nsjail_tmp_backing',
			fieldType: 'select',
			description:
				'How <code>/tmp</code> is backed inside the nsjail sandbox. <strong>RAM (tmpfs)</strong> is the default — fast, with a hard size cap from <em>Nsjail tmpfs size</em>, but consumes worker memory. <strong>Disk (bind mount)</strong> uses a per-job directory on the worker disk — no RAM cost, but the only remaining per-file ceiling is <code>rlimit_fsize</code> (~1GB for python/ansible, unbounded for most other languages because they set <code>disable_rl: true</code>); pair with host disk monitoring or quotas.',
			storage: 'setting',
			placeholder: 'tmpfs',
			defaultValue: () => 'tmpfs',
			select_items: [
				{ label: 'RAM (tmpfs) — default', value: 'tmpfs' },
				{ label: 'Disk (bind mount)', value: 'disk' }
			]
		},
		{
			label: 'Nsjail tmpfs size (MB)',
			key: 'nsjail_tmpfs_size_mb',
			description:
				'Override the size of the <code>/tmp</code> tmpfs mount inside the nsjail sandbox (in MB). When left empty, defaults to 800MB. Only applies when <em>Nsjail /tmp backing</em> is RAM (tmpfs).',
			fieldType: 'number',
			placeholder: '800',
			storage: 'setting'
		},
		{
			label: 'Sandbox image max size (MB)',
			key: 'sandbox_image_max_size_mb',
			description:
				'Reject a <code># sandbox &lt;image&gt;</code> whose compressed download size exceeds this many MB, before any layer is downloaded. Leave empty for no limit.',
			fieldType: 'number',
			placeholder: 'no limit',
			storage: 'setting'
		},
		{
			label: 'Sandbox image cache cap (MB)',
			key: 'sandbox_image_cache_max_mb',
			description:
				"Best-effort cap on the worker's cached sandbox rootfs tars. When exceeded, the oldest (by creation time) are evicted after a run. Leave empty for unbounded.",
			fieldType: 'number',
			placeholder: 'unbounded',
			storage: 'setting'
		},
		{
			label: 'Sandbox image pull policy',
			key: 'sandbox_image_pull_policy',
			description:
				'When to re-pull a <code># sandbox</code> image. <strong>newer</strong> (default) re-pulls only when the registry digest changed, so moving tags like <code>:latest</code> stay fresh without re-downloading unchanged layers. <strong>missing</strong> pulls only if absent (fastest, tags can go stale). <strong>always</strong> re-checks every job.',
			fieldType: 'select',
			storage: 'setting',
			placeholder: 'newer',
			defaultValue: () => 'newer',
			select_items: [
				{ label: 'Newer (default)', value: 'newer' },
				{ label: 'Missing', value: 'missing' },
				{ label: 'Always', value: 'always' },
				{ label: 'Never', value: 'never' }
			]
		},
		{
			label: 'Sandbox image default registry',
			key: 'sandbox_image_default_registry',
			description:
				'If set, unqualified <code># sandbox</code> images (e.g. <code>alpine</code>) are pulled from this registry instead of <code>docker.io</code>. Fully-qualified refs (e.g. <code>ghcr.io/org/img</code>) are unaffected. Example: <code>myregistry.example.com</code>.',
			fieldType: 'text',
			placeholder: 'docker.io',
			storage: 'setting'
		},
		{
			label: 'Sandbox registry auth',
			key: 'sandbox_registry_auth',
			description:
				'Credentials for private registries used by <code># sandbox</code> images, in docker <code>config.json</code> / <code>auth.json</code> format. Written to a per-job <code>DOCKER_CONFIG</code> dir (removed with the job) and used by crane for the pull.',
			fieldType: 'codearea',
			codeAreaLang: 'json',
			placeholder:
				'{\n  "auths": {\n    "myregistry.example.com": {\n      "auth": "BASE64(username:password)"\n    }\n  }\n}',
			storage: 'setting'
		},
		{
			label: 'SSH execution (#ssh)',
			key: 'ssh_execution_enabled',
			fieldType: 'boolean',
			description:
				'Allow bash scripts starting with a <code>#ssh &lt;resource_path&gt;</code> directive to run on the remote host described by the referenced <code>ssh_target</code> resource instead of the worker. Off by default.',
			storage: 'setting',
			ee_only: '',
			hideInQuickSetup: true
		},
		{
			label: 'Default timeout',
			key: 'job_default_timeout',
			description:
				'单个任务的默认超时时间。',
			fieldType: 'seconds',
			storage: 'setting',
			cloudonly: false
		},
		{
			label: 'Max timeout for sync endpoints',
			description:
				'同步接口允许运行的最长时间，单位为秒。超过后会被停止或判定超时。',
			key: 'timeout_wait_result',
			fieldType: 'seconds',
			placeholder: '60',
			storage: 'setting'
		},
		{
			label: 'Keep job directories for debug',
			key: 'keep_job_dir',
			fieldType: 'boolean',
			description: 'Keep Job directories after execution at /tmp/windmill/WORKER/JOB_ID',
			storage: 'setting'
		},
		{
			label: 'Retention period in secs',
			key: 'retention_period_secs',
			description:
				'任务数据在数据库中的保留时间。当前部署最多保留 30 天。',
			fieldType: 'seconds',
			placeholder: '30',
			storage: 'setting',
			ee_only: '当前部署最多保留 30 天',
			cloudonly: false
		},
		{
			label: 'Workspace fairness — enabled',
			description:
				'Multi-tenant safeguard against a single workspace dominating the shared worker pool. <strong>Only relevant on instances where multiple workspaces share one worker group</strong> — single-tenant deployments do not need this. When a workspace accounts for at least <em>Workspace fairness — max percent</em> of cluster activity over the last <em>Workspace fairness — duration</em> seconds, each worker pull stochastically excludes that workspace so its share converges to the cap without on/off oscillation. Idle workers always fall back to running its jobs, so capping never starves the queue.',
			key: 'workspace_fairness_enabled',
			fieldType: 'boolean',
			storage: 'setting',
			cloudonly: false,
			ee_only:
				'当前部署未开放此功能。该功能仅适用于多个工作空间共享同一 worker 组的大型集群。',
			hideInQuickSetup: true
		},
		{
			label: 'Workspace fairness — max percent',
			description:
				'Maximum share of cluster activity any single workspace may sustain before being stochastically throttled by the pull query. The admitted probability for capped workspaces is set just above this value so the cap is statistically stable rather than oscillating. Default 50.',
			key: 'workspace_fairness_max_percent',
			fieldType: 'number',
			placeholder: '50',
			storage: 'setting',
			cloudonly: false,
			ee_only: '当前部署未开放此功能。',
			hideInQuickSetup: true
		},
		{
			label: 'Workspace fairness — duration (seconds)',
			description:
				'Rolling window used to measure workspace share. Activity = currently running jobs ∪ jobs completed in the last N seconds. Default 10.',
			key: 'workspace_fairness_duration_secs',
			fieldType: 'seconds',
			placeholder: '10',
			storage: 'setting',
			cloudonly: false,
			ee_only: '当前部署未开放此功能。',
			hideInQuickSetup: true
		},
		{
			label: 'Workspace fairness — minimum total jobs',
			description:
				'Cap is only applied when cluster-wide activity exceeds this floor. Prevents over-eager capping on small clusters or quiet periods. Default 4.',
			key: 'workspace_fairness_min_total_jobs',
			fieldType: 'number',
			placeholder: '4',
			storage: 'setting',
			cloudonly: false,
			ee_only: '当前部署未开放此功能。',
			hideInQuickSetup: true
		}
	],
	'Object Storage': [
		{
			label: 'Instance object storage',
			description:
				' S3/Azure bucket to store large logs and global cache for Python and Go. <a href="https://www.windmill.dev/docs/core_concepts/object_storage_in_windmill#instance-object-storage">Learn more</a>',
			key: 'object_store_cache_config',
			fieldType: 'object_store_config',
			storage: 'setting',
			ee_only: '',
			isValid: (v) => {
				if (!v || v.type !== 'Gcs') return true
				return v.serviceAccountKey !== undefined
			}
		},
		{
			label: 'Delete logs from s3 periodically',
			description:
				'Job and service logs are periodically deleted from disk when they expire. When this setting is on, they are also deleted from object storage. Defaults to on when object storage is configured; turn off to keep logs in object storage indefinitely.',
			key: 'monitor_logs_on_s3',
			fieldType: 'boolean',
			storage: 'setting',
			ee_only: ''
		},
		{
			label: 'Store audit logs in object storage',
			description:
				'When enabled and instance object storage is configured, audit logs are also exported as newline-delimited JSON to the dedicated logs/audit/ folder (partitioned by day). Export is incremental and runs off the hot path. Pre-existing history is not backfilled: export starts from when the setting is enabled (transactions in flight at that moment may include a bounded set of just-prior rows). No audit log committed after enabling is ever skipped.',
			key: 'store_audit_logs_s3',
			fieldType: 'boolean',
			storage: 'setting',
			ee_only: '',
			hideInQuickSetup: true
		}
	],
	'内部模板库': [
		{
			label: '内部模板库地址',
			description:
				'内部模板库服务地址，不需要以斜杠结尾。',
			placeholder: 'https://hub.company.com',
			key: 'hub_base_url',
			fieldType: 'text',
			storage: 'setting',
			ee_only: '',
			advancedToggle: {
				label: '终端用户浏览器访问地址不同',
				onChange(values) {
					if (values['hub_accessible_url']) {
						values['hub_accessible_url'] = null
					} else {
						values['hub_accessible_url'] = values['hub_base_url'] || 'https://hub.company.com'
					}
					return values
				},
				checked: (values) => values['hub_accessible_url'] != null
			},
			requiresReloadOnChange: true
		},
		{
			label: '内部模板库浏览器访问地址',
			description:
				'终端用户浏览器可访问的内部模板库地址，不需要以斜杠结尾。',
			key: 'hub_accessible_url',
			fieldType: 'text',
			hiddenIfNull: true,
			storage: 'setting',
			ee_only: '',
			requiresReloadOnChange: true
		},
		{
			label: '内部模板库 API 密钥',
			description:
				'如果内部模板库限制访问，可以在这里配置 API 密钥。',
			key: 'hub_api_secret',
			fieldType: 'password',
			storage: 'setting',
			ee_only: ''
		},
		{
			label: 'Azure OpenAI base path',
			description:
				'所有使用 OpenAI 资源的工作空间会使用指定模型。格式：https://{your-resource-name}.openai.azure.com/openai/deployments/{deployment-id}。',
			key: 'openai_azure_base_path',
			fieldType: 'text',
			storage: 'setting',
			ee_only: '',
			hiddenIfEmpty: true
		},
		{
			label: '禁用模板库',
			description:
				'禁用外部模板库集成。封闭内网环境建议保持开启。',
			key: 'disable_hub',
			fieldType: 'boolean',
			storage: 'setting',
			ee_only: '',
			requiresReloadOnChange: true
		}
	],
	SMTP: [
		{
			label: 'SMTP configuration',
			key: 'smtp_settings',
			fieldType: 'smtp_connect',
			storage: 'setting',
			ee_only: ''
		},
		{
			label: 'Disable workspace invite emails',
			description:
				'Do not send email notifications when a user is invited or added to a workspace. Useful for automated workflows that add users programmatically.',
			key: 'disable_workspace_invite_emails',
			fieldType: 'boolean',
			storage: 'setting'
		}
	],
	'Auth/OAuth/SAML': [
		{
			label: 'Disable password login',
			description:
				'Hide the email/password form on the login page and reject password login requests. Use when you only want OAuth/SAML logins.',
			key: 'disable_password_login',
			fieldType: 'boolean',
			storage: 'setting'
		},
		{
			label: 'Auto-login SSO provider',
			description:
				'If set, the login page redirects automatically to this provider. Use the OAuth provider key (e.g. "okta", "google") or "saml". The provider must be configured; otherwise the setting is ignored. Visit /user/login?no_sso=1 to bypass the redirect and fall back to the normal login form.',
			key: 'auto_login_provider',
			fieldType: 'text',
			placeholder: 'okta',
			storage: 'setting'
		}
	],
	'DB Health': [],
	Registries: [
		{
			label: 'Instance Python Version',
			description: 'Default python version for newly deployed scripts',
			key: 'instance_python_version',
			fieldType: 'select_python',
			// To change latest stable version:
			// 1. Change placeholder in instanceSettings.ts
			// 2. Change LATEST_STABLE_PY in dockerfile
			// 3. Change #[default] annotation for PyVersion in backend
			placeholder: '3.10,3.11,3.12,3.13',
			select_items: [
				{
					label: 'Latest Stable',
					value: 'default',
					tooltip: 'python-3.12'
				},
				{
					label: '3.10'
				},
				{
					label: '3.11'
				},
				{
					label: '3.12'
				},
				{
					label: '3.13'
				}
			],
			storage: 'setting'
		},
		{
			label: 'UV index url',
			description: 'Add private Pip registry',
			key: 'pip_index_url',
			fieldType: 'password',
			placeholder: 'https://username:password@pypi.company.com/simple',
			storage: 'setting',
			ee_only: ''
		},
		{
			label: 'UV extra index url',
			description: 'Add private extra Pip registry',
			key: 'pip_extra_index_url',
			fieldType: 'password',
			placeholder: 'https://username:password@pypi.company.com/simple',
			storage: 'setting',
			ee_only: ''
		},
		{
			label: 'UV Python install mirror',
			description:
				'Mirror URL for downloading managed Python interpreters. Wires to <code>UV_PYTHON_INSTALL_MIRROR</code>. See <a href="https://docs.astral.sh/uv/configuration/environment/#uv_python_install_mirror">uv docs</a>.',
			key: 'uv_python_install_mirror',
			fieldType: 'text',
			placeholder: 'https://mirror.example.com/python-build-standalone',
			storage: 'setting'
		},
		{
			label: 'UV index strategy',
			description:
				'Strategy for resolving packages from multiple indexes. See <a href="https://docs.astral.sh/uv/pip/compatibility/#packages-that-exist-on-multiple-indexes">uv docs</a>',
			key: 'uv_index_strategy',
			fieldType: 'select',
			placeholder: 'unsafe-best-match',
			defaultValue: () => 'unsafe-best-match',
			select_items: [
				{
					label: 'first-index',
					tooltip: 'Only use the first index that contains the package'
				},
				{
					label: 'unsafe-first-match',
					tooltip: 'Search for packages across all indexes, preferring the first match'
				},
				{
					label: 'unsafe-best-match (default)',
					value: 'unsafe-best-match',
					tooltip: 'Search for packages across all indexes, preferring the best match'
				}
			],
			storage: 'setting',
			ee_only: ''
		},
		{
			label: 'NPM Registry Configuration (.npmrc)',
			description:
				'Full .npmrc file content for private npm registries. Used by Bun, Deno, and the npm proxy. Takes precedence over the legacy fields below.',
			key: 'npmrc',
			fieldType: 'codearea',
			codeAreaLang: 'ini',
			placeholder:
				'registry=https://registry.mycompany.com/\n//registry.mycompany.com/:_authToken=YOUR_TOKEN\n\n@myorg:registry=https://registry.myorg.com/\n//registry.myorg.com/:_authToken=SCOPED_TOKEN',
			storage: 'setting',
			ee_only: ''
		},
		{
			label: 'Npm config registry (legacy)',
			description: 'Add private npm registry. Prefer using the .npmrc field above.',
			key: 'npm_config_registry',
			fieldType: 'password',
			placeholder: 'https://registry.npmjs.org/:_authToken=npm_FOOBAR',
			storage: 'setting',
			ee_only: '',
			hiddenIfEmpty: true
		},
		{
			label: 'Bunfig install scopes (legacy)',
			description:
				'Add private scoped registries for Bun. Prefer using the .npmrc field above. See: https://bun.sh/docs/install/registries',
			key: 'bunfig_install_scopes',
			fieldType: 'password',
			placeholder: '"@myorg3" = { token = "mytoken", url = "https://registry.myorg.com/" }',
			storage: 'setting',
			ee_only: '',
			hiddenIfEmpty: true
		},
		{
			label: 'Minimum release age (uv / Python)',
			description:
				'Refuse to install Python packages younger than this many seconds. Protects against supply-chain attacks via freshly published versions. Wires to <code>uv pip --exclude-newer</code>.',
			key: 'uv_exclude_newer',
			fieldType: 'seconds',
			placeholder: '604800',
			storage: 'setting'
		},
		{
			label: 'Minimum release age (bun / npm)',
			description:
				'Refuse to install npm packages younger than this many seconds. Protects against supply-chain attacks via freshly published versions. Sets <code>BUN_INSTALL_MINIMUM_RELEASE_AGE</code>.',
			key: 'bun_install_min_release_age',
			fieldType: 'seconds',
			placeholder: '604800',
			storage: 'setting'
		},
		{
			label: 'Nuget Config',
			description:
				'Write a nuget.config file to set custom package sources and credentials. Use <clear /> inside <packageSources> to remove default sources and only use your custom ones',
			key: 'nuget_config',
			fieldType: 'codearea',
			codeAreaLang: 'xml',
			storage: 'setting',
			ee_only: ''
		},
		{
			label: 'Maven/Ivy repositories',
			description: 'Add private Maven/Ivy repositories',
			key: 'maven_repos',
			fieldType: 'password',
			placeholder: 'https://user:password@artifacts.foo.com/maven',
			storage: 'setting',
			ee_only: ''
		},
		{
			label: 'Maven settings.xml',
			description:
				'Write a Maven settings.xml file for custom repositories, mirrors, and credentials',
			key: 'maven_settings_xml',
			fieldType: 'codearea',
			codeAreaLang: 'xml',
			storage: 'setting',
			ee_only: ''
		},
		{
			label: 'Disable default Maven repository',
			description: 'Do not use default Maven repository',
			key: 'no_default_maven',
			fieldType: 'boolean',
			storage: 'setting',
			ee_only: ''
		},
		{
			label: 'Ruby Gems repositories',
			description: 'Add private Ruby repositories with credentials. Should end with /',
			key: 'ruby_repos',
			fieldType: 'password',
			placeholder: 'https://user:password@gems.foo.com/',
			storage: 'setting',
			ee_only: ''
		},
		{
			label: 'Cargo registries',
			description: 'Write a .cargo/config.toml to set custom Cargo registries and credentials',
			key: 'cargo_registries',
			fieldType: 'codearea',
			codeAreaLang: 'toml',
			storage: 'setting',
			ee_only: ''
		},
		{
			label: 'PowerShell Repository URL',
			description: 'Add private PowerShell repository URL',
			key: 'powershell_repo_url',
			placeholder:
				'https://pkgs.dev.azure.com/<org>/<project>/_packaging/<feed>/nuget/v3/index.json',
			fieldType: 'text',
			storage: 'setting',
			ee_only: ''
		},
		{
			label: 'PowerShell Repository PAT',
			description:
				'Add private PowerShell repository Personal Access Token (optional, for authenticated repositories)',
			key: 'powershell_repo_pat',
			fieldType: 'password',
			storage: 'setting',
			ee_only: ''
		}
	],
	Alerts: [
		{
			label: 'Critical alert channels',
			description:
				'重要告警的发送渠道。',
			key: 'critical_error_channels',
			fieldType: 'critical_error_channels',
			storage: 'setting',
			ee_only: 'Tracing 以外的告警渠道当前未开放',
			actionButton: {
				label: 'Test all channels',
				onclick: async (values) => {
					const { SettingService } = await import('$lib/gen')
					const { sendUserToast } = await import('$lib/toast')
					try {
						await SettingService.testCriticalChannels({
							requestBody: values.critical_error_channels
						})
						sendUserToast('Test message sent successfully to critical channels', false)
					} catch (error: any) {
						sendUserToast('Failed to send test message: ' + error.message, true)
					}
				},
				variant: 'accent'
			}
		},
		{
			label: 'Mute critical alerts in UI',
			description: 'Enable to mute critical alerts in the UI',
			key: 'critical_alert_mute_ui',
			fieldType: 'boolean',
			storage: 'setting',
			requiresReloadOnChange: true,
			ee_only: '界面内重要告警当前未开放'
		},
		{
			label: 'Alert on token expiry',
			description:
				'Send critical alerts when API tokens are about to expire (within 7 days) or have expired',
			key: 'critical_alerts_on_token_expiry',
			fieldType: 'boolean',
			storage: 'setting',
			ee_only: ''
		},
		{
			label: 'Slack',
			key: 'slack',
			fieldType: 'slack_connect',
			storage: 'setting',
			ee_only: ''
		},
		{
			label: 'Alert on DB oversize',
			key: 'critical_alerts_on_db_oversize',
			description: 'Alert if DB grows more than specified size',
			fieldType: 'critical_alerts_on_db_oversize',
			placeholder: '100',
			storage: 'setting',
			ee_only: ''
		}
	],
	Webhooks: [
		{
			label: 'Instance Events Webhook',
			description:
				'URL to receive POST requests for instance events (user added, OAuth signup, user invited/added/joined workspace).',
			key: 'instance_events_webhook',
			fieldType: 'text',
			placeholder: 'https://example.com/webhook',
			storage: 'setting'
		}
	],
	'OTEL/Prom': [
		{
			label: 'OpenTelemetry',
			key: 'otel',
			fieldType: 'otel',
			storage: 'setting',
			ee_only: '',
			triggersRestart: true
		},
		{
			label: 'HTTP Request Tracing',
			description:
				'Capture HTTP/HTTPS requests from job scripts as OpenTelemetry spans. Visible in job details and exported to your OTEL collector if configured. Toggling restarts workers.',
			key: 'otel_tracing_proxy',
			fieldType: 'otel_tracing_proxy',
			storage: 'setting',
			ee_only: 'HTTP 请求追踪当前未开放',
			triggersRestart: true,
			defaultValue: () => ({ enabled: false, enabled_languages: [...OTEL_TRACING_PROXY_LANGUAGES] })
		},
		{
			label: 'Prometheus',
			description:
				'在 8001 端口的 /metrics 暴露 worker 和 server 的 Prometheus 指标。',
			key: 'expose_metrics',
			fieldType: 'boolean',
			storage: 'setting',
			ee_only: '',
			triggersRestart: true
		}
	],
	Indexer: [
		{
			label: '',
			key: 'indexer_settings',
			fieldType: 'indexer_rates',
			storage: 'setting',
			validate: validateIndexerSettings
		}
	],

	Telemetry: [
		{
			label: 'Minimal telemetry',
			key: 'disable_stats',
			fieldType: 'boolean',
			storage: 'setting'
		}
	],
	'Secret Storage': [
		{
			label: 'Backend type',
			description:
				'默认情况下，密钥会加密存储在数据库中。外部密钥后端属于当前部署未开放的高级能力。',
			key: 'secret_backend',
			fieldType: 'secret_backend',
			storage: 'setting',
			ee_only:
				'当前部署未开放外部密钥后端集成'
		}
	],
	'GitHub App': [
		{
			label: 'GitHub App',
			description:
				'配置自管理 GitHub App，用于在内网环境中启用 Git 同步。',
			key: 'github_enterprise_app',
			fieldType: 'github_enterprise_app',
			storage: 'setting',
			ee_only: '',
			error:
				'When self-managed mode is enabled, Base URL, App ID, App Slug, Client ID, and Private Key are required.',
			isValid: (v: any) => {
				if (!v?.self_managed) return true
				return !!(v?.base_url && v?.app_id && v?.app_slug && v?.client_id && v?.private_key)
			}
		}
	],
	WebSocket: [
		{
			label: 'WebSocket connectivity',
			description:
				'Test connectivity to multiplayer, LSP, and debugger WebSocket services. Enable custom URL override for deployments where WebSocket traffic routes to a different host.',
			key: 'ws_base_url',
			fieldType: 'ws_connectivity',
			storage: 'setting',
			requiresReloadOnChange: true,
			isValid: (value: string | undefined) =>
				!value ||
				(value.startsWith('ws') &&
					value.includes('://') &&
					!value.endsWith('/') &&
					!value.endsWith(' '))
		}
	],
	LSP: [
		{
			label: 'Ruff config (ruff.toml)',
			description:
				'Shared ruff.toml applied to the Python editor linter across the whole instance. The LSP container fetches this every minute and writes it next to edited files. See <a href="https://docs.astral.sh/ruff/configuration/">ruff docs</a>',
			key: 'ruff_config',
			fieldType: 'codearea',
			codeAreaLang: 'toml',
			placeholder: 'line-length = 100\n\n[lint]\nselect = ["E", "F", "I"]\nignore = ["E501"]',
			storage: 'setting'
		}
	]
}

export const settingsKeys = Object.keys(settings)

// --- Sidebar navigation for instance settings ---
export const instanceSettingsNavigationGroups = [
	{
		title: 'Core',
		items: [
			{
				id: 'users',
				label: 'Users',
				aiId: 'instance-settings-users',
				aiDescription: 'Instance users settings'
			},
			{
				id: 'general',
				label: 'General',
				aiId: 'instance-settings-general',
				aiDescription: 'Instance general settings'
			},
			{
				id: 'jobs',
				label: 'Jobs',
				aiId: 'instance-settings-jobs',
				aiDescription: 'Instance jobs settings'
			}
		]
	},
	{
		title: 'Authentication',
		items: [
			{
				id: 'sso',
				label: 'SSO',
				aiId: 'instance-settings-sso',
				aiDescription: 'Instance SSO settings'
			},
			{
				id: 'oauth',
				label: 'OAuth',
				aiId: 'instance-settings-oauth',
				aiDescription: 'Instance OAuth settings'
			}
		]
	},
	{
		title: 'Infrastructure',
		items: [
			{
				id: 'smtp',
				label: 'SMTP',
				aiId: 'instance-settings-smtp',
				aiDescription: 'Instance SMTP settings'
			},
			{
				id: 'registries',
				label: 'Registries',
				aiId: 'instance-settings-registries',
				aiDescription: 'Instance registries settings'
			}
		]
	},
	{
		title: 'Monitoring',
		items: [
			{
				id: 'webhooks',
				label: 'Webhooks',
				aiId: 'instance-settings-webhooks',
				aiDescription: 'Instance events webhook settings'
			},
			{
				id: 'db_health',
				label: 'DB Health',
				aiId: 'instance-settings-db-health',
				aiDescription: 'Database health diagnostics and performance insights'
			}
		]
	},
	{
		title: 'AI',
		items: [
			{
				id: 'ai',
				label: 'AI',
				aiId: 'instance-settings-ai',
				aiDescription: 'Instance AI settings (providers, models, prompts)'
			}
		]
	},
	{
		title: 'Advanced',
		items: [
			{
				id: 'telemetry',
				label: 'Telemetry',
				aiId: 'instance-settings-telemetry',
				aiDescription: 'Instance telemetry settings'
			},
			{
				id: 'secret_storage',
				label: 'Secret Storage',
				aiId: 'instance-settings-secret-storage',
				aiDescription: 'Instance secret storage settings'
			},
			{
				id: 'websocket',
				label: 'WebSocket',
				aiId: 'instance-settings-websocket',
				aiDescription: 'WebSocket connectivity test and URL override'
			},
			{
				id: 'lsp',
				label: 'LSP',
				aiId: 'instance-settings-lsp',
				aiDescription: 'Language server protocol settings (ruff config, editor linting)'
			}
		]
	}
]

export const tabToCategoryMap: Record<string, string> = {
	general: 'Core',
	ai: 'AI',
	sso: 'Auth/OAuth/SAML',
	oauth: 'Auth/OAuth/SAML',
	scim_saml: 'Auth/OAuth/SAML',
	smtp: 'SMTP',
	registries: 'Registries',
	alerts: 'Alerts',
	webhooks: 'Webhooks',
	otel_prom: 'OTEL/Prom',
	indexer: 'Indexer',
	telemetry: 'Telemetry',
	secret_storage: 'Secret Storage',
	object_storage: 'Object Storage',
	jobs: 'Jobs',
	private_hub: '内部模板库',
	github_enterprise_app: 'GitHub App',
	websocket: 'WebSocket',
	db_health: 'DB Health',
	lsp: 'LSP'
}

export const tabToAuthSubTab: Record<string, 'sso' | 'oauth' | 'scim'> = {
	sso: 'sso',
	oauth: 'oauth',
	scim_saml: 'scim'
}

// Navigation groups for the initial setup flow (no Users tab)
export const setupNavigationGroups = instanceSettingsNavigationGroups
	.map((group) => ({
		...group,
		items: group.items.filter((item) => item.id !== 'users')
	}))
	.filter((group) => group.items.length > 0)

export const categoryToTabMap: Record<string, string> = {
	Core: 'general',
	AI: 'ai',
	SMTP: 'smtp',
	'Auth/OAuth/SAML': 'sso',
	Registries: 'registries',
	Alerts: 'alerts',
	Webhooks: 'webhooks',
	'OTEL/Prom': 'otel_prom',
	Indexer: 'indexer',
	Telemetry: 'telemetry',
	'Secret Storage': 'secret_storage',
	'Object Storage': 'object_storage',
	Jobs: 'jobs',
	'内部模板库': 'private_hub',
	'GitHub App': 'github_enterprise_app',
	WebSocket: 'websocket',
	'DB Health': 'db_health',
	LSP: 'lsp'
}

export interface SearchableSettingItem {
	label: string
	tabId: string
	settingKey?: string
	category: string
	/** Full description text (HTML stripped), used for search matching only — not displayed */
	description?: string
}

/**
 * Extract the label portion from a uFuzzy marked/highlighted string.
 * Only allows `<mark>` and `</mark>` tags through (sanitizes everything else).
 */
export function extractMarkedLabel(marked: string | undefined, labelLength: number): string {
	if (!marked) return ''
	let plainIdx = 0
	let markedIdx = 0
	while (plainIdx < labelLength && markedIdx < marked.length) {
		if (marked[markedIdx] === '<') {
			while (markedIdx < marked.length && marked[markedIdx] !== '>') markedIdx++
			markedIdx++
		} else {
			plainIdx++
			markedIdx++
		}
	}
	// Include any closing </mark> right after
	if (marked.startsWith('</mark>', markedIdx)) {
		markedIdx += '</mark>'.length
	}
	// Sanitize: only allow <mark> and </mark> tags from uFuzzy highlight
	return marked.slice(0, markedIdx).replace(/<(?!\/?mark>)[^>]*>/g, '')
}

export function buildSearchableSettingItems(
	navigationGroups: typeof instanceSettingsNavigationGroups = instanceSettingsNavigationGroups
): SearchableSettingItem[] {
	const items: SearchableSettingItem[] = []
	const visibleTabIds = new Set(navigationGroups.flatMap((group) => group.items.map((item) => item.id)))

	// Add sidebar navigation items (tab-level)
	for (const group of navigationGroups) {
		for (const navItem of group.items) {
			items.push({
				label: navItem.label,
				tabId: navItem.id,
				category: group.title
			})
		}
	}

	// Add individual settings from each category
	for (const [category, categorySettings] of Object.entries(settings)) {
		const tabId = categoryToTabMap[category]
		if (!tabId) continue
		if (!visibleTabIds.has(tabId)) continue
		for (const setting of categorySettings) {
			if (!setting.label) continue
			items.push({
				label: setting.label,
				tabId,
				settingKey: setting.key,
				category,
				description: setting.description?.replace(/<[^>]*>/g, '') ?? ''
			})
		}
	}

	// Add SCIM/SAML settings
	if (visibleTabIds.has('scim_saml')) {
		for (const setting of scimSamlSetting) {
			if (!setting.label) continue
			items.push({
				label: setting.label,
				tabId: 'scim_saml',
				settingKey: setting.key,
				category: 'SCIM/SAML',
				description: setting.description?.replace(/<[^>]*>/g, '') ?? ''
			})
		}
	}

	return items
}

/** Registry settings that support per-workspace overrides. Excludes instance_python_version, uv_index_strategy, and uv_python_install_mirror which are instance-wide only. */
export const WORKSPACE_REGISTRY_SETTINGS: Setting[] = settings['Registries'].filter(
	(s) =>
		s.key !== 'instance_python_version' &&
		s.key !== 'uv_index_strategy' &&
		s.key !== 'uv_python_install_mirror'
)
