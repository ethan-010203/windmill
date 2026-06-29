<script lang="ts">
	import { workspaceStore } from '$lib/stores'
	import { Drawer, DrawerContent, Tab, TabContent, Tabs } from '$lib/components/common'
	import CreateToken from '$lib/components/settings/CreateToken.svelte'
	import CopyableCodeBlock from '$lib/components/details/CopyableCodeBlock.svelte'
	import { Bot, Terminal } from 'lucide-svelte'
	import { shell } from 'svelte-highlight/languages'

	type ConnectTab = 'cli' | 'mcp'

	let drawer: Drawer | undefined = $state()
	let selectedTab: ConnectTab = $state('cli')
	let openVersion = $state(0)

	const origin = $derived(typeof window === 'undefined' ? '' : window.location.origin)
	const workspaceId = $derived($workspaceStore ?? '<workspace>')
	const cliCommands = $derived(`npm install -g windmill-cli
wmill workspace add ${workspaceId} ${workspaceId} ${origin}
wmill init
wmill sync pull`)

	function noop() {}

	export function openDrawer(tab: ConnectTab = 'cli') {
		selectedTab = tab
		openVersion += 1
		drawer?.openDrawer()
	}

	function closeDrawer() {
		drawer?.closeDrawer()
	}
</script>

<Drawer bind:this={drawer} size="720px">
	<DrawerContent title="连接当前工作区" on:close={closeDrawer}>
		<div class="flex flex-col gap-5 pb-4">
			<div class="flex flex-col gap-2">
				<div class="w-full">
					<Tabs values={['cli', 'mcp']} bind:selected={selectedTab} wrapperClass="scrollbar-hidden">
						<Tab value="cli" label="CLI" icon={Terminal} />
						<Tab value="mcp" label="MCP" icon={Bot} />
						{#snippet content()}
							<div class="pt-4">
								<TabContent value="cli">
									<div class="flex flex-col gap-4">
										<div class="flex items-start justify-between gap-3 flex-wrap">
											<div class="flex flex-col gap-1">
												<h3 class="text-sm font-semibold text-emphasis">本地配置</h3>
												<p class="text-xs text-secondary max-w-xl">
													在本地仓库中运行这些命令，绑定当前工作区、创建
													<code class="rounded bg-surface-secondary px-1 py-0.5 font-mono text-2xs text-emphasis"
														>wmill.yaml</code
													>，并拉取最新文件。
												</p>
											</div>
										</div>

										<CopyableCodeBlock
											code={cliCommands}
											language={shell}
											wrap
											copyOnClick={false}
										/>

										<p class="text-2xs text-secondary">
											<code class="rounded bg-surface-secondary px-1 py-0.5 font-mono text-2xs text-emphasis"
												>wmill workspace add</code
											>
											会处理认证，
											<code class="rounded bg-surface-secondary px-1 py-0.5 font-mono text-2xs text-emphasis"
												>wmill init</code
											>
											会初始化本地配置，
											<code class="rounded bg-surface-secondary px-1 py-0.5 font-mono text-2xs text-emphasis"
												>wmill sync pull</code
											>
											会拉取工作区内容。
										</p>
									</div>
								</TabContent>

								<TabContent value="mcp">
									<div class="flex flex-col gap-4">
										<div class="flex items-start justify-between gap-3 flex-wrap">
											<div class="flex flex-col gap-1">
												<h3 class="text-sm font-semibold text-emphasis">MCP URL</h3>
												<p class="text-xs text-secondary max-w-xl">
													为当前工作区生成 MCP 服务地址，并选择客户端可以访问的脚本、流程和端点。
												</p>
											</div>
										</div>

										{#key openVersion}
											<CreateToken
												mcpOnly
												lockWorkspace
												title="生成 MCP URL"
												defaultNewTokenWorkspace={$workspaceStore}
												onTokenCreated={noop}
											/>
										{/key}
									</div>
								</TabContent>
							</div>
						{/snippet}
					</Tabs>
				</div>
			</div>
		</div>
	</DrawerContent>
</Drawer>
