export const SUPPORTED_LOCALES = ['zh', 'en'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const LOCALE_NAMES: Record<Locale, string> = {
	en: 'English',
	zh: '中文'
}

/** Map browser language (e.g. "zh-CN") to the closest supported locale, fallback to 'zh' */
export function detectLocale(): Locale {
	if (typeof navigator === 'undefined') return 'zh'
	for (const lang of navigator.languages ?? [navigator.language]) {
		const prefix = lang.split('-')[0].toLowerCase() as Locale
		if (SUPPORTED_LOCALES.includes(prefix)) return prefix
	}
	return 'zh'
}
