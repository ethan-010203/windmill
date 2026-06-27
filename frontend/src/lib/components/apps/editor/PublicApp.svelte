<script lang="ts">
	import { User, UserRoundX } from 'lucide-svelte'
	import { userStore } from '$lib/stores'
	import { base } from '$app/paths'
	import { page } from '$app/state'
	import Login from '$lib/components/Login.svelte'
	import { Alert, Skeleton } from '$lib/components/common'
	import { onMount, setContext } from 'svelte'
	import { IS_APP_PUBLIC_CONTEXT_KEY, type EditorBreakpoint } from '../types'
	import { UserService, type AppWithLastVersion, type GlobalWhoamiResponse } from '$lib/gen'
	import { urlParamsToObject } from '$lib/utils'
	import { goto } from '$app/navigation'
	import AppPreview from './AppPreview.svelte'
	import RawAppPreview from '$lib/components/raw_apps/RawAppPreview.svelte'
	import type { Runnable } from '$lib/components/raw_apps/rawAppPolicy'
	import { twMerge } from 'tailwind-merge'
	import { writable } from 'svelte/store'

	let {
		notExists,
		noPermission,
		jwtError,
		onLoginSuccess,
		app,
		workspace
	}: {
		notExists: boolean
		noPermission: boolean
		jwtError: boolean
		onLoginSuccess: () => void
		app: (AppWithLastVersion & { value: any; workspace_id?: string }) | undefined
		workspace: string | undefined
	} = $props()

	// Use workspace from props or from app.workspace_id (for custom path responses)
	let effectiveWorkspace = $derived(workspace ?? app?.workspace_id)

	setContext(IS_APP_PUBLIC_CONTEXT_KEY, true)

	const breakpoint = writable<EditorBreakpoint>('lg')

	const darkMode =
		window.localStorage.getItem('dark-mode') ??
		(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

	if (darkMode === 'dark') {
		document.documentElement.classList.add('dark')
	} else {
		document.documentElement.classList.remove('dark')
	}

	let globalUser = $state<GlobalWhoamiResponse | undefined>(undefined)
	async function loadGlobalUser() {
		try {
			globalUser = await UserService.globalWhoami()
		} catch (error) {
			console.error(error)
		}
		// const user = await fetch('/api/global/user')
		// console.log(user)
	}

	onMount(() => {
		// this is to avoid loading global user if the userStore is set at loading
		setTimeout(() => {
			if ($userStore) return
			loadGlobalUser()
		}, 2000)
	})
</script>

{#snippet userInfo(child)}
	<div class="flex gap-1 items-center"><User size={14} />{child}</div>
{/snippet}

<div class="z-50 text-2xs text-primary absolute top-3 left-2"
	>{#if $userStore}
		{@render userInfo($userStore.username)}
	{:else if globalUser}
		{@render userInfo(globalUser.email)}
	{:else}<UserRoundX size={14} />{/if}
</div>

{#if notExists}
	<div class="px-4 mt-20"
		><Alert type="error" title="未找到应用"
			>应用加载失败，请确认链接是否正确。<a href={base}>返回首页</a>
		</Alert></div
	>
{:else if noPermission}
	<div class="px-4 mt-20 w-full text-center font-bold text-xl">此应用需要读取权限</div>
	<div class="text-center mt-8 text-sm text-primary">
		{#if $userStore}你已登录，但没有此应用的读取权限{:else if globalUser && effectiveWorkspace}
			你已登录，但不是工作空间 <span class="text-xl font-bold"
				>{effectiveWorkspace}</span
			> 的成员
		{:else}请登录并确保拥有此应用的读取权限{/if}</div
	>
	<div class="px-2 mx-auto mt-20 max-w-xl w-full">
		{#if !jwtError}
			<Login {onLoginSuccess} popup rd={page.url.pathname + page.url.search + page.url.hash} />
		{/if}
	</div>
{:else if app}
	{#key app}
		{#if app.raw_app && effectiveWorkspace}
			<RawAppPreview
				workspace={effectiveWorkspace}
				user={$userStore}
				secret={app.bundle_secret}
				path={app.path}
				runnables={(app.value?.runnables ?? {}) as Record<string, Runnable>}
			/>
		{:else if app.raw_app && !effectiveWorkspace}
			<div class="px-4 mt-20">
				<Alert type="error" title="配置错误">
					无法加载应用：缺少工作空间信息。
				</Alert>
			</div>
		{:else}
			<div
				class={twMerge(
					'min-h-screen h-full w-full flex',
					app?.value?.['css']?.['app']?.['viewer']?.class,
					'wm-app-viewer'
				)}
				style={app?.value?.['css']?.['app']?.['viewer']?.style}
			>
				<AppPreview
					noBackend={false}
					context={{
						email: $userStore?.email,
						name: $userStore?.name,
						groups: $userStore?.groups,
						username: $userStore?.username,
						query: urlParamsToObject(page.url.searchParams, { stripReserved: true }),
						hash: page.url.hash.substring(1)
					}}
					workspace={effectiveWorkspace}
					summary={app.summary}
					app={app.value}
					appPath={app.path}
					{breakpoint}
					policy={app.policy}
					isEditor={false}
					replaceStateFn={(path) => goto(path)}
					gotoFn={(path, opt) => goto(path, opt)}
				/>
			</div>
		{/if}
	{/key}
{:else}
	<Skeleton layout={[[4], 0.5, [50]]} />
{/if}
