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

const positiveNumber = z.number().positive('必须为正数')
const nonNegativeNumber = z.number().nonnegative('必须为 0 或正数')

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
		label: 'SCIM 令牌',
		description: '用于认证身份提供方请求的令牌。',
		key: 'scim_token',
		fieldType: 'password',
		placeholder: 'mytoken',
		storage: 'setting',
		ee_only: ''
	},
	{
		label: 'SAML 元数据',
		description: 'SAML 身份提供方的 XML 元数据地址或内容。',
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
			label: '基础访问地址',
			description:
				'实例对用户公开访问的基础地址。',
			key: 'base_url',
			fieldType: 'text',
			placeholder: 'https://internal.example.local',
			storage: 'setting',
			error: '基础访问地址必须以 http:// 或 https:// 开头，且不能以 / 或空格结尾',
			isValid: (value: string | undefined) =>
				value == undefined ||
				(value?.startsWith('http') &&
					value.includes('://') &&
					!value?.endsWith('/') &&
					!value?.endsWith(' '))
		},
		{
			label: '邮件域名',
			description: '邮件触发器 Webhook 中展示的域名，应与 MX 记录匹配。',
			key: 'email_domain',
			fieldType: 'text',
			placeholder: 'mail.example.local',
			storage: 'setting',
			triggersRestart: true,
			error: '必须是有效域名',
			isValid: (value: string | undefined) =>
				value == undefined ||
				value === '' ||
				/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/.test(
					value
				)
		},
		{
			label: '请求大小限制（MB）',
			description: 'HTTP 请求允许的最大大小，单位为 MB。',
			cloudonly: true,
			key: 'request_size_limit_mb',
			fieldType: 'number',
			placeholder: '50',
			storage: 'setting',
			triggersRestart: true
		},
		{
			label: '非生产实例',
			description:
				'是否将当前实例标记为非生产环境。',
			key: 'dev_instance',
			fieldType: 'boolean',
			storage: 'setting',
			ee_only: '',
			hideInQuickSetup: true
		},
		{
			label: '应用路径包含工作空间前缀',
			description:
				'开启后，应用访问路径会从 /a/{custom_path} 变为 /a/{workspace_id}/{custom_path}，不同工作空间可以使用相同自定义路径且互不冲突。',
			key: 'app_workspaced_route',
			fieldType: 'boolean',
			storage: 'setting',
			ee_only: '',
			hideInQuickSetup: true
		},
		{
			label: 'HTTP 路由包含工作空间前缀',
			description:
				'开启后，HTTP 路由会从 /api/r/{route} 变为 /api/r/{workspace_id}/{route}，不同工作空间可以使用相同路由且互不冲突。',
			key: 'http_route_workspaced_route',
			fieldType: 'boolean',
			storage: 'setting',
			ee_only: '',
			hideInQuickSetup: true
		},
		{
			label: '审计日志保留时间（天）',
			key: 'audit_log_retention_days',
			description: '审计日志在数据库中保留的时间。默认 365 天。',
			fieldType: 'number',
			placeholder: '365',
			storage: 'setting',
			ee_only: '',
			hideInQuickSetup: true
		}
	],
	Jobs: [
		{
			label: '任务隔离',
			key: 'job_isolation',
			fieldType: 'select',
			description:
				'任务执行隔离模式。None 表示不隔离；Unshare 使用 PID namespace 隔离；Nsjail 使用完整 nsjail 沙箱。',
			storage: 'setting',
			select_items: [
				{
					label: '无隔离',
					value: 'none'
				},
				{
					label: 'Unshare 隔离',
					value: 'unshare'
				},
				{
					label: 'Nsjail 沙箱',
					value: 'nsjail_sandboxing'
				}
			]
		},
		{
			label: 'Nsjail /tmp 存储方式',
			key: 'nsjail_tmp_backing',
			fieldType: 'select',
			description:
				'配置 nsjail 沙箱内 <code>/tmp</code> 的存储方式。<strong>内存（tmpfs）</strong>速度更快，但会占用 Worker 内存；<strong>磁盘（bind mount）</strong>使用 Worker 磁盘上的任务目录，不占用内存，但需要配合磁盘监控或配额。',
			storage: 'setting',
			placeholder: 'tmpfs',
			defaultValue: () => 'tmpfs',
			select_items: [
				{ label: '内存（tmpfs，默认）', value: 'tmpfs' },
				{ label: '磁盘（bind mount）', value: 'disk' }
			]
		},
		{
			label: 'Nsjail tmpfs 大小（MB）',
			key: 'nsjail_tmpfs_size_mb',
			description:
				'覆盖 nsjail 沙箱内 <code>/tmp</code> tmpfs 挂载大小，单位为 MB。留空时默认为 800MB，仅在 /tmp 使用内存（tmpfs）时生效。',
			fieldType: 'number',
			placeholder: '800',
			storage: 'setting'
		},
		{
			label: '沙箱镜像最大大小（MB）',
			key: 'sandbox_image_max_size_mb',
			description:
				'当 <code># sandbox &lt;image&gt;</code> 的压缩下载大小超过该限制时拒绝拉取。留空表示不限制。',
			fieldType: 'number',
			placeholder: '不限制',
			storage: 'setting'
		},
		{
			label: '沙箱镜像缓存上限（MB）',
			key: 'sandbox_image_cache_max_mb',
			description:
				'Worker 沙箱 rootfs 缓存的软上限。超过上限后，运行结束时会按创建时间清理最旧缓存。留空表示不限制。',
			fieldType: 'number',
			placeholder: '不限制',
			storage: 'setting'
		},
		{
			label: '沙箱镜像拉取策略',
			key: 'sandbox_image_pull_policy',
			description:
				'配置何时重新拉取 <code># sandbox</code> 镜像。<strong>newer</strong>（默认）仅在镜像摘要变化时重新拉取；<strong>missing</strong> 仅在本地不存在时拉取；<strong>always</strong> 每次任务都检查。',
			fieldType: 'select',
			storage: 'setting',
			placeholder: 'newer',
			defaultValue: () => 'newer',
			select_items: [
				{ label: '有新版本时（默认）', value: 'newer' },
				{ label: '缺失时', value: 'missing' },
				{ label: '总是检查', value: 'always' },
				{ label: '从不检查', value: 'never' }
			]
		},
		{
			label: '沙箱镜像默认仓库',
			key: 'sandbox_image_default_registry',
			description:
				'设置后，未指定仓库的 <code># sandbox</code> 镜像会从该仓库拉取，而不是 docker.io。完整镜像地址不受影响。',
			fieldType: 'text',
			placeholder: 'docker.io',
			storage: 'setting'
		},
		{
			label: '沙箱镜像仓库认证',
			key: 'sandbox_registry_auth',
			description:
				'<code># sandbox</code> 镜像使用私有仓库时的认证配置，格式为 Docker <code>config.json</code> / <code>auth.json</code>。运行时会写入任务专属 <code>DOCKER_CONFIG</code> 目录，并随任务清理。',
			fieldType: 'codearea',
			codeAreaLang: 'json',
			placeholder:
				'{\n  "auths": {\n    "myregistry.example.com": {\n      "auth": "BASE64(username:password)"\n    }\n  }\n}',
			storage: 'setting'
		},
		{
			label: 'SSH 执行（#ssh）',
			key: 'ssh_execution_enabled',
			fieldType: 'boolean',
			description:
				'允许以 <code>#ssh &lt;resource_path&gt;</code> 开头的 Bash 脚本在对应 <code>ssh_target</code> 资源描述的远程主机上执行，而不是在 Worker 上执行。默认关闭。',
			storage: 'setting',
			ee_only: '',
			hideInQuickSetup: true
		},
		{
			label: '默认超时',
			key: 'job_default_timeout',
			description:
				'单个任务的默认超时时间。',
			fieldType: 'seconds',
			storage: 'setting',
			cloudonly: false
		},
		{
			label: '同步接口最长等待时间',
			description:
				'同步接口允许运行的最长时间，单位为秒。超过后会被停止或判定超时。',
			key: 'timeout_wait_result',
			fieldType: 'seconds',
			placeholder: '60',
			storage: 'setting'
		},
		{
			label: '保留任务目录用于调试',
			key: 'keep_job_dir',
			fieldType: 'boolean',
			description: '任务执行结束后，在 /tmp/windmill/WORKER/JOB_ID 保留任务目录。',
			storage: 'setting'
		},
		{
			label: '任务数据保留时间（秒）',
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
			label: '工作空间公平调度 - 启用',
			description:
				'用于防止单个工作空间占满共享 Worker 池。仅适用于多个工作空间共享同一 Worker 组的部署；单部门单租户部署通常不需要。',
			key: 'workspace_fairness_enabled',
			fieldType: 'boolean',
			storage: 'setting',
			cloudonly: false,
			ee_only:
				'当前部署未开放此功能。该功能仅适用于多个工作空间共享同一 worker 组的大型集群。',
			hideInQuickSetup: true
		},
		{
			label: '工作空间公平调度 - 最大占比',
			description:
				'单个工作空间在集群活动中允许占用的最大比例。默认 50。',
			key: 'workspace_fairness_max_percent',
			fieldType: 'number',
			placeholder: '50',
			storage: 'setting',
			cloudonly: false,
			ee_only: '当前部署未开放此功能。',
			hideInQuickSetup: true
		},
		{
			label: '工作空间公平调度 - 统计窗口（秒）',
			description:
				'用于统计工作空间占比的滚动时间窗口。默认 10 秒。',
			key: 'workspace_fairness_duration_secs',
			fieldType: 'seconds',
			placeholder: '10',
			storage: 'setting',
			cloudonly: false,
			ee_only: '当前部署未开放此功能。',
			hideInQuickSetup: true
		},
		{
			label: '工作空间公平调度 - 最小任务数',
			description:
				'仅当集群整体活动超过该任务数时才应用限制，避免在小集群或空闲时段过度限制。默认 4。',
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
			label: '实例对象存储',
			description:
				'用于存储大型日志以及 Python、Go 全局缓存的 S3/Azure 存储桶。',
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
			label: '定期删除对象存储中的日志',
			description:
				'任务和服务日志过期后会定期从磁盘删除。开启后，也会同步从对象存储中删除。配置对象存储时默认开启；关闭后对象存储中的日志会长期保留。',
			key: 'monitor_logs_on_s3',
			fieldType: 'boolean',
			storage: 'setting',
			ee_only: ''
		},
		{
			label: '将审计日志存储到对象存储',
			description:
				'开启并配置实例对象存储后，审计日志会以 JSON Lines 格式增量导出到 logs/audit/ 目录，并按天分区。开启前的历史数据不会回填。',
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
			label: 'SMTP 配置',
			key: 'smtp_settings',
			fieldType: 'smtp_connect',
			storage: 'setting',
			ee_only: ''
		},
		{
			label: '禁用工作空间邀请邮件',
			description:
				'邀请或添加用户到工作空间时不发送邮件通知。适用于通过自动化流程批量添加用户的场景。',
			key: 'disable_workspace_invite_emails',
			fieldType: 'boolean',
			storage: 'setting'
		}
	],
	'Auth/OAuth/SAML': [
		{
			label: '禁用密码登录',
			description:
				'隐藏登录页中的邮箱/密码表单，并拒绝密码登录请求。仅使用 OAuth/SAML 登录时可开启。',
			key: 'disable_password_login',
			fieldType: 'boolean',
			storage: 'setting'
		},
		{
			label: '自动登录 SSO 提供方',
			description:
				'设置后，登录页会自动跳转到该登录提供方。可填写 OAuth 提供方 key（如 "okta"、"google"）或 "saml"。提供方必须已配置，否则此设置会被忽略。访问 /user/login?no_sso=1 可跳过自动跳转。',
			key: 'auto_login_provider',
			fieldType: 'text',
			placeholder: 'okta',
			storage: 'setting'
		}
	],
	'DB Health': [],
	Registries: [
		{
			label: '实例 Python 版本',
			description: '新部署脚本默认使用的 Python 版本。',
			key: 'instance_python_version',
			fieldType: 'select_python',
			// To change latest stable version:
			// 1. Change placeholder in instanceSettings.ts
			// 2. Change LATEST_STABLE_PY in dockerfile
			// 3. Change #[default] annotation for PyVersion in backend
			placeholder: '3.10,3.11,3.12,3.13',
			select_items: [
				{
					label: '最新稳定版',
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
			label: 'UV 索引地址',
			description: '添加私有 Pip 仓库。',
			key: 'pip_index_url',
			fieldType: 'password',
			placeholder: 'https://username:password@pypi.company.com/simple',
			storage: 'setting',
			ee_only: ''
		},
		{
			label: 'UV 额外索引地址',
			description: '添加额外的私有 Pip 仓库。',
			key: 'pip_extra_index_url',
			fieldType: 'password',
			placeholder: 'https://username:password@pypi.company.com/simple',
			storage: 'setting',
			ee_only: ''
		},
		{
			label: 'UV Python 安装镜像',
			description:
				'用于下载托管 Python 解释器的镜像地址，对应 <code>UV_PYTHON_INSTALL_MIRROR</code>。',
			key: 'uv_python_install_mirror',
			fieldType: 'text',
			placeholder: 'https://mirror.example.com/python-build-standalone',
			storage: 'setting'
		},
		{
			label: 'UV 索引策略',
			description:
				'从多个索引解析包时使用的策略。',
			key: 'uv_index_strategy',
			fieldType: 'select',
			placeholder: 'unsafe-best-match',
			defaultValue: () => 'unsafe-best-match',
			select_items: [
				{
					label: 'first-index',
					tooltip: '只使用第一个包含该包的索引'
				},
				{
					label: 'unsafe-first-match',
					tooltip: '在所有索引中搜索包，优先使用第一个匹配项'
				},
				{
					label: 'unsafe-best-match（默认）',
					value: 'unsafe-best-match',
					tooltip: '在所有索引中搜索包，优先使用最佳匹配项'
				}
			],
			storage: 'setting',
			ee_only: ''
		},
		{
			label: 'NPM 仓库配置（.npmrc）',
			description:
				'私有 npm 仓库使用的完整 .npmrc 文件内容。Bun、Deno 和 npm 代理都会使用该配置，优先级高于下方旧配置项。',
			key: 'npmrc',
			fieldType: 'codearea',
			codeAreaLang: 'ini',
			placeholder:
				'registry=https://registry.mycompany.com/\n//registry.mycompany.com/:_authToken=YOUR_TOKEN\n\n@myorg:registry=https://registry.myorg.com/\n//registry.myorg.com/:_authToken=SCOPED_TOKEN',
			storage: 'setting',
			ee_only: ''
		},
		{
			label: 'NPM 配置仓库（旧版）',
			description: '添加私有 npm 仓库。优先建议使用上方 .npmrc 配置。',
			key: 'npm_config_registry',
			fieldType: 'password',
			placeholder: 'https://registry.npmjs.org/:_authToken=npm_FOOBAR',
			storage: 'setting',
			ee_only: '',
			hiddenIfEmpty: true
		},
		{
			label: 'Bunfig 安装作用域（旧版）',
			description:
				'为 Bun 添加私有作用域仓库。优先建议使用上方 .npmrc 配置。',
			key: 'bunfig_install_scopes',
			fieldType: 'password',
			placeholder: '"@myorg3" = { token = "mytoken", url = "https://registry.myorg.com/" }',
			storage: 'setting',
			ee_only: '',
			hiddenIfEmpty: true
		},
		{
			label: '最小发布时间（uv / Python）',
			description:
				'拒绝安装发布时间短于该秒数的 Python 包，用于降低新发布恶意包带来的供应链风险。对应 <code>uv pip --exclude-newer</code>。',
			key: 'uv_exclude_newer',
			fieldType: 'seconds',
			placeholder: '604800',
			storage: 'setting'
		},
		{
			label: '最小发布时间（bun / npm）',
			description:
				'拒绝安装发布时间短于该秒数的 npm 包，用于降低新发布恶意包带来的供应链风险。对应 <code>BUN_INSTALL_MINIMUM_RELEASE_AGE</code>。',
			key: 'bun_install_min_release_age',
			fieldType: 'seconds',
			placeholder: '604800',
			storage: 'setting'
		},
		{
			label: 'NuGet 配置',
			description:
				'写入 nuget.config，用于配置自定义包源和凭据。可在 <packageSources> 中使用 <clear /> 移除默认源，仅使用自定义源。',
			key: 'nuget_config',
			fieldType: 'codearea',
			codeAreaLang: 'xml',
			storage: 'setting',
			ee_only: ''
		},
		{
			label: 'Maven/Ivy 仓库',
			description: '添加私有 Maven/Ivy 仓库。',
			key: 'maven_repos',
			fieldType: 'password',
			placeholder: 'https://user:password@artifacts.foo.com/maven',
			storage: 'setting',
			ee_only: ''
		},
		{
			label: 'Maven settings.xml',
			description:
				'写入 Maven settings.xml，用于配置自定义仓库、镜像和凭据。',
			key: 'maven_settings_xml',
			fieldType: 'codearea',
			codeAreaLang: 'xml',
			storage: 'setting',
			ee_only: ''
		},
		{
			label: '禁用默认 Maven 仓库',
			description: '不使用默认 Maven 仓库。',
			key: 'no_default_maven',
			fieldType: 'boolean',
			storage: 'setting',
			ee_only: ''
		},
		{
			label: 'Ruby Gems 仓库',
			description: '添加带凭据的私有 Ruby 仓库，地址应以 / 结尾。',
			key: 'ruby_repos',
			fieldType: 'password',
			placeholder: 'https://user:password@gems.foo.com/',
			storage: 'setting',
			ee_only: ''
		},
		{
			label: 'Cargo 仓库',
			description: '写入 .cargo/config.toml，用于配置自定义 Cargo 仓库和凭据。',
			key: 'cargo_registries',
			fieldType: 'codearea',
			codeAreaLang: 'toml',
			storage: 'setting',
			ee_only: ''
		},
		{
			label: 'PowerShell 仓库地址',
			description: '添加私有 PowerShell 仓库地址。',
			key: 'powershell_repo_url',
			placeholder:
				'https://pkgs.dev.azure.com/<org>/<project>/_packaging/<feed>/nuget/v3/index.json',
			fieldType: 'text',
			storage: 'setting',
			ee_only: ''
		},
		{
			label: 'PowerShell 仓库 PAT',
			description:
				'添加私有 PowerShell 仓库个人访问令牌（可选，用于需要认证的仓库）。',
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
				label: '测试所有渠道',
				onclick: async (values) => {
					const { SettingService } = await import('$lib/gen')
					const { sendUserToast } = await import('$lib/toast')
					try {
						await SettingService.testCriticalChannels({
							requestBody: values.critical_error_channels
						})
						sendUserToast('测试消息已发送到重要告警渠道', false)
					} catch (error: any) {
						sendUserToast('发送测试消息失败：' + error.message, true)
					}
				},
				variant: 'accent'
			}
		},
		{
			label: '在界面中静音重要告警',
			description: '开启后，界面内不再展示重要告警提示。',
			key: 'critical_alert_mute_ui',
			fieldType: 'boolean',
			storage: 'setting',
			requiresReloadOnChange: true,
			ee_only: '界面内重要告警当前未开放'
		},
		{
			label: '令牌过期告警',
			description:
				'当 API 令牌将在 7 天内过期或已经过期时发送重要告警。',
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
			label: '数据库过大告警',
			key: 'critical_alerts_on_db_oversize',
			description: '当数据库大小超过指定值时发送告警。',
			fieldType: 'critical_alerts_on_db_oversize',
			placeholder: '100',
			storage: 'setting',
			ee_only: ''
		}
	],
	Webhooks: [
		{
			label: '实例事件 Webhook',
			description:
				'用于接收实例事件 POST 请求的地址，例如用户添加、OAuth 注册、用户被邀请/添加/加入工作空间。',
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
			label: 'HTTP 请求追踪',
			description:
				'将任务脚本发起的 HTTP/HTTPS 请求记录为 OpenTelemetry span，可在任务详情中查看，并在配置后导出到 OTEL 收集器。切换该项会重启 Worker。',
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
			label: '最小遥测',
			key: 'disable_stats',
			fieldType: 'boolean',
			storage: 'setting'
		}
	],
	'Secret Storage': [
		{
			label: '后端类型',
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
				'启用自管理模式时，必须填写基础地址、App ID、App Slug、Client ID 和私钥。',
			isValid: (v: any) => {
				if (!v?.self_managed) return true
				return !!(v?.base_url && v?.app_id && v?.app_slug && v?.client_id && v?.private_key)
			}
		}
	],
	WebSocket: [
		{
			label: 'WebSocket 连接测试',
			description:
				'测试多人协作、LSP 和调试器 WebSocket 服务的连接情况。如果 WebSocket 流量走不同主机，可启用自定义地址覆盖。',
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
			label: 'Ruff 配置（ruff.toml）',
			description:
				'应用到整个实例 Python 编辑器检查器的共享 ruff.toml。LSP 容器每分钟获取一次，并写入编辑文件旁边。',
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
		title: '核心',
		items: [
			{
				id: 'users',
				label: '用户',
				aiId: 'instance-settings-users',
				aiDescription: '实例用户设置'
			},
			{
				id: 'general',
				label: '通用',
				aiId: 'instance-settings-general',
				aiDescription: '实例通用设置'
			},
			{
				id: 'jobs',
				label: '任务',
				aiId: 'instance-settings-jobs',
				aiDescription: '实例任务设置'
			}
		]
	},
	{
		title: '认证',
		items: [
			{
				id: 'sso',
				label: 'SSO',
				aiId: 'instance-settings-sso',
				aiDescription: '实例 SSO 设置'
			},
			{
				id: 'oauth',
				label: 'OAuth',
				aiId: 'instance-settings-oauth',
				aiDescription: '实例 OAuth 设置'
			}
		]
	},
	{
		title: '基础设施',
		items: [
			{
				id: 'smtp',
				label: 'SMTP',
				aiId: 'instance-settings-smtp',
				aiDescription: '实例 SMTP 设置'
			},
			{
				id: 'registries',
				label: '依赖源',
				aiId: 'instance-settings-registries',
				aiDescription: '实例依赖源设置'
			}
		]
	},
	{
		title: '监控',
		items: [
			{
				id: 'webhooks',
				label: 'Webhooks',
				aiId: 'instance-settings-webhooks',
				aiDescription: '实例事件 Webhook 设置'
			},
			{
				id: 'db_health',
				label: '数据库健康',
				aiId: 'instance-settings-db-health',
				aiDescription: '数据库健康诊断和性能分析'
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
				aiDescription: '实例 AI 设置（供应商、模型、提示词）'
			}
		]
	},
	{
		title: '高级',
		items: [
			{
				id: 'telemetry',
				label: '遥测',
				aiId: 'instance-settings-telemetry',
				aiDescription: '实例遥测设置',
				showIf: false
			},
			{
				id: 'secret_storage',
				label: '密钥存储',
				aiId: 'instance-settings-secret-storage',
				aiDescription: '实例密钥存储设置',
				showIf: false
			},
			{
				id: 'websocket',
				label: 'WebSocket',
				aiId: 'instance-settings-websocket',
				aiDescription: 'WebSocket 连接测试和地址覆盖'
			},
			{
				id: 'lsp',
				label: 'LSP',
				aiId: 'instance-settings-lsp',
				aiDescription: '语言服务协议设置（Ruff 配置、编辑器检查）'
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
	const visibleTabIds = new Set(
		navigationGroups.flatMap((group) =>
			group.items.filter((item) => item.showIf !== false).map((item) => item.id)
		)
	)

	// Add sidebar navigation items (tab-level)
	for (const group of navigationGroups) {
		for (const navItem of group.items.filter((item) => item.showIf !== false)) {
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

	return items
}

/** Registry settings that support per-workspace overrides. Excludes instance_python_version, uv_index_strategy, and uv_python_install_mirror which are instance-wide only. */
export const WORKSPACE_REGISTRY_SETTINGS: Setting[] = settings['Registries'].filter(
	(s) =>
		s.key !== 'instance_python_version' &&
		s.key !== 'uv_index_strategy' &&
		s.key !== 'uv_python_install_mirror'
)
