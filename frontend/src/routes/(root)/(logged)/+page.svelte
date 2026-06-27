<script lang="ts">
	import { userStore, workspaceStore } from '$lib/stores'
	import { Alert, Button } from '$lib/components/common'
	import PageHeader from '$lib/components/PageHeader.svelte'
	import CreateActionsFlow from '$lib/components/flows/CreateActionsFlow.svelte'
	import CreateActionsScript from '$lib/components/scripts/CreateActionsScript.svelte'
	import HomeConnectDrawer from '$lib/components/home/HomeConnectDrawer.svelte'
	import { PlugZap } from 'lucide-svelte'

	import ItemsList from '$lib/components/home/ItemsList.svelte'
	import CreateActionsApp from '$lib/components/flows/CreateActionsApp.svelte'
	import { HOME_SHOW_CREATE_FLOW, HOME_SHOW_CREATE_APP } from '$lib/consts'
	import { page } from '$app/state'
	import ForkWorkspaceBanner from '$lib/components/ForkWorkspaceBanner.svelte'
	import WorkspaceDraftsBanner from '$lib/components/WorkspaceDraftsBanner.svelte'
	import WorkspaceTutorials from '$lib/components/WorkspaceTutorials.svelte'
	import { onMount, setContext } from 'svelte'
	import { tutorialsToDo } from '$lib/stores'
	import { ignoredTutorials } from '$lib/components/tutorials/ignoredTutorials'
	import TutorialBanner from '$lib/components/home/TutorialBanner.svelte'
	import NoDirectDeployAlert from '$lib/components/NoDirectDeployAlert.svelte'
	import { useSearchParams } from '$lib/svelte5UtilsKit.svelte'
	import { z } from 'zod'

	let subtab: 'flow' | 'script' | 'app' = $state('script')

	const searchParams = useSearchParams(z.object({ search: z.string().nullable() }))
	const getFilter = () => searchParams.search ?? ''
	const setFilter = (v: string) => (searchParams.search = v === '' ? null : v)

	let workspaceTutorials: WorkspaceTutorials | undefined = $state(undefined)
	let homeConnectDrawer: HomeConnectDrawer | undefined = $state(undefined)

	// Provide workspaceTutorials to child components via a reactive wrapper
	let workspaceTutorialsContext = $derived(workspaceTutorials)
	setContext('workspaceTutorials', {
		get value() {
			return workspaceTutorialsContext
		}
	})

	let showCreateButtons = $state(false)

	onMount(() => {
		// Check if there's a tutorial parameter in the URL
		const tutorialParam = page.url.searchParams.get('tutorial')
		if (tutorialParam === 'workspace-onboarding') {
			// Small delay to ensure page is fully loaded
			setTimeout(() => {
				workspaceTutorials?.runTutorialById('workspace-onboarding')
			}, 500)
		} else if (tutorialParam === 'workspace-onboarding-operator') {
			// Small delay to ensure page is fully loaded
			setTimeout(() => {
				workspaceTutorials?.runTutorialById('workspace-onboarding-operator')
			}, 500)
		} else if (!$ignoredTutorials.includes(8) && $tutorialsToDo.includes(8)) {
			// Check if user hasn't completed or ignored the workspace onboarding tutorial
			// Small delay to ensure page is fully loaded
			setTimeout(() => {
				workspaceTutorials?.runTutorialById('workspace-onboarding')
			}, 500)
		}
	})
</script>

<div
	class="flex flex-col w-full h-full overflow-y-auto items-center"
	style="scrollbar-gutter: stable both-edges;"
>
	<ForkWorkspaceBanner />
	<WorkspaceDraftsBanner />
	<div class="max-w-7xl px-4 sm:px-8 md:px-8 h-fit w-full">
		{#if $workspaceStore == 'admins'}
			<div class="my-4"></div>

			<Alert title="Admins workspace">
				The Admins workspace is for admins only and contains scripts whose purpose is to manage your
				Windmill instance, such as keeping resource types up to date.
			</Alert>
		{/if}
		<PageHeader
			title="Home"
			childrenWrapperDivClasses="flex-1 flex flex-row gap-4 flex-wrap justify-end items-center"
		>
			{#if $userStore?.operator}
				<Button
					variant="default"
					unifiedSize="sm"
					startIcon={{ icon: PlugZap }}
					btnClasses="whitespace-nowrap"
					onClick={() => homeConnectDrawer?.openDrawer?.()}
				>
					CLI / MCP
				</Button>
			{/if}
			{#if !$userStore?.operator && showCreateButtons}
				<CreateActionsScript aiId="create-script-button" aiDescription="Creates a new script" />
				{#if HOME_SHOW_CREATE_FLOW}<CreateActionsFlow />{/if}
				{#if HOME_SHOW_CREATE_APP}<CreateActionsApp />{/if}
			{/if}
		</PageHeader>

		<TutorialBanner />

		<NoDirectDeployAlert onUpdateCanEditStatus={(v) => (showCreateButtons = v)} />

		{#if !$userStore?.operator}
			<div class="flex w-full justify-end pb-2">
				<Button
					variant="default"
					unifiedSize="sm"
					startIcon={{ icon: PlugZap }}
					btnClasses="whitespace-nowrap shrink-0"
					onClick={() => homeConnectDrawer?.openDrawer?.()}
				>
					CLI / MCP
				</Button>
			</div>
		{/if}
	</div>

	<ItemsList bind:filter={getFilter, setFilter} bind:subtab showEditButtons={showCreateButtons} />
</div>

<WorkspaceTutorials bind:this={workspaceTutorials} />
<HomeConnectDrawer bind:this={homeConnectDrawer} />
