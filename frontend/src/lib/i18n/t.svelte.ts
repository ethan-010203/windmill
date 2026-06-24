import { type Locale, SUPPORTED_LOCALES, detectLocale } from './index'
import { en, type MessageKey } from './messages/en'
import { messages } from './messages/index'

/**
 * Persist locale in localStorage directly (not via getLocalSetting)
 * to survive as long as possible - localStorage has no expiry.
 */
const STORAGE_KEY = 'wm_locale'

function readStored(): Locale | undefined {
	try {
		const v = localStorage.getItem(STORAGE_KEY)
		if (v && SUPPORTED_LOCALES.includes(v as Locale)) return v as Locale
	} catch {}
	return undefined
}

function writeStored(l: Locale) {
	try {
		localStorage.setItem(STORAGE_KEY, l)
	} catch {}
}

/** Default is Chinese for self-hosted localization, with English as fallback. */
let locale = $state<Locale>(readStored() ?? 'zh')

export function getLocale(): Locale {
	return locale
}

/** Whether the user's browser language differs from the active locale */
export function detectedDiffers(): boolean {
	return detectLocale() !== locale
}

/** The browser-detected locale (for the alert banner) */
export function getDetectedLocale(): Locale {
	return detectLocale()
}

export function setLocale(l: Locale) {
	locale = l
	writeStored(l)
	if (typeof document !== 'undefined') {
		document.documentElement.lang = l
	}
}

export function t(key: MessageKey): string {
	if (locale === 'en') {
		return en[key]
	}
	return messages[locale]?.[key] ?? en[key]
}

export function label(text: string): string {
	if (locale === 'en') return text

	const labels: Record<string, MessageKey> = {
		Home: 'sidebar.home',
		Runs: 'sidebar.runs',
		Variables: 'sidebar.variables',
		Resources: 'sidebar.resources',
		Assets: 'sidebar.assets',
		Tutorials: 'sidebar.tutorials',
		Triggers: 'sidebar.triggers',
		Schedules: 'sidebar.schedules',
		HTTP: 'sidebar.http',
		WebSockets: 'sidebar.websockets',
		Postgres: 'sidebar.postgres',
		Kafka: 'sidebar.kafka',
		NATS: 'sidebar.nats',
		SQS: 'sidebar.sqs',
		'GCP Pub/Sub': 'sidebar.gcp_pubsub',
		MQTT: 'sidebar.mqtt',
		Email: 'sidebar.email',
		Settings: 'sidebar.settings',
		Account: 'sidebar.account',
		Workspace: 'sidebar.workspace',
		Instance: 'sidebar.instance',
		'Leave workspace': 'sidebar.leave_workspace',
		'Delete Forked Workspace': 'sidebar.delete_fork',
		Workers: 'sidebar.workers',
		'Folders & Groups': 'sidebar.folders_groups',
		Folders: 'sidebar.folders',
		Groups: 'sidebar.groups',
		Logs: 'sidebar.logs',
		'Audit logs': 'sidebar.audit_logs',
		'Service logs': 'sidebar.service_logs',
		'Critical alerts': 'sidebar.critical_alerts',
		Help: 'sidebar.help',
		Docs: 'sidebar.docs',
		Feedbacks: 'sidebar.feedbacks',
		Issues: 'sidebar.issues',
		Changelog: 'sidebar.changelog',
		'Account settings': 'user.account_settings',
		'Switch theme': 'user.switch_theme',
		'Sign out': 'user.sign_out',
		Upgrade: 'user.upgrade',
		'Premium plan': 'user.premium_plan',
		Language: 'user.language',
		'Custom HTTP routes': 'operator.custom_http_routes',
		'Websocket triggers': 'operator.websocket_triggers',
		'Postgres triggers': 'operator.postgres_triggers',
		'Kafka triggers': 'operator.kafka_triggers',
		'NATS triggers': 'operator.nats_triggers',
		'SQS triggers': 'operator.sqs_triggers',
		'GCP Pub/Sub triggers': 'operator.gcp_triggers',
		'MQTT triggers': 'operator.mqtt_triggers',
		'Email triggers': 'operator.email_triggers'
	}

	const eeSuffix = ' (EE)'
	const baseText = text.endsWith(eeSuffix) ? text.slice(0, -eeSuffix.length) : text
	const key = labels[baseText]
	if (!key) return text
	return `${t(key)}${text.endsWith(eeSuffix) ? eeSuffix : ''}`
}
