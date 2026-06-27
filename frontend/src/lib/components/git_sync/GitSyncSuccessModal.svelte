<script lang="ts">
	import Modal from '$lib/components/common/modal/Modal.svelte'
	import { CheckCircle2, ArrowRight } from 'lucide-svelte'

	interface Props {
		open: boolean
		savedWithoutInit?: boolean
	}

	let {
		open = $bindable(false),
		savedWithoutInit = false
	}: Props = $props()

</script>

<Modal bind:open title="Git 同步连接已保存" class="sm:max-w-4xl" cancelText="关闭">
	<div class="flex flex-col gap-6 p-6">
		<!-- Success header -->
		<div class="flex items-center gap-3">
			<div class="flex-shrink-0">
				<CheckCircle2 class="h-8 w-8 text-green-600" />
			</div>
			<div>
				<h3 class="text-lg font-semibold text-primary">Git 同步连接保存成功</h3>
				<p class="text-sm text-secondary mt-1">仓库已配置为接收平台内的变更。</p>
			</div>
		</div>

		<!-- Info box for saved without init -->
		{#if savedWithoutInit}
			<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
				<h4 class="font-medium text-blue-900 mb-2">仓库已保存，但尚未初始化</h4>
				<p class="text-sm text-blue-800">
					只有新的变更会推送到该仓库。平台内已有内容尚未初始化到仓库。
				</p>
			</div>
		{/if}

		<!-- Optional setup section -->
		<div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
			<h4 class="font-medium text-amber-900 mb-2 flex items-center gap-2">
				<ArrowRight class="h-4 w-4" />
				可选：启用从 Git 自动部署
			</h4>
			<p class="text-sm text-amber-800 mb-3">
				如需在代码合并后自动部署仓库变更，可以配置 GitHub Actions 或类似 CI/CD 流程。
			</p>
			<div class="flex flex-col gap-2">
				<p class="text-sm text-amber-700">该配置可用于：</p>
				<ul class="text-sm text-amber-700 ml-4 list-disc space-y-1">
					<li>代码合并后自动部署</li>
					<li>平台和 Git 仓库之间的双向同步</li>
				</ul>
			</div>
		</div>

	</div>
</Modal>
