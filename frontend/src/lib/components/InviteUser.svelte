<script lang="ts">
	import { Button } from './common'
	import Popover from './meltComponents/Popover.svelte'

	import ToggleButtonGroup from './common/toggleButton-v2/ToggleButtonGroup.svelte'
	import ToggleButton from './common/toggleButton-v2/ToggleButton.svelte'
	import { MailPlus } from 'lucide-svelte'

	interface Props {
		inviteUser: (email: string, selected: 'operator' | 'developer' | 'admin') => Promise<void>
	}

	const { inviteUser }: Props = $props()

	let email: string = $state('')

	function handleKeyUp(event: KeyboardEvent) {
		const key = event.key
		if (key === 'Enter') {
			event.preventDefault()
			inviteUser(email, selected)
			email = ''
		}
	}

	let selected: 'operator' | 'developer' | 'admin' = $state('developer')
</script>

<Popover floatingConfig={{ strategy: 'absolute', placement: 'bottom-end' }}>
	{#snippet trigger()}
		<Button
			variant="default"
			unifiedSize="md"
			nonCaptureEvent={true}
			startIcon={{ icon: MailPlus }}
		>
			邀请
		</Button>
	{/snippet}
	{#snippet content()}
		<div class="flex flex-col gap-2 p-4">
			<input
				type="email"
				onkeyup={handleKeyUp}
				placeholder="邮箱"
				bind:value={email}
				class="mr-4"
			/>
			<ToggleButtonGroup bind:selected>
				{#snippet children({ item })}
					<ToggleButton
						value="operator"
						label="使用者"
						tooltip="使用者只能运行和查看当前工作区内自己有权限访问的脚本、流程和应用。"
						{item}
					/>

					<ToggleButton
						value="developer"
						label="开发者"
						tooltip="开发者可以运行和查看脚本、流程和应用，也可以创建新内容，并编辑自己路径或所在文件夹授权范围内的内容。"
						{item}
					/>

					<ToggleButton
						value="admin"
						label="管理员"
						tooltip="管理员拥有当前工作区的完整管理权限，包括用户管理、内容编辑和权限控制。"
						{item}
					/>
				{/snippet}
			</ToggleButtonGroup>
			<Button
				variant="accent"
				unifiedSize="md"
				on:click={() => inviteUser(email, selected)}
				disabled={!email || email.trim() === ''}
			>
				邀请
			</Button>
		</div>
	{/snippet}
</Popover>
