const APP_NAME = '部门工具平台'

const SKIP_SELECTOR = [
	'script',
	'style',
	'textarea',
	'pre',
	'code',
	'kbd',
	'samp',
	'svg',
	'canvas',
	'.monaco-editor',
	'.cm-editor',
	'[contenteditable="true"]'
].join(',')

const exactTranslations: Record<string, string> = {
	Windmill: APP_NAME,
	Home: '首页',
	Runs: '运行记录',
	Run: '运行',
	Running: '运行中',
	Queued: '排队中',
	Completed: '已完成',
	Failed: '失败',
	Success: '成功',
	Skipped: '已跳过',
	Cancelled: '已取消',
	Cancel: '取消',
	Retry: '重试',
	Restart: '重启',
	Resume: '继续',
	Approve: '批准',
	Reject: '拒绝',
	Scripts: '脚本',
	Script: '脚本',
	Flows: '流程',
	Flow: '流程',
	Apps: '应用',
	App: '应用',
	Resources: '资源',
	Resource: '资源',
	Variables: '变量',
	Variable: '变量',
	Groups: '用户组',
	Group: '用户组',
	Users: '用户',
	User: '用户',
	'User profile': '用户资料',
	Folders: '文件夹',
	Folder: '文件夹',
	Settings: '设置',
	Workspace: '工作空间',
	Workspaces: '工作空间',
	'Workspace Selection': '选择工作空间',
	'Select a workspace': '选择工作空间',
	'List all workspaces as superadmin': '以超级管理员身份列出所有工作空间',
	'as superadmin': '超级管理员',
	as: '身份：',
	superadmin: '超级管理员',
	'Show workspace forks': '显示工作空间分支',
	'Invites to join a Workspace': '工作空间邀请',
	"You don't have new invites at the moment.": '当前没有新的邀请。',
	'+ Create a new workspace': '+ 创建新的工作空间',
	'Create a new workspace': '创建新的工作空间',
	Admins: '管理员空间',
	admins: '管理员空间',
	'Workspace settings': '工作空间设置',
	'Workspace Settings': '工作空间设置',
	'Instance settings': '实例设置',
	'Instance Settings': '实例设置',
	'User settings': '用户设置',
	'User Settings': '用户设置',
	'Account settings': '账号设置',
	'Admin of this workspace': '此工作空间管理员',
	'Operator in this workspace': '此工作空间操作员',
	'Switch theme': '切换主题',
	'All workspaces': '全部工作空间',
	Account: '账号',
	Instance: '实例',
	'Operator settings': '操作员设置',
	'Git sync': 'Git 同步',
	'Git & deployment': 'Git 与部署',
	'Deployment UI': '部署界面',
	'Rulesets': '规则集',
	'Integrations': '集成',
	'Native triggers': '原生触发器',
	'Hooks': '钩子',
	'Error / success handler': '错误/成功处理器',
	'Data & storage': '数据与存储',
	'Data tables': '数据表',
	'Object storage (S3)': '对象存储 (S3)',
	'Volumes': '数据卷',
	'Shared UI folder': '共享 UI 文件夹',
	'Dependencies': '依赖',
	'Encryption': '加密',
	'Trashbin': '回收站',
	Schedules: '定时任务',
	Schedule: '定时任务',
	Triggers: '触发器',
	Trigger: '触发器',
	'Webhooks': 'Webhook',
	'HTTP routes': 'HTTP 路由',
	'Kafka triggers': 'Kafka 触发器',
	'NATS triggers': 'NATS 触发器',
	'MQTT triggers': 'MQTT 触发器',
	'Postgres triggers': 'Postgres 触发器',
	'Email triggers': '邮件触发器',
	'Websocket triggers': 'WebSocket 触发器',
	'Audit logs': '审计日志',
	'Service logs': '服务日志',
	'Workers': '执行节点',
	'Worker groups': '执行节点组',
	Assets: '资产',
	Asset: '资产',
	'Critical alerts': '重要告警',
	'Tutorials': '教程',
	'Quickstart': '快速入门',
	'App Editor': '应用编辑器',
	'Workspace onboarding': '工作空间入门',
	'Build a flow': '构建流程',
	'Fix a broken flow': '修复异常流程',
	'Discover your monitoring dashboard': '了解监控看板',
	'Background runnables': '后台运行项',
	'Connection': '组件连接',
	'Coming soon': '即将推出',
	'(Coming soon)': '（即将推出）',
	'Not started': '未开始',
	'Mark as completed': '标记为已完成',
	'Mark all as completed': '全部标记为已完成',
	'Mark all tutorials as completed': '将全部教程标记为已完成',
	'Mark this tutorial as completed': '将此教程标记为已完成',
	'Reset all': '全部重置',
	'View as an': '预览角色',
	'Admin (me)': '管理员（我）',
	'View tutorials as yourself (admin)': '以当前管理员身份查看教程',
	'Preview tutorials visible to developers': '预览开发者可见的教程',
	'Preview tutorials visible to operators': '预览操作员可见的教程',
	'No tutorials available for this section yet.': '此栏目暂时没有可用教程。',
	'No tutorials available for now. Coming soon.': '当前暂时没有可用教程，敬请期待。',
	'New tutorial available!': '有新的教程可用！',
	'Continue your learning journey and master new Windmill skills.': '继续学习并掌握更多平台使用技巧。',
	'Skip tutorials': '跳过教程',
	'Progress': '进度',
	'Step': '步骤',
	'Documentation': '文档',
	'Docs': '文档',
	'Hub': '插件中心',
	'Search': '搜索',
	'Search...': '搜索...',
	'Search or type `?` for search options': '搜索，或输入 `?` 查看搜索选项',
	'Go to Home': '前往首页',
	'Go to Runs': '前往运行记录',
	'Go to Variables': '前往变量',
	'Go to Resources': '前往资源',
	'Go to Schedules': '前往定时任务',
	'Go to HTTP routes': '前往 HTTP 路由',
	'Go to WebSockets': '前往 WebSocket 触发器',
	'Search across completed runs': '搜索已完成运行记录',
	'Search scripts/flows/apps based on content': '按内容搜索脚本、流程和应用',
	'Flows/Scripts/Apps': '流程/脚本/应用',
	'Explore windmill service logs': '查看服务日志',
	'Explore Windmill service logs': '查看服务日志',
	'New': '新建',
	'Create': '创建',
	'Add': '添加',
	'Edit': '编辑',
	'View': '查看',
	'Delete': '删除',
	'Remove': '移除',
	'Save': '保存',
	'Saved': '已保存',
	'Deploy': '发布',
	'Deploy to prod/staging': '发布到生产/预发',
	'Import': '导入',
	'Export': '导出',
	'Download': '下载',
	'Upload': '上传',
	'Copy': '复制',
	'Copied': '已复制',
	'Paste': '粘贴',
	'Duplicate': '复制一份',
	'Archive': '归档',
	'Restore': '恢复',
	'Refresh': '刷新',
	'Reload': '重新加载',
	'Open': '打开',
	'Close': '关闭',
	'Back': '返回',
	'Next': '下一步',
	'Previous': '上一步',
	'Submit': '提交',
	'Confirm': '确认',
	'Continue': '继续',
	'Clear': '清空',
	'Reset': '重置',
	'Apply': '应用',
	'Filter': '筛选',
	'Filters': '筛选',
	'Sort': '排序',
	'Name': '名称',
	'Path': '路径',
	'Type': '类型',
	'Language': '语言',
	'Description': '说明',
	'Summary': '摘要',
	'Owner': '负责人',
	'Author': '作者',
	'Status': '状态',
	'Result': '结果',
	'Results': '结果',
	'Logs': '日志',
	'Details': '详情',
	'History': '历史',
	'Version': '版本',
	'Created': '已创建',
	'Created at': '创建时间',
	'Created At': '创建时间',
	'Updated': '已更新',
	'Updated at': '更新时间',
	'Edited': '已编辑',
	'Edited at': '编辑时间',
	'Last edited': '最后编辑',
	'Last run': '最近运行',
	'Started at': '开始时间',
	'Duration': '耗时',
	'Concurrency': '并发',
	'Triggered by': '触发者',
	'Tag': '标签',
	'Actions': '操作',
	'Permission': '权限',
	'Permissions': '权限',
	'Role': '角色',
	'Roles': '角色',
	'Admin': '管理员',
	'Operator': '操作员',
	'Viewer': '查看者',
	'Developer': '开发者',
	'Member': '成员',
	'Members': '成员',
	'Members (0)': '成员 (0)',
	'Email': '邮箱',
	'Username': '用户名',
	'User info': '用户信息',
	'AI user settings': 'AI 用户设置',
	'Metadata completion': '元数据补全',
	'Flow step input completion': '流程步骤输入补全',
	'Configure AI prompts': '配置 AI 提示词',
	'workspace-level prompts': '工作空间级提示词',
	'Customize AI System Prompts': '自定义 AI 系统提示词',
	'Script Mode': '脚本模式',
	'Flow Mode': '流程模式',
	'App Mode': '应用模式',
	'Navigator Mode': '导航模式',
	'API Mode': 'API 模式',
	'Global Mode': '全局模式',
	'Ask Mode': '问答模式',
	'AI settings': 'AI 设置',
	'Save Prompts': '保存提示词',
	'No workspace prompt configured.': '尚未配置工作空间提示词。',
	'Tokens': '令牌',
	'Add a new token': '添加新令牌',
	'Generate MCP URL': '生成 MCP URL',
	'Limit token permissions': '限制令牌权限',
	'Label': '标签',
	'Prefix': '前缀',
	'Expiration': '过期时间',
	'Scopes': '权限范围',
	'Expires In': '过期时间',
	'No expiration': '永不过期',
	'New token': '新建令牌',
	'Edit token': '编辑令牌',
	'Read-only': '只读',
	'Token updated': '令牌已更新',
	'System token labels can\'t be changed.': '系统令牌标签不能修改。',
	'Executions (1w)': '执行次数 (1 周)',
	'Executions (': '执行次数 (',
	'1w': '1 周',
	'1w)': '1 周)',
	'Filter members': '筛选成员',
	'Popup button': '更多操作',
	'Toggle button group': '切换按钮组',
	'Password': '密码',
	'Login': '登录',
	'Log in': '登录',
	'Log in or sign up': '登录或注册',
	'Log in or sign up with any of the methods below': '请选择下面任意一种方式登录或注册',
	'Sign in': '登录',
	'Sign up': '注册',
	'Sign out': '退出登录',
	'Logout': '退出登录',
	'Log out': '退出登录',
	'Forgot password?': '忘记密码？',
	'Reset password': '重置密码',
	'Change password': '修改密码',
	'Set password': '设置密码',
	'User AI prompts saved': '用户 AI 提示词已保存',
	'Reset to last saved state': '已重置为上次保存的状态',
	'Welcome': '欢迎',
	'Welcome back': '欢迎回来',
	'Welcome to 部门工具平台': '欢迎使用部门工具平台',
	'Welcome! Default credentials admin@windmill.dev / changeme have been prefilled.':
		'欢迎！默认账号 admin@windmill.dev / changeme 已自动填入。',
	'Configure your instance settings to get started. You can use the quick setup for essential settings or the advanced setup for full control.':
		'请先配置实例设置。你可以使用快速设置完成必要配置，也可以使用高级设置进行完整配置。',
	'Configure your instance settings to get started.': '请先配置实例设置。',
	'Windmill uses its own authentication by default. SSO configuration is optional and can be set up later.':
		'部门工具平台默认使用内置认证。SSO 配置是可选项，也可以稍后再设置。',
	'部门工具平台 uses its own authentication by default. SSO configuration is optional and can be set up later.':
		'部门工具平台默认使用内置认证。SSO 配置是可选项，也可以稍后再设置。',
	'You can use the quick setup for essential settings': '你可以使用快速设置完成必要配置',
	'or the advanced setup for full control.': '也可以使用高级设置进行完整配置。',
	'First Time Setup': '首次设置',
	'Quick setup': '快速设置',
	'Advanced setup': '高级设置',
	'Skip': '跳过',
	'Loading': '加载中',
	'Loading...': '加载中...',
	'No results': '无结果',
	'No data': '暂无数据',
	'No jobs found for the selected filters.': '未找到符合当前筛选条件的任务。',
	'No variables found': '未找到变量',
	'No resources found': '未找到资源',
	'No assets found': '未找到资产',
	'No data table yet': '还没有数据表',
	'No object storage yet': '还没有对象存储',
	'No ducklake yet': '还没有 Ducklake',
	'Nothing found': '未找到内容',
	'Error': '错误',
	'Warning': '警告',
	'Info': '信息',
	'Help': '帮助',
	'Ask AI': '问 AI',
	'AI chat': 'AI 对话',
	Chat: '对话',
	'New chat': '新对话',
	Send: '发送',
	'Navigate Windmill UI...': '描述你要完成的操作...',
	'Navigate 部门工具平台 UI...': '描述你要完成的操作...',
	'You can use ⌘L to open or close this chat, and ⌘K in the script editor to modify selected lines.':
		'你可以使用 ⌘L 打开或关闭此对话，在脚本编辑器中使用 ⌘K 修改选中的代码行。',
	'workspace settings': '工作空间设置',
	'Folders & Groups': '文件夹与用户组',
	'Admins workspace': '管理员工作空间',
	'Learn with interactive tutorials': '通过交互式教程学习',
	'Get started quickly with step-by-step guides on building flows, scripts, and more.':
		'通过分步指南快速了解如何构建流程、脚本等内容。',
	'View tutorials': '查看教程',
	'Dismiss tutorial banner': '关闭教程提示',
	'Search Scripts, Flows & Apps': '搜索脚本、流程和应用',
	'New variable': '新建变量',
	'New Variable': '新建变量',
	'New variable ': '新建变量',
	Contextual: '上下文变量',
	Deps: '依赖',
	'1000 / page': '每页 1000 条',
	'All workspace assets': '全部工作空间资产',
	reports: '报告',
	native: '原生',
	'Autoscaling events': '自动扩缩容事件',
	'Add resource type': '添加资源类型',
	'Add resource': '添加资源',
	'Resource Types': '资源类型',
	'States': '状态',
	'Cache': '缓存',
	'Theme': '主题',
	'Pipelines': '流水线',
	'Data table': '数据表',
	'Object storage': '对象存储',
	'See documentation': '查看文档',
	'Latest assets used': '最近使用的资产',
	'Asset name': '资产名称',
	'Latest runs': '最近运行',
	'Batch actions': '批量操作',
	'Auto-refresh': '自动刷新',
	'Show schedules': '显示定时任务',
	'Show future jobs': '显示未来任务',
	'Manage tags': '管理标签',
	'Queue metrics': '队列指标',
	'New agent worker': '新建代理执行节点',
	'New group config': '新建组配置',
	'Worker group:': '执行节点组：',
	'Delete config': '删除配置',
	'Clean cache': '清理缓存',
	'Restart workers': '重启执行节点',
	'Edit config': '编辑配置',
	'Active workers': '活跃执行节点',
	'Worker': '执行节点',
	'Worker start': '执行节点启动时间',
	'Jobs ran': '已运行任务',
	'Last job': '最近任务',
	'Occupancy rate(15s/5m/30m/ever)': '占用率 (15 秒/5 分钟/30 分钟/累计)',
	'Occupancy rate(': '占用率 (',
	'15s/5m/30m/ever)': '15 秒/5 分钟/30 分钟/累计)',
	'Memory usage(部门工具平台)': '内存使用 (部门工具平台)',
	'Memory usage(': '内存使用 (',
	'Limits': '限制',
	'Repl': '交互终端',
	'Open repl': '打开交互终端',
	'Alive': '在线',
	'Host:': '主机：',
	'IP:': 'IP：',
	'Create a new flow': '创建新流程',
	'Flow Editor': '流程编辑器',
	'Workflow-as-Code': '代码化工作流',
	'Choose your app builder': '选择应用构建方式',
	'Low-code App': '低代码应用',
	'Full-code App': '全代码应用',
	'Default chat model': '默认对话模型',
	'Select a default model': '选择默认模型',
	'Metadata generation model': '元数据生成模型',
	'Use default chat model': '使用默认对话模型',
	'Code completion': '代码补全',
	'Enable code completion': '启用代码补全',
	'Custom system prompts': '自定义系统提示词',
	'Recommended': '推荐',
	'Core': '核心',
	'Authentication': '认证',
	'Root login & Resource Types': '根账号登录与资源类型',
	'1. Core': '1. 核心',
	'2. Authentication': '2. 认证',
	'4. Root login & Resource Types': '4. 根账号登录与资源类型',
	'Base url': '基础 URL',
	'License key': '许可证密钥',
	'Test key': '测试密钥',
	'Email domain': '邮箱域名',
	'Job isolation': '任务隔离',
	'Retention period in secs': '保留周期（秒）',
	'Instance object storage': '实例对象存储',
	'set object store': '设置对象存储',
	'Single Sign-On': '单点登录',
	'Limited to 10 SSO users': 'SSO 用户限制为 10 个',
	'Add custom SSO client (requires ee)': '添加自定义 SSO 客户端（需要企业版）',
	'Disable password login': '禁用密码登录',
	'Auto-login SSO provider': '自动登录 SSO 提供方',
	'Resource types': '资源类型',
	'Sync from hub': '从插件中心同步',
	'AI Providers': 'AI 提供方',
	'Custom AI': '自定义 AI',
	'Save AI settings': '保存 AI 设置',
	'Superadmin login': '超级管理员登录',
	'Current email: admin@windmill.dev': '当前邮箱：admin@windmill.dev',
	'Enter password': '输入密码',
	'Cached resource types synced': '已同步缓存的资源类型',
	'Sync latest from hub': '从插件中心同步最新版本',
	'Sync resource types every day': '每天同步资源类型',
	'Set account & finish': '设置账号并完成',
	'Fetches the latest resource types directly from the Windmill Hub (requires internet access).':
		'直接从部门工具平台插件中心拉取最新资源类型（需要互联网访问）。',
	'Fetches the latest resource types directly from the 部门工具平台 Hub (requires internet access).':
		'直接从部门工具平台插件中心拉取最新资源类型（需要互联网访问）。',
	'Save & Next': '保存并下一步',
	'Skip setup': '跳过设置',
	Content: '内容',
	'Tree view': '树形视图',
	'Only f/*': '仅 f/*',
	'Learn more': '了解更多',
	'More': '更多',
	'Advanced': '高级',
	'General': '通用',
	'Security': '安全',
	'Secrets': '密钥',
	'Teams': '团队',
	'Tags': '标签',
	'Favorites': '收藏',
	'Favorite': '收藏',
	'Draft': '草稿',
	'Drafts': '草稿',
	'Publish': '发布',
	'Unpublish': '取消发布',
	'Public': '公开',
	'Private': '私有',
	'Enabled': '已启用',
	'Disabled': '已禁用',
	'Enable': '启用',
	'Disable': '禁用',
	'Active': '启用',
	'Inactive': '停用',
	'Yes': '是',
	'No': '否',
	'True': '是',
	'False': '否',
	'Today': '今天',
	'Yesterday': '昨天',
	'Tomorrow': '明天',
	'All': '全部',
	'None': '无',
	'Default': '默认',
	'Light mode': '浅色模式',
	'Dark mode': '深色模式',
	'Custom': '自定义',
	'Required': '必填',
	'Optional': '可选',
	'Input': '输入',
	'Output': '输出',
	'Inputs': '输入',
	'Outputs': '输出',
	'Parameters': '参数',
	'Arguments': '参数',
	'Preview': '预览',
	'Code': '代码',
	'Editor': '编辑器',
	'Builder': '构建器',
	'Graph': '图表',
	'Table': '表格',
	'JSON': 'JSON',
	'Python': 'Python',
	'Bash': 'Bash',
	'TypeScript': 'TypeScript',
	'JavaScript': 'JavaScript'
}

const phraseTranslations: Array<[RegExp, string]> = [
	[/Search or type `\?` for search options/g, '搜索，或输入 `?` 查看搜索选项'],
	[/Go to Home/g, '前往首页'],
	[/Go to Runs/g, '前往运行记录'],
	[/Go to Variables/g, '前往变量'],
	[/Go to Resources/g, '前往资源'],
	[/Go to Schedules/g, '前往定时任务'],
	[/Go to Scripts/g, '前往脚本'],
	[/Go to Flows/g, '前往流程'],
	[/Go to Apps/g, '前往应用'],
	[/Go to Workers/g, '前往执行节点'],
	[/Go to HTTP routes/g, '前往 HTTP 路由'],
	[/Go to WebSockets/g, '前往 WebSocket 触发器'],
	[/Go to Workspace settings/g, '前往工作空间设置'],
	[/Go to Instance settings/g, '前往实例设置'],
	[/Go to (.+) triggers/g, '前往 $1 触发器'],
	[/Explore windmill service logs/gi, '查看服务日志'],
	[/Search '(.+)' in (Windmill|部门工具平台)'s service logs/g, '在服务日志中搜索“$1”'],
	[/Service logs are only available to superadmins(?: \(or devops\))?/g, '服务日志仅超级管理员或运维角色可用'],
	[/Search across completed runs(?: \(EE\))?/g, '搜索已完成运行记录'],
	[/Search scripts\/flows\/apps based on content/g, '按内容搜索脚本、流程和应用'],
	[/Search flows\/scripts\/apps by content/g, '按内容搜索流程、脚本和应用'],
	[/Flows\/Scripts\/Apps/g, '流程/脚本/应用'],
	[/Admin of this workspace/g, '此工作空间管理员'],
	[/Operator in this workspace/g, '此工作空间操作员'],
	[/Switch theme/g, '切换主题'],
	[/All workspaces/g, '全部工作空间'],
	[/User info/g, '用户信息'],
	[/AI user settings/g, 'AI 用户设置'],
	[/Metadata completion/g, '元数据补全'],
	[/Flow step input completion/g, '流程步骤输入补全'],
	[/Configure AI prompts/g, '配置 AI 提示词'],
	[/workspace-level prompts/g, '工作空间级提示词'],
	[
		/Customize AI behavior with system prompts\. These are stored locally in your browser and apply in addition to\s*\.?/g,
		'通过系统提示词自定义 AI 行为。这些提示词保存在你的浏览器本地，并会与工作空间级提示词一起生效。'
	],
	[
		/Authenticate to the 部门工具平台 API with access tokens\./g,
		'使用访问令牌认证部门工具平台 API。'
	],
	[/Add a new token/g, '添加新令牌'],
	[/Generate MCP URL/g, '生成 MCP URL'],
	[/Create a new MCP token to authenticate to the (Windmill|部门工具平台) API/g, '创建新的 MCP 令牌，用于认证部门工具平台 API'],
	[/Generate a new MCP URL to make your scripts, flows, and API endpoints available as tools through your LLM clients\./g, '生成新的 MCP URL，让你的脚本、流程和 API 端点可以作为工具供 LLM 客户端使用。'],
	[/Limit token permissions/g, '限制令牌权限'],
	[
		/Restricts this token to GET\/HEAD endpoints\. Any mutating request \(POST\/PUT\/PATCH\/DELETE\) or job-run action will be rejected with 403, regardless of the scopes listed above\./g,
		'将此令牌限制为只能访问 GET/HEAD 接口。无论上方权限范围如何，任何修改请求（POST/PUT/PATCH/DELETE）或任务运行操作都会以 403 拒绝。'
	],
	[/Label\s*\(optional\)/g, '标签（可选）'],
	[/Expires In\s*\(optional\)/g, '过期时间（可选）'],
	[/\(optional\)/g, '（可选）'],
	[/No expiration/g, '永不过期'],
	[/New token/g, '新建令牌'],
	[/Edit token/g, '编辑令牌'],
	[/Ephemeral lsp token/g, '临时 LSP 令牌'],
	[/\bsession\b/g, '会话'],
	[
		/Learn how to use (Windmill|部门工具平台) with our interactive tutorials/g,
		'通过交互式教程学习如何使用部门工具平台'
	],
	[
		/Discover the basics of (Windmill|部门工具平台) with a quick tour of the workspace\./g,
		'通过快速导览了解工作空间的基础用法。'
	],
	[
		/Learn how to build workflows in (Windmill|部门工具平台) with our interactive tutorial\./g,
		'通过交互式教程学习如何构建工作流。'
	],
	[/Learn how to monitor and debug your script and flow executions\./g, '学习如何监控和调试脚本、流程的执行结果。'],
	[
		/Learn how to monitor, filter, and manage your script and flow executions\./g,
		'学习如何监控、筛选和管理脚本与流程执行记录。'
	],
	[/Learn how to create and use background runnables in your apps\./g, '学习如何在应用中创建和使用后台运行项。'],
	[/Learn how to connect component inputs to outputs in your apps\./g, '学习如何把应用中的组件输入连接到输出。'],
	[/This allows you to see which tutorials your team members can access/g, '用于查看团队成员在不同角色下可访问的教程'],
	[/Progress:\s*(\d+) of (\d+) tutorials completed/g, '进度：已完成 $1 / $2 个教程'],
	[/Step\s+(\d+)\s+of\s+(\d+)/g, '第 $1 / $2 步'],
	[/UI is not interactive during tutorial, press next at every step/g, '教程进行时界面不可直接操作，请在每一步点击下一步'],
	[/You can use the arrow keys to navigate/g, '你也可以使用方向键切换步骤'],
	[
		/You can still access tutorials from the Tutorials page in the main menu or in the Help submenu\./g,
		'你仍然可以从主菜单的“教程”页面或“帮助”子菜单访问教程。'
	],
	[/Previous is not available for this step/g, '此步骤不能返回上一步'],
	[/Please wait\.\.\./g, '请稍候...'],
	[/Please wait for the input to be filled\.\.\./g, '请等待输入自动填充完成...'],
	[/Please wait for the script to be created\.\.\./g, '请等待脚本创建完成...'],
	[/Please wait for the code to finish typing\.\.\./g, '请等待代码自动输入完成...'],
	[/Please wait for the test to complete\.\.\./g, '请等待测试完成...'],
	[/Please wait for the summaries to be added\.\.\./g, '请等待摘要添加完成...'],
	[/Please wait for the job click to complete\.\.\./g, '请等待任务点击完成...'],
	[/Please wait for the chart switch to complete\.\.\./g, '请等待图表切换完成...'],
	[/Please wait for the filter clicks to complete\.\.\./g, '请等待筛选点击完成...'],
	[/Welcome to your (Windmill|部门工具平台) workspace! 🎉/g, '欢迎来到你的工作空间！🎉'],
	[/Welcome to Windmill! 🎉/g, '欢迎使用部门工具平台！🎉'],
	[/Let's take a quick tour! We will show you the main sections of your workspace\./g, '我们快速浏览一下工作空间的主要区域。'],
	[/Let's take a quick tour! We'll show you the three main tools you can use: Scripts, Flows, and Apps\./g, '我们快速看一下你会用到的三个主要工具：脚本、流程和应用。'],
	[/Create your first script/g, '创建第一个脚本'],
	[/Create your first flow/g, '创建第一个流程'],
	[/Create your first app/g, '创建第一个应用'],
	[/Scripts - Run automated tasks/g, '脚本：运行自动化任务'],
	[/Flows - Run step-by-step processes/g, '流程：运行多步骤处理'],
	[/Apps - Use custom tools/g, '应用：使用自定义工具'],
	[/Finally, the Menu section/g, '最后看看菜单区域'],
	[/Runnable panel/g, '运行项面板'],
	[/Create a runnable/g, '创建运行项'],
	[/Empty runnable panel/g, '空运行项面板'],
	[/Backend runnables/g, '后端运行项'],
	[/Frontend runnables/g, '前端运行项'],
	[/Connection tutorial/g, '组件连接教程'],
	[/Data source/g, '数据源'],
	[/Connect the text component/g, '连接文本组件'],
	[/Select the output/g, '选择输出'],
	[/Click on the output/g, '点击输出'],
	[/Connection done/g, '连接完成'],
	[/Expression evaluation tutorial/g, '表达式判断教程'],
	[/Build your first flow/g, '构建第一个流程'],
	[/Set the input/g, '设置输入'],
	[/Choose TypeScript/g, '选择 TypeScript'],
	[/Add validation logic/g, '添加校验逻辑'],
	[/Wire it up and test/g, '连接输入并测试'],
	[/Add the final steps/g, '添加最后两个步骤'],
	[/Ready to test!/g, '可以开始测试了！'],
	[/🛠️ Troubleshoot a broken flow/g, '🛠️ 排查异常流程'],
	[/Test our flow/g, '测试流程'],
	[/Run the flow/g, '运行流程'],
	[/Review the error/g, '查看错误'],
	[/Explore the tabs/g, '查看标签页'],
	[/Inspect the flow graph/g, '检查流程图'],
	[/Error spotted!/g, '发现错误！'],
	[/Your turn now!/g, '现在轮到你操作了！'],
	[/Welcome to your Monitoring Dashboard!/g, '欢迎来到监控看板！'],
	[/Exploring successful job runs/g, '查看成功执行的任务'],
	[/Exploring failed job runs/g, '查看失败执行的任务'],
	[/Visual run history/g, '可视化运行历史'],
	[/Switching chart views/g, '切换图表视图'],
	[/Filtering jobs date, kind, status/g, '按日期、类型和状态筛选任务'],
	[/More filtering options/g, '更多筛选选项'],
	[/Tutorial complete! 🎉/g, '教程完成！🎉'],
	[/Want to learn more\?/g, '想继续学习？'],
	[/Access more tutorials from the Tutorials page in the main menu or in the Help submenu\./g, '你可以从主菜单的“教程”页面，或“帮助”子菜单访问更多教程。'],
	[/Access more tutorials from the Tutorials page in the main menu\./g, '你可以从主菜单的“教程”页面访问更多教程。'],
	[/Tutorial: Simple Hello World Flow/g, '教程：简单问候流程'],
	[/Tutorial: Broken Flow Example/g, '教程：异常流程示例'],
	[/A simple flow created for the runs tutorial/g, '为运行记录教程创建的简单流程'],
	[/A flow that intentionally fails to demonstrate error handling/g, '用于演示错误处理的故障流程'],
	[/Say hello/g, '输出问候'],
	[/Throw error/g, '抛出错误'],
	[/Temperature Converter/g, '温度转换器'],
	[/Convert Celsius to Fahrenheit and categorize the temperature/g, '将摄氏度转换为华氏度并进行温度分类'],
	[/Validate temperature input/g, '校验温度输入'],
	[/Convert to Fahrenheit/g, '转换为华氏度'],
	[/Categorize temperature/g, '温度分类'],
	[/Temperature in Celsius/g, '摄氏温度'],
	[
		/The Admins workspace is for admins only and contains scripts whose purpose is to manage your Windmill instance, such as keeping resource types up to date\./g,
		'管理员工作空间仅供管理员使用，里面包含用于管理实例的脚本，例如保持资源类型为最新状态。'
	],
	[
		/The Admins workspace is reserved for superadmins\. Only users with superadmin privileges can access it\. Members cannot be manually added or invited to this workspace\./g,
		'管理员工作空间仅供超级管理员使用。只有拥有超级管理员权限的用户才能访问。不能手动向该工作空间添加或邀请成员。'
	],
	[
		/Configure your instance settings to get started\. You can use the quick setup for essential settings or the advanced setup for full control\./g,
		'请先配置实例设置。你可以使用快速设置完成必要配置，也可以使用高级设置进行完整配置。'
	],
	[
		/(Windmill|部门工具平台) uses its own authentication by default\. SSO configuration is optional and can be set up later\./g,
		'部门工具平台默认使用内置认证。SSO 配置是可选项，也可以稍后再设置。'
	],
	[
		/uses its own authentication by default\. SSO configuration is optional and can be set up later\./g,
		'默认使用内置认证。SSO 配置是可选项，也可以稍后再设置。'
	],
	[
		/Configure SSO providers to let users authenticate using their existing identity provider credentials\. To test SSO, save the settings and try to login in an incognito window\./g,
		'配置 SSO 提供方，让用户使用已有身份提供方凭据登录。测试 SSO 时，请先保存设置，再用无痕窗口尝试登录。'
	],
	[
		/Without EE, the number of SSO users is limited to 10\. SCIM\/SAML is available on EE/g,
		'未使用企业版时，SSO 用户数量限制为 10 个。SCIM/SAML 仅企业版可用。'
	],
	[
		/Require users to have been added manually to (Windmill|部门工具平台) to sign in through SSO/g,
		'要求用户必须先被手动添加到部门工具平台，才能通过 SSO 登录。'
	],
	[
		/Hide the email\/password form on the login page and reject password login requests\. Use when you only want OAuth\/SAML logins\./g,
		'隐藏登录页上的邮箱/密码表单，并拒绝密码登录请求。仅允许 OAuth/SAML 登录时使用。'
	],
	[
		/AI providers require their resource types\. Sync from the Hub if they are missing\./g,
		'AI 提供方需要对应的资源类型。如有缺失，请从插件中心同步。'
	],
	[
		/(Windmill|部门工具平台) AI integrates with your favorite AI providers and models\. Set your AI settings at the instance level to be able to use them on all your workspaces\. Workspace-level settings can override these\./g,
		'部门工具平台 AI 可集成常用 AI 提供方和模型。在实例级设置 AI 后，所有工作空间都可以使用；工作空间级设置可以覆盖这些配置。'
	],
	[
		/Used for automatic summaries, descriptions, and tool names\. If unset, the default chat model is used\./g,
		'用于自动生成摘要、说明和工具名称。未设置时使用默认对话模型。'
	],
	[
		/Customize AI behavior with instance-level system prompts\. These apply when a workspace uses instance AI defaults\./g,
		'通过实例级系统提示词自定义 AI 行为。当工作空间使用实例 AI 默认配置时，这些提示词会生效。'
	],
	[
		/Replace the default superadmin account with a secure email and password\./g,
		'将默认超级管理员账号替换为安全的邮箱和密码。'
	],
	[
		/Resource types bundled with the Docker image are synced automatically\. You can also fetch the latest from the hub\./g,
		'Docker 镜像内置的资源类型会自动同步。你也可以从插件中心拉取最新版本。'
	],
	[/Synced (\d+) resource types \((\d+) unchanged\)/g, '已同步 $1 个资源类型（$2 个未变化）'],
	[
		/Fetches the latest resource types directly from the (Windmill|部门工具平台) Hub \(requires internet access\)\./g,
		'直接从部门工具平台插件中心拉取最新资源类型（需要互联网访问）。'
	],
	[/Fetches the latest resource types directly from the\s*/g, '直接从'],
	[/Hub \(requires internet access\)\./g, '插件中心拉取最新资源类型（需要互联网访问）。'],
	[
		/The daily schedule synchronizes resource types from the Hub every day at midnight UTC\./g,
		'每日定时任务会在 UTC 时间每天午夜从插件中心同步资源类型。'
	],
	[/First Time Setup/g, '首次设置'],
	[/Workspace Selection/g, '选择工作空间'],
	[/Workspace Settings/g, '工作空间设置'],
	[/Workspace settings: (.+)/g, '工作空间设置：$1'],
	[/Instance Settings/g, '实例设置'],
	[/User Settings/g, '用户设置'],
	[/Account Settings/g, '账号设置'],
	[/Log in(?= \|)/g, '登录'],
	[/Logged in as (.+)/g, '当前登录：$1'],
	[/as superadmin 用于管理部门工具平台实例/g, '超级管理员，用于管理部门工具平台实例'],
	[/as superadmin/g, '超级管理员'],
	[/as\s+superadmin/g, '超级管理员'],
	[/\+\s*Create\s+a\s+new\s+workspace/g, '+ 创建新的工作空间'],
	[/New variable/g, '新建变量'],
	[/\badmins\b/g, '管理员空间'],
	[/\bWindmill\b/g, APP_NAME],
	[/Used to manage your 部门工具平台 instance/g, '用于管理部门工具平台实例'],
	[/Admins workspace/g, '管理员工作空间'],
	[/admins workspace/g, '管理员工作空间'],
	[
		/The Admins workspace is for admins only and contains scripts whose purpose is to manage your 部门工具平台 instance, such as keeping resource types up to date\./g,
		'管理员工作空间仅供管理员使用，里面包含用于管理部门工具平台实例的脚本，例如保持资源类型为最新状态。'
	],
	[
		/The 管理员工作空间 is for admins only and contains scripts whose purpose is to manage your 部门工具平台 instance, such as keeping resource types up to date\./g,
		'管理员工作空间仅供管理员使用，里面包含用于管理部门工具平台实例的脚本，例如保持资源类型为最新状态。'
	],
	[
		/The 管理员工作空间 is for 管理员空间 only and contains scripts whose purpose is to manage your\s+部门工具平台 instance,/g,
		'管理员工作空间仅供管理员使用，里面包含用于管理部门工具平台实例的脚本，'
	],
	[
		/The 管理员工作空间 is for admins only and contains scripts whose purpose is to manage your\s+部门工具平台 instance,/g,
		'管理员工作空间仅供管理员使用，里面包含用于管理部门工具平台实例的脚本，'
	],
	[
		/The 管理员工作空间 is reserved for superadmins\. Only users with superadmin privileges can access it\. Members cannot be manually added or invited to this workspace\./g,
		'管理员工作空间仅供超级管理员使用。只有拥有超级管理员权限的用户才能访问。不能手动向该工作空间添加或邀请成员。'
	],
	[
		/The 管理员空间 workspace 仅供超级管理员使用。 Only users with superadmin privileges can access it\. 不能手动向该工作空间添加或邀请成员。/g,
		'管理员工作空间仅供超级管理员使用。只有拥有超级管理员权限的用户才能访问。不能手动向该工作空间添加或邀请成员。'
	],
	[/The 管理员空间 workspace 仅供超级管理员使用。/g, '管理员工作空间仅供超级管理员使用。'],
	[/is for admins only and contains scripts whose purpose is to manage your 部门工具平台 instance/g, '仅供管理员使用，包含用于管理部门工具平台实例的脚本'],
	[/is for admins only and contains scripts whose purpose is to manage your Windmill instance/g, '仅供管理员使用，包含用于管理实例的脚本'],
	[/such as keeping resource types up to date\./g, '例如保持资源类型为最新状态。'],
	[/is reserved for superadmins\./g, '仅供超级管理员使用。'],
	[/Only users with superadmin privileges can\s+access it\./g, '只有拥有超级管理员权限的用户才能访问。'],
	[/Only users with superadmin privileges can\s+access it/g, '只有拥有超级管理员权限的用户才能访问'],
	[
		/Members cannot be manually added or invited to this workspace\./g,
		'不能手动向该工作空间添加或邀请成员。'
	],
	[
		/Add members to your workspace and manage their roles\. You can also auto-add users to join your workspace\./g,
		'向工作空间添加成员并管理他们的角色。你也可以配置用户自动加入该工作空间。'
	],
	[/Synchronize Hub Resource types with instance/g, '同步插件中心资源类型到实例'],
	[/Try changing the filters or creating a new variable/g, '请尝试调整筛选条件，或创建一个新变量'],
	[/Try changing the filters or creating a new resource/g, '请尝试调整筛选条件，或创建一个新资源'],
	[/(\d+) jobs?/gi, '$1 个任务'],
	[/(\d+) workers?/gi, '$1 个执行节点'],
	[/(\d+)s ago/gi, '$1 秒前'],
	[/(\d+)m ago/gi, '$1 分钟前'],
	[/(\d+)h ago/gi, '$1 小时前'],
	[/Search workers in group '(.+)'/g, '在执行节点组“$1”中搜索执行节点'],
	[/WorkerWorker startJobs ranLast job/g, '执行节点 执行节点启动时间 已运行任务 最近任务'],
	[/Occupancy rate\(15s\/5m\/30m\/ever\)/g, '占用率 (15 秒/5 分钟/30 分钟/累计)'],
	[/Memory usage\(部门工具平台\)/g, '内存使用 (部门工具平台)'],
	[/Occupancy rate\(15s\/5m\/30m\/ever\)Memory usage\(部门工具平台\)/g, '占用率 (15 秒/5 分钟/30 分钟/累计) 内存使用 (部门工具平台)'],
	[/Autoscaling events/g, '自动扩缩容事件'],
	[/Tags:/g, '标签：'],
	[/default -/g, '默认 -'],
	[/past 1w/g, '过去 1 周'],
	[/Configure the core settings of your 部门工具平台 instance\./g, '配置部门工具平台实例的核心设置。'],
	[/Public base url of the instance\./g, '实例的公开基础 URL。'],
	[/Auto-detected from browser — not yet saved/g, '已从浏览器自动检测，尚未保存'],
	[/License key required to use the EE \(switch image for windmill-ee\)\./g, '使用企业版需要许可证密钥（需要切换到企业版镜像）。'],
	[/only for EE/g, '仅企业版可用'],
	[
		/Domain to display in webhooks for email triggers \(should match the MX record\)/g,
		'邮件触发器 Webhook 中显示的域名（应与 MX 记录匹配）'
	],
	[
		/How long to keep the jobs data in the database \(max 30 days on CE\)\./g,
		'任务数据在数据库中的保留时间（社区版最长 30 天）。'
	],
	[
		/Isolation mode for job execution\. None: no isolation\. Unshare: PID namespace isolation via unshare\. Nsjail: full nsjail sandboxing\./g,
		'任务执行的隔离模式。无：不启用隔离。Unshare：通过 unshare 使用 PID 命名空间隔离。Nsjail：使用完整的 nsjail 沙箱。'
	],
	[
		/S3\/Azure bucket to store large logs and global cache for Python and Go\./g,
		'用于存储大型日志，以及 Python 和 Go 全局缓存的 S3/Azure 存储桶。'
	],
	[/daysdays/g, '天'],
	[/\bdays\b/g, '天'],
	[/hrshr/g, '小时'],
	[/minsmin/g, '分钟'],
	[/secssec/g, '秒'],
	[/hours?/g, '小时'],
	[/\bhrs\b/g, '小时'],
	[/\bmins\b/g, '分钟'],
	[/\bsecs\b/g, '秒'],
	[/\bhr\b/g, '小时'],
	[/\bmin\b/g, '分钟'],
	[/\bsec\b/g, '秒'],
	[/= ([\d,]+) seconds/g, '= $1 秒'],
	[
		/You can change these settings later in the instance settings\./g,
		'你之后也可以在实例设置中修改这些设置。'
	],
	[/Welcome to 部门工具平台/g, '欢迎使用部门工具平台'],
	[/Configure your instance settings to get started\./g, '请先配置实例设置。'],
	[/You\s+can\s+use\s+the\s+quick\s+setup\s+for\s+essential\s+settings/g, '你可以使用快速设置完成必要配置'],
	[/or the advanced setup for full control\./g, '也可以使用高级设置进行完整配置。'],
	[/Log in or sign up/g, '登录或注册'],
	[/Log in or sign up with any of the methods below/g, '请选择下面任意一种方式登录或注册'],
	[
		/Visual builder for composing scripts into workflows with branching, loops, and error handling\./g,
		'可视化编排器，用于将脚本组合成支持分支、循环和错误处理的工作流。'
	],
	[
		/Write workflows as Python or TypeScript code as a regular 部门工具平台 script\./g,
		'像普通脚本一样，用 Python 或 TypeScript 编写工作流。'
	],
	[
		/Drag-and-drop UI builder with 60\+ powerful components\./g,
		'拖拽式界面构建器，内置 60 多个强大组件。'
	],
	[
		/Better for simple apps or apps that require minimal customization\./g,
		'更适合简单应用，或只需要少量自定义的应用。'
	],
	[
		/Build with React or Svelte with full control and a powerful AI agent\./g,
		'使用 React 或 Svelte 构建，可完全控制实现，并配合强大的 AI 助手。'
	],
	[
		/Better for complex apps or apps that require full flexibility and control\./g,
		'更适合复杂应用，或需要完整灵活性和控制力的应用。'
	],
	[
		/You can use ⌘L to open or close this chat, and ⌘K in the\s+script editor to modify selected lines\./g,
		'你可以使用 ⌘L 打开或关闭此对话，在脚本编辑器中使用 ⌘K 修改选中的代码行。'
	],
	[
		/Enable 部门工具平台 AI in your\s+workspace settings\s+to use this chat/g,
		'请先在工作空间设置中启用部门工具平台 AI，才能使用此对话。'
	],
	[
		/Enable 部门工具平台 AI in your/g,
		'请先在'
	],
	[/to use this chat/g, '中启用部门工具平台 AI，才能使用此对话'],
	[
		/Welcome! Default credentials admin@windmill\.dev \/ changeme have been prefilled\./g,
		'欢迎！默认账号 admin@windmill.dev / changeme 已自动填入。'
	],
	[/^New script$/i, '新建脚本'],
	[/^New flow$/i, '新建流程'],
	[/^New app$/i, '新建应用'],
	[/^New resource$/i, '新建资源'],
	[/^New variable$/i, '新建变量'],
	[/^New folder$/i, '新建文件夹'],
	[/^Edit script$/i, '编辑脚本'],
	[/^Edit flow$/i, '编辑流程'],
	[/^Edit app$/i, '编辑应用'],
	[/^Run script$/i, '运行脚本'],
	[/^Run flow$/i, '运行流程'],
	[/^Search scripts$/i, '搜索脚本'],
	[/^Search flows$/i, '搜索流程'],
	[/^Search apps$/i, '搜索应用'],
	[/^Search resources$/i, '搜索资源'],
	[/^Search variables$/i, '搜索变量'],
	[/^Search folders$/i, '搜索文件夹'],
	[/^Edited by (.+)$/i, '编辑人 $1'],
	[/^Created by (.+)$/i, '创建人 $1'],
	[/^Last edited by (.+)$/i, '最后编辑人 $1'],
	[/^User \((.+)\)$/i, '用户 ($1)'],
	[/^Members \((\d+)\)$/i, '成员 ($1)'],
	[/Executions\s+\(1w\)/gi, '执行次数 (1 周)'],
	[/^(\d+) runs?$/i, '$1 次运行'],
	[/^(\d+) items?$/i, '$1 项'],
	[/^(\d+) users?$/i, '$1 个用户'],
	[/^(\d+) groups?$/i, '$1 个用户组'],
	[/^(\d+) scripts?$/i, '$1 个脚本'],
	[/^(\d+) flows?$/i, '$1 个流程'],
	[/^(\d+) apps?$/i, '$1 个应用']
]

const attributeNames = ['aria-label', 'title', 'placeholder']

function shouldSkipElement(element: Element | null): boolean {
	return !element || !!element.closest(SKIP_SELECTOR)
}

function translateText(value: string): string {
	const trimmed = value.trim()
	if (!trimmed) return value

	let translated = exactTranslations[trimmed] ?? trimmed
	for (const [pattern, replacement] of phraseTranslations) {
		translated = translated.replace(pattern, replacement)
	}

	if (translated === trimmed) return value
	return value.replace(trimmed, translated)
}

function translateTextNode(node: Text): void {
	if (shouldSkipElement(node.parentElement)) return
	const translated = translateText(node.nodeValue ?? '')
	if (translated !== node.nodeValue) node.nodeValue = translated
}

function translateAttributes(element: Element): void {
	const isFormField = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
	if (shouldSkipElement(element) && !isFormField) return
	for (const attr of attributeNames) {
		const value = element.getAttribute(attr)
		if (!value) continue
		const translated = translateText(value)
		if (translated !== value) element.setAttribute(attr, translated)
	}

	if (isFormField) {
		const translatedPlaceholder = translateText(element.placeholder)
		if (translatedPlaceholder !== element.placeholder) {
			element.placeholder = translatedPlaceholder
			element.setAttribute('placeholder', translatedPlaceholder)
		}
	}
}

function translateTree(root: ParentNode): void {
	if (root instanceof Element) translateAttributes(root)

	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
		acceptNode(node) {
			if (node instanceof Element && shouldSkipElement(node)) {
				return NodeFilter.FILTER_REJECT
			}
			return NodeFilter.FILTER_ACCEPT
		}
	})

	let node = walker.nextNode()
	while (node) {
		if (node instanceof Text) translateTextNode(node)
		if (node instanceof Element) translateAttributes(node)
		node = walker.nextNode()
	}

	if (root === document.body || root instanceof DocumentFragment) {
		for (const element of Array.from(document.querySelectorAll('input, textarea'))) {
			translateAttributes(element)
		}
	}
}

function translateDocumentTitle(): void {
	document.title = translateText(document.title)
	document.title = document.title
		.replace(/^Runs(?= \|)/, '运行记录')
		.replace(/^Variables(?= \|)/, '变量')
		.replace(/^Resources(?= \|)/, '资源')
		.replace(/^Assets(?= \|)/, '资产')
		.replace(/^Workers(?= \|)/, '执行节点')
		.replace(/^Tutorials(?= \|)/, '教程')
		.replace(/^Workspace Settings(?= \|)/, '工作空间设置')
		.replace(/^Instance Settings(?= \|)/, '实例设置')
	if (!document.title.includes(APP_NAME)) {
		document.title = document.title ? `${document.title} | ${APP_NAME}` : APP_NAME
	}
}

export function installChineseLocalizer(): () => void {
	translateTree(document.body)
	translateDocumentTitle()
	const rescanInterval = window.setInterval(() => {
		translateTree(document.body)
		translateDocumentTitle()
	}, 750)
	window.setTimeout(() => window.clearInterval(rescanInterval), 12000)

	const observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type === 'characterData' && mutation.target instanceof Text) {
				translateTextNode(mutation.target)
			}

			if (mutation.type === 'attributes' && mutation.target instanceof Element) {
				translateAttributes(mutation.target)
			}

			for (const node of Array.from(mutation.addedNodes)) {
				if (node instanceof Text) translateTextNode(node)
				if (node instanceof Element) translateTree(node)
			}
		}
		translateDocumentTitle()
	})

	observer.observe(document.body, {
		childList: true,
		subtree: true,
		characterData: true,
		attributes: true,
		attributeFilter: attributeNames
	})

	return () => {
		window.clearInterval(rescanInterval)
		observer.disconnect()
	}
}
