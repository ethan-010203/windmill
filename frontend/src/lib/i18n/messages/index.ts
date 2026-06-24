import type { Locale } from '../index'
import { en, type MessageKey } from './en'
import { zh } from './zh'

export type { MessageKey }

export const messages: Record<Locale, Record<MessageKey, string>> = {
	zh,
	en,
}
