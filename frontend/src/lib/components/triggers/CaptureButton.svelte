<script lang="ts">
	import { Button } from '$lib/components/common'
	import { Webhook, Route, Unplug, Plus, Database } from 'lucide-svelte'
	import { type CaptureTriggerKind } from '$lib/gen'
	import { createEventDispatcher } from 'svelte'
	import { captureTriggerKindToTriggerKind } from '../triggers'
	import CaptureIcon from './CaptureIcon.svelte'
	import DropdownV2 from '$lib/components/DropdownV2.svelte'
	import MqttIcon from '../icons/MqttIcon.svelte'

	interface Props {
		small?: boolean
	}

	let { small = false }: Props = $props()

	const dispatch = createEventDispatcher()

	function handleClick(kind: CaptureTriggerKind) {
		dispatch('openTriggers', {
			kind: captureTriggerKindToTriggerKind(kind),
			config: {}
		})
	}

	let items = $derived([
		{
			icon: Webhook,
			displayName: 'Webhook',
			action: () => handleClick('webhook')
		},
		{
			icon: Route,
			displayName: 'HTTP',
			action: () => handleClick('http')
		},
		{
			icon: Unplug,
			displayName: 'Websocket',
			action: () => handleClick('websocket')
		},
		{
			icon: MqttIcon,
			displayName: 'MQTT',
			action: () => handleClick('mqtt')
		},
		{
			icon: Database,
			displayName: 'Postgres',
			action: () => handleClick('postgres')
		}
	])
</script>

<DropdownV2 {items} placement="bottom-start" fixedHeight={false}>
	{#snippet buttonReplacement()}
		{#if small}
			<Button
				size="xs"
				variant="default"
				wrapperClasses="h-full"
				nonCaptureEvent
				title="Test trigger"
			>
				<div class="flex flex-row items-center gap-1">
					<CaptureIcon variant="redDot" />
					<Plus size={10} class="text-red" />
				</div>
			</Button>
		{:else}
			<Button
				variant="accent-secondary"
				btnClasses="!rounded-l-none"
				wrapperClasses="h-full"
				nonCaptureEvent
				title="Test trigger"
			>
				<CaptureIcon variant="redDot" />
			</Button>
		{/if}
	{/snippet}
</DropdownV2>
