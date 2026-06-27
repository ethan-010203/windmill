<script lang="ts">
	import { onMount } from 'svelte'
	import JSZip from 'jszip'
	import Button from '../common/button/Button.svelte'
	import { workspaceStore, userStore } from '$lib/stores'
	import { sendUserToast } from '$lib/toast'
	import { WorkspaceService } from '$lib/gen'
	import { Download, Upload, RefreshCw } from 'lucide-svelte'

	type Listing = {
		paths: string[]
		sizes: Record<string, number>
		version: number
		edited_at: string
		edited_by: string
	}

	let listing: Listing | undefined = $state(undefined)
	let loading: boolean = $state(false)
	let uploading: boolean = $state(false)
	let fileInput: HTMLInputElement | undefined = $state(undefined)

	const isAdmin = $derived(!!$userStore?.is_admin)

	async function loadListing() {
		if (!$workspaceStore) return
		loading = true
		try {
			listing = (await WorkspaceService.listSharedUi({
				workspace: $workspaceStore
			})) as Listing
		} catch (e) {
			sendUserToast(`Failed to load shared UI: ${e}`, true)
		} finally {
			loading = false
		}
	}

	function humanSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
		return `${(bytes / 1024 / 1024).toFixed(1)} MB`
	}

	async function downloadZip() {
		if (!$workspaceStore) return
		try {
			const got = await WorkspaceService.getSharedUi({ workspace: $workspaceStore })
			const files = (got as any).files ?? {}
			const zip = new JSZip()
			for (const [path, content] of Object.entries(files)) {
				zip.file(path, content as string)
			}
			const blob = await zip.generateAsync({ type: 'blob' })
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = `${$workspaceStore}-ui.zip`
			a.click()
			URL.revokeObjectURL(url)
		} catch (e) {
			sendUserToast(`Failed to download shared UI: ${e}`, true)
		}
	}

	async function onFileSelected(event: Event) {
		const target = event.target as HTMLInputElement
		const file = target.files?.[0]
		if (!file || !$workspaceStore) return
		uploading = true
		try {
			const zip = await JSZip.loadAsync(await file.arrayBuffer())
			const files: Record<string, string> = {}
			const tasks: Promise<void>[] = []
			zip.forEach((relativePath, entry) => {
				if (entry.dir) return
				tasks.push(
					entry.async('string').then((content) => {
						files[relativePath] = content
					})
				)
			})
			await Promise.all(tasks)
			await WorkspaceService.updateSharedUi({
				workspace: $workspaceStore,
				requestBody: { files }
			})
			sendUserToast(`Replaced shared UI folder with ${Object.keys(files).length} file(s)`)
			await loadListing()
		} catch (e) {
			sendUserToast(`替换共享 UI 失败：${e}`, true)
		} finally {
			uploading = false
			if (fileInput) {
				fileInput.value = ''
			}
		}
	}

	onMount(() => {
		loadListing()
	})
</script>

<div class="mb-6">
		<h2 class="text-lg font-semibold mb-1">共享 UI 文件夹</h2>
		<p class="text-sm text-secondary">
			工作区共享的前端文件（组件、样式、辅助函数）会由原始应用打包器合并到 <code>/ui/</code>
			路径下。原始应用可以通过如下方式导入共享组件：
			<code>{`import { Button } from '/ui/Button'`}</code>.
		</p>
		<p class="text-sm text-secondary mt-2">
			编辑需要通过 CLI 完成（<code>wmill sync</code> 会读写同步目录根目录下的 <code>ui/</code>
			文件夹）。此页面用于查看或整体替换该文件夹。变更<strong>不会</strong>自动重新构建已部署的原始应用，需要重新推送受影响的原始应用后才会生效。
	</p>
</div>

<div class="flex items-center gap-2 mb-4">
	<Button
		size="xs"
		variant="default"
		startIcon={{ icon: RefreshCw }}
		on:click={loadListing}
		disabled={loading}
	>
			刷新
	</Button>
	<Button
		size="xs"
		variant="default"
		startIcon={{ icon: Download }}
		on:click={downloadZip}
		disabled={!listing || listing.paths.length === 0}
	>
			下载为 zip
	</Button>
	{#if isAdmin}
		<Button
			size="xs"
			variant="default"
			startIcon={{ icon: Upload }}
			on:click={() => fileInput?.click()}
			disabled={uploading}
		>
				{uploading ? '替换中...' : '从 zip 替换'}
		</Button>
		<input
			bind:this={fileInput}
			type="file"
			accept=".zip"
			style="display: none;"
			onchange={onFileSelected}
		/>
	{/if}
</div>

{#if listing}
	<div class="text-xs text-secondary mb-2">
			版本 {listing.version}{#if listing.edited_by}
				· 最后编辑人 <code>{listing.edited_by}</code>
		{/if}
	</div>
	{#if listing.paths.length === 0}
		<div class="rounded border border-dashed p-6 text-center text-sm text-secondary">
				共享 UI 文件夹为空。请在 <code>f/</code> 和 <code>u/</code> 文件夹旁创建 <code>ui/</code>
				目录，添加文件后运行 <code>wmill sync push</code>。
		</div>
	{:else}
		<div class="rounded border divide-y">
			{#each listing.paths as p (p)}
				<div class="flex items-center justify-between px-3 py-2 text-sm font-mono">
					<span class="truncate">{p}</span>
					<span class="text-xs text-secondary">{humanSize(listing.sizes[p] ?? 0)}</span>
				</div>
			{/each}
		</div>
	{/if}
{:else if loading}
	<div class="text-sm text-secondary">Loading…</div>
{/if}
