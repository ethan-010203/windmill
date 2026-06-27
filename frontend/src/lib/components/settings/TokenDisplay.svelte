<script lang="ts">
	import { Check, Link, X } from 'lucide-svelte'
	import Alert from '../common/alert/Alert.svelte'
	import { classes } from '../common/alert/model'
	import { shell } from 'svelte-highlight/languages'
	import CopyableCodeBlock from '../details/CopyableCodeBlock.svelte'

	interface Props {
		token: string
		mcpUrl?: string
		title?: string
		onClose?: () => void
	}

	let { token, mcpUrl, title, onClose }: Props = $props()

	const displayTitle = $derived(title || (mcpUrl ? 'MCP URL 已生成' : '令牌已创建'))

	const info = $derived(
		`请立即复制${mcpUrl ? ' MCP 服务 URL' : '个人访问令牌'}，关闭后将无法再次查看。`
	)

	const tokenOrUrl = $derived(mcpUrl ? mcpUrl : token)

	// Use alert model for consistent styling with design system
	const alertStyles = classes.info
</script>

<!-- Use surface-tertiary for elevated content according to brand guidelines -->
<div class="border bg-surface-tertiary rounded-lg mb-6 p-4 shadow-md relative">
	<!-- Close button in top-right corner -->
	{#if onClose}
		<button
			onclick={onClose}
			class="absolute top-2 right-2 p-1 text-secondary hover:text-primary surface-hover hover:surface-secondary rounded transition-colors"
			title="关闭"
		>
			<X size={16} />
		</button>
	{/if}

	<div class="flex items-start gap-3">
		<!-- Icon with info alert styling -->
		<div
			class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 {alertStyles.iconClass}"
		>
			{#if mcpUrl}
				<Link size={16} />
			{:else}
				<Check size={16} />
			{/if}
		</div>

		<div class="flex-1 min-w-0 pr-6">
			<!-- Page title typography according to brand guidelines -->
			<h4 class="text-sm font-semibold text-emphasis mb-2">
				{displayTitle}
			</h4>

			<div class="flex flex-col gap-y-1">
				<!-- Token display with proper surface and border styling -->
				<CopyableCodeBlock code={tokenOrUrl} language={shell} wrap />

				<!-- Warning alert using existing Alert component -->
				<div class="mt-1">
					<Alert type="warning" title="重要" size="xs">
						{info}
					</Alert>
				</div>

				{#if mcpUrl}
					<!-- Additional info using alert info styling -->
					<div class="mt-1 {alertStyles.bgClass} rounded-md p-2">
						<p class="text-xs {alertStyles.descriptionClass}">
							<strong>下一步：</strong>在支持 MCP 的客户端中使用此 URL，即可把平台内的脚本和流程作为工具调用。
						</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
