<script lang="ts">
	import { Alert } from '$lib/components/common'
	import { userStore, workspaceStore } from '$lib/stores'
	import Tooltip from '$lib/components/Tooltip.svelte'
	import Path from '$lib/components/Path.svelte'
	import TextInput from '$lib/components/text_input/TextInput.svelte'
	import OnBehalfOfSelector, {
		type OnBehalfOfChoice
	} from '$lib/components/OnBehalfOfSelector.svelte'

	const WM_DEPLOYERS_GROUP = 'wm_deployers'

	let {
		policy,
		appPath,
		onLatest,
		savedApp,
		summary = $bindable(),
		deploymentMsg = $bindable(),
		pathError = $bindable(),
		newEditedPath = $bindable(),
		newPath,
		preserveOnBehalfOf = $bindable(false)
	}: {
		policy: any
		appPath: string
		onLatest: boolean
		savedApp: any
		summary: string
		deploymentMsg: string | undefined
		pathError: string
		newEditedPath: string
		newPath: string
		preserveOnBehalfOf?: boolean
	} = $props()

	let isDeployer = $derived($userStore?.groups?.includes(WM_DEPLOYERS_GROUP) ?? false)
	let canPreserve = $derived(!!$userStore?.is_admin || !!$userStore?.is_super_admin || isDeployer)
	let savedOnBehalfOfEmail = $derived(savedApp?.policy?.on_behalf_of_email)
	let savedOnBehalfOf = $derived(savedApp?.policy?.on_behalf_of)
	let onBehalfOfChoice: OnBehalfOfChoice = $state(undefined)
	let customOnBehalfOfEmail: string = $state('')
	let path: Path | undefined = $state(undefined)

	let dirtyPath = $state(false)
</script>

{#if !onLatest}
	<Alert title="You're not on the latest app version. " type="warning">
		By deploying, you may overwrite changes made by other users. Press 'Deploy' to see diff.
	</Alert>
	<div class="py-2"></div>
{/if}
<label for="summary" class="text-emphasis text-xs font-semibold">Summary</label>
<div class="w-full pt-1">
	<TextInput
		inputProps={{
			id: 'summary',
			autofocus: true,
			placeholder: 'App summary',
			onkeydown: (e) => {
				e.stopPropagation()
			},
			onkeyup: () => {
				if (appPath == '' && summary?.length > 0 && !dirtyPath) {
					path?.setName(
						summary
							.toLowerCase()
							.replace(/[^a-z0-9_]/g, '_')
							.replace(/-+/g, '_')
							.replace(/^-|-$/g, '')
					)
				}
			}
		}}
		bind:value={summary}
	/>
</div>
<div class="py-6"></div>
<label for="deploymentMsg" class="text-emphasis text-xs font-semibold">Deployment message</label>
<div class="w-full pt-1">
	<TextInput
		inputProps={{
			id: 'deploymentMsg',
			placeholder: 'Optional deployment message'
		}}
		bind:value={deploymentMsg}
	/>
</div>
<div class="py-6"></div>
<label for="path" class="text-emphasis text-xs font-semibold">Path</label>
<Path
	bind:this={path}
	bind:dirty={dirtyPath}
	bind:error={pathError}
	bind:path={newEditedPath}
	initialPath={newPath}
	namePlaceholder="app"
	kind="app"
	autofocus={false}
/>

<div class="py-2"></div>
<Alert title="App executed on behalf of you">
	A viewer of the app will execute the runnables of the app on behalf of the publisher (you)
	<Tooltip>
		It ensures that all required resources/runnable visible for publisher but not for viewer at time
		of creating the app would prevent the execution of the app. To guarantee tight security, a
		policy is computed at time of deployment of the app which only allow the scripts/flows referred
		to in the app to be called on behalf of. Furthermore, static parameters are not overridable.
		Hence, users will only be able to use the app as intended by the publisher without risk for
		leaking resources not used in the app.
	</Tooltip>
	{#if canPreserve}
		<div class="mt-4">
			Because you are either an admin or part of the {WM_DEPLOYERS_GROUP} group, you can select another
			user to run this app on behalf of. Once deployed the app will be run on behalf of
			<OnBehalfOfSelector
				targetWorkspace={$workspaceStore ?? ''}
				targetValue={savedOnBehalfOfEmail}
				selected={onBehalfOfChoice}
				onSelect={(choice, details) => {
					onBehalfOfChoice = choice
					if (choice === 'me') {
						policy.on_behalf_of_email = $userStore?.email
						policy.on_behalf_of = `u/${$userStore?.username}`
						customOnBehalfOfEmail = ''
						preserveOnBehalfOf = false
					} else if (choice === 'target') {
						policy.on_behalf_of_email = savedOnBehalfOfEmail
						policy.on_behalf_of = savedOnBehalfOf
						customOnBehalfOfEmail = ''
						preserveOnBehalfOf = true
					} else if (choice === 'custom' && details) {
						policy.on_behalf_of_email = details.email
						policy.on_behalf_of = details.permissionedAs
						customOnBehalfOfEmail = details.email
						preserveOnBehalfOf = true
					}
				}}
				kind="app"
				{canPreserve}
				customValue={customOnBehalfOfEmail}
				isDeployment={false}
			/>
		</div>
	{/if}
</Alert>

<div class="mt-10"></div>
