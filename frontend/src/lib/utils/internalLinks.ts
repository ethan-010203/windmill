import { base } from '$app/paths'

export function internalDocumentationLink(link?: string): string | undefined {
	if (!link) return undefined
	if (link.includes('windmill.dev/docs') || link.includes('docs.windmill.dev')) {
		return `${base}/tutorials`
	}
	return link
}
