<script module lang="ts">
	import { _ } from 'ag-grid-community'

	export type DucklakeSettingsType = {
		ducklakes: {
			name: string
			catalog: {
				resource_type: 'postgresql' | 'mysql' | 'instance'
				resource_path?: string // Name of the database when resource_type is instance
			}
			storage: {
				storage?: string
				path: string
			}
			extra_args?: string
		}[]
	}

	export function convertDucklakeSettingsFromBackend(
		settings: GetSettingsResponse['ducklake']
	): DucklakeSettingsType {
		const s: DucklakeSettingsType = { ducklakes: [] }
		if (settings?.ducklakes) {
			for (const [name, rest] of Object.entries(settings.ducklakes)) {
				s.ducklakes.push({ name, ...rest })
			}
		}
		return s
	}
	export function convertDucklakeSettingsToBackend(
		settings: DucklakeSettingsType
	): NonNullable<GetSettingsResponse['ducklake']> {
		const s: GetSettingsResponse['ducklake'] = { ducklakes: {} }
		for (const ducklake of settings.ducklakes) {
			const catalog = ducklake.catalog
			if (ducklake.name in s.ducklakes)
				throw 'Settings contain duplicate ducklake name: ' + ducklake.name
			if (!catalog.resource_path) throw 'No resource selected for ' + ducklake.name
			if (catalog.resource_type === 'instance' && catalog.resource_path === 'windmill')
				throw ducklake.name + ' catalog cannot be called "windmill"'
			if (ducklake.storage.path.startsWith('/'))
				ducklake.storage.path = ducklake.storage.path.slice(1)

			s.ducklakes[ducklake.name] = {
				catalog: ducklake.catalog,
				storage: ducklake.storage,
				extra_args: ducklake.extra_args || undefined
			}
		}
		return s
	}
</script>

<script lang="ts">
	import { Plus, SettingsIcon } from 'lucide-svelte'

	import Button from '../common/button/Button.svelte'
	import SettingsFooter from './SettingsFooter.svelte'

	import Description from '../Description.svelte'
	import { random_adj } from '../random_positive_adjetive'
	import { DataTable, Cell, Row } from '../table'
	import Head from '../table/Head.svelte'
	import CloseButton from '../common/CloseButton.svelte'
	import Select from '../select/Select.svelte'
	import ResourcePicker from '../ResourcePicker.svelte'
	import { usePromise } from '$lib/svelte5Utils.svelte'
	import { SettingService, WorkspaceService } from '$lib/gen'
	import type { GetSettingsResponse } from '$lib/gen'

	import { workspaceStore } from '$lib/stores'
	import { sendUserToast } from '$lib/toast'
	import ExploreAssetButton from '../ExploreAssetButton.svelte'
	import Tooltip from '../Tooltip.svelte'
	import ConfirmationModal from '../common/confirmationModal/ConfirmationModal.svelte'
	import { createAsyncConfirmationModal } from '../common/confirmationModal/asyncConfirmationModal.svelte'
	import { clone } from '$lib/utils'
	import Alert from '../common/alert/Alert.svelte'
	import { deepEqual } from 'fast-equals'
	import Popover from '../meltComponents/Popover.svelte'
	import TextInput from '../text_input/TextInput.svelte'
	import { slide } from 'svelte/transition'
	import { isCustomInstanceDbEnabled, getUnusedInstanceDbName } from './utils.svelte'
	import { resource } from 'runed'
	import CustomInstanceDbSelect from './CustomInstanceDbSelect.svelte'
	import Label from '../Label.svelte'

	type Props = {
		ducklakeSettings: DucklakeSettingsType
		ducklakeSavedSettings: DucklakeSettingsType
		onSave?: () => void
		onDiscard?: () => void
	}
	let {
		ducklakeSettings = $bindable(),
		ducklakeSavedSettings = $bindable(),
		onSave: onSaveProp = undefined,
		onDiscard = undefined
	}: Props = $props()

	function defaultInstanceDbName(): string {
		const usedNames = [
			...Object.keys(customInstanceDbs.current ?? {}),
			...ducklakeSettings.ducklakes
				.filter((d) => d.catalog.resource_type === 'instance' && d.catalog.resource_path)
				.map((d) => d.catalog.resource_path!)
		]
		return getUnusedInstanceDbName('dl', $workspaceStore ?? '', usedNames)
	}

	function onNewDucklake() {
		const name = ducklakeSettings.ducklakes.some((d) => d.name === 'main')
			? `${random_adj()}_ducklake`
			: 'main'
		ducklakeSettings.ducklakes.push({
			name,
			catalog: {
				resource_type: $isCustomInstanceDbEnabled ? 'instance' : 'postgresql',
				resource_path: $isCustomInstanceDbEnabled ? defaultInstanceDbName() : undefined
			},
			storage: {
				storage: undefined,
				path: ''
			}
		})
	}

	function removeDucklake(index: number) {
		ducklakeSettings.ducklakes.splice(index, 1)
	}

	const ducklakeIsDirty: Record<string, boolean> = $derived(
		Object.fromEntries(
			ducklakeSettings.ducklakes.map((d) => {
				const saved = ducklakeSavedSettings.ducklakes.find((saved) => saved.name === d.name)
				return [d.name, !deepEqual(saved, d)] as const
			})
		)
	)

	let hasUnsavedChanges = $derived(
		ducklakeSavedSettings.ducklakes.length !== ducklakeSettings.ducklakes.length ||
			!Object.values(ducklakeIsDirty).every((v) => v === false)
	)

	const customInstanceDbs = resource([() => $workspaceStore], SettingService.listCustomInstanceDbs)

	async function onSave() {
		try {
			if (
				$isCustomInstanceDbEnabled &&
				ducklakeSettings.ducklakes.some(
					(d) =>
						d.catalog.resource_type === 'instance' &&
						!customInstanceDbs.current?.[d.catalog.resource_path ?? '']?.success
				)
			) {
				let confirm = await confirmationModal.ask({
					title: 'Some instance databases are not setup',
					children: '确定要在未完成设置的情况下保存吗？',
					confirmationText: '仍然保存'
				})
				if (!confirm) return
			}
			const settings = convertDucklakeSettingsToBackend(ducklakeSettings)
			await WorkspaceService.editDucklakeConfig({
				workspace: $workspaceStore!,
				requestBody: { settings }
			})
			ducklakeSavedSettings = clone(ducklakeSettings)
			sendUserToast('Ducklake 设置已保存')
			onSaveProp?.()
		} catch (e) {
			sendUserToast(e, true)
			console.error('Error saving ducklake settings', e)
			throw e
		}
	}

	let secondaryStorageNames = usePromise(
		() => SettingService.getSecondaryStorageNames({ workspace: $workspaceStore! }),
		{ loadInit: false }
	)
	$effect(() => {
		$workspaceStore
		secondaryStorageNames.refresh()
	})

	let tableHeadNames = ['名称', '目录', '工作区存储', '', ''] as const

	let tableHeadTooltips: Partial<Record<(typeof tableHeadNames)[number], string | undefined>> = {
		名称: "在 DuckDB 脚本中可通过 <code class='px-1 py-0.5 border rounded-md'>ATTACH 'ducklake://name' AS dl;</code> 语法引用 Ducklake",
		目录: 'Ducklake 需要一个 SQL 数据库用于存储数据元信息',
		工作区存储: '实际存放 parquet 数据的位置。需要先配置工作区存储'
	}

	let confirmationModal = createAsyncConfirmationModal()
</script>

<div class="flex flex-col gap-4 mb-8">
	<div class="flex flex-col gap-1">
		<div class="text-primary text-lg font-semibold">Ducklake</div>
		<Description>
			平台内置支持 Ducklake。可以像使用普通 SQL 数据库一样使用和浏览 Ducklake，即使数据实际以 parquet 文件形式存储在 S3 中。
		</Description>
	</div>
</div>

{#if ducklakeSettings.ducklakes.some((d) => d.catalog.resource_type === 'instance')}
	<div transition:slide={{ duration: 200 }} class="mb-4">
		<Alert title="实例数据库使用平台数据库" type="info">
			使用实例数据库是开始使用 Ducklake 的最快方式。实例数据库在实例范围内公开，可在其他工作区的 Ducklake 设置中复用。
		</Alert>
	</div>
{/if}

<DataTable containerClass="ducklake-settings-table">
	<Head>
		<tr>
			{#each tableHeadNames as name, i}
				<Cell head first={i == 0} last={i == tableHeadNames.length - 1}>
					{name}
					{#if tableHeadTooltips[name]}
						<Tooltip>
							{@html tableHeadTooltips[name]}
						</Tooltip>
					{/if}
				</Cell>
			{/each}
		</tr>
	</Head>
	<tbody class="divide-y bg-surface-tertiary">
		{#if ducklakeSettings.ducklakes.length == 0}
			<Row>
				<Cell colspan={tableHeadNames.length} class="text-center py-6">
					此工作区尚未配置 Ducklake
				</Cell>
			</Row>
		{/if}
		{#each ducklakeSettings.ducklakes as ducklake, ducklakeIndex}
			<Row>
				<Cell first class="w-44 relative">
					{#if ducklake.name === 'main'}
						<Tooltip wrapperClass="absolute mt-[0.6rem] right-4" placement="bottom-start">
								<i>main</i> Ducklake 可以通过以下简写访问：
							<br />
							<code class="px-1 py-0.5 border rounded-md">ATTACH 'ducklake' AS dl;</code> shorthand
						</Tooltip>
					{/if}
					<TextInput
						bind:value={ducklake.name}
						inputProps={{ placeholder: 'Name' }}
						class="ducklake-name"
					/>
				</Cell>
				<Cell>
					<div class="flex gap-1">
						<div class="relative">
							{#if ducklake.catalog.resource_type === 'instance'}
								<Tooltip wrapperClass="absolute mt-[0.6rem] right-2 z-20" placement="bottom-start">
										使用平台 PostgreSQL 实例作为目录
								</Tooltip>
							{/if}
							<Select
								items={[
									{ value: 'postgresql', label: 'PostgreSQL' },
									{ value: 'mysql', label: 'MySQL' },
										{
											value: 'instance',
											label: '实例',
											subtitle: $isCustomInstanceDbEnabled ? undefined : '仅超级管理员'
										}
								]}
								bind:value={
									() => ducklake.catalog.resource_type,
									(resource_type) => {
										ducklake.catalog = {
											resource_type,
											resource_path:
												resource_type === 'instance' ? defaultInstanceDbName() : undefined
										}
									}
								}
								class="w-24"
							/>
						</div>
						<div class="flex flex-1">
							{#if ducklake.catalog.resource_type !== 'instance'}
								<ResourcePicker
									class="flex-1 min-w-32"
									bind:value={ducklake.catalog.resource_path}
									resourceType={ducklake.catalog.resource_type}
								/>
							{:else}
								<CustomInstanceDbSelect
									class="flex-1 min-w-32"
									bind:value={ducklake.catalog.resource_path}
									{customInstanceDbs}
									{confirmationModal}
									tag="ducklake"
								>
									{#snippet wizardBottomHint()}
											注意：这里不同于“管理 Ducklake”按钮。这里显示作为目录使用的 PostgreSQL 数据库内容，另一个按钮显示 Ducklake 内容（parquet 文件）。
									{/snippet}
								</CustomInstanceDbSelect>
							{/if}
						</div>
					</div>
				</Cell>
				<Cell>
					<div class="flex gap-1">
						<Select
							placeholder="默认存储"
							items={[
								{ value: undefined, label: '默认存储' },
								...(secondaryStorageNames.value?.map((value) => ({ value })) ?? [])
							]}
							bind:value={
								() => ducklake.storage.storage,
								(s) => {
									if (s) ducklake.storage.storage = s
									else delete ducklake.storage.storage
								}
							}
							class="ducklake-workspace-storage-select w-48"
							inputClass="!placeholder-secondary"
						/>
						<TextInput
							inputProps={{ placeholder: '数据路径（默认为 /）' }}
							class="ducklake-storage-data-path"
							bind:value={ducklake.storage.path}
						/>
					</div>
				</Cell>
				<Cell class="w-12">
					<div class="flex gap-1">
						<Popover contentClasses="p-4" enableFlyTransition closeOnOtherPopoverOpen>
							{#snippet trigger()}
								<div class="relative">
									<Button variant="default" iconOnly size="sm" endIcon={{ icon: SettingsIcon }} />
									{#if ducklake.extra_args}
										<div
											class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full border border-surface"
										></div>
									{/if}
								</div>
							{/snippet}
							{#snippet content()}
								<Label
									label="附加参数"
									tooltip="传递给 ATTACH 命令的附加参数。参数列表会原样替换，请用英文逗号分隔。"
								>
									<TextInput
										bind:value={ducklake.extra_args}
										class="min-w-96"
										underlyingInputEl="textarea"
										inputProps={{ placeholder: "METADATA_SCHEMA 'schema', ENCRYPTED true" }}
									/>
								</Label>
							{/snippet}
						</Popover>
						{#if ducklakeIsDirty[ducklake.name]}
							<Popover
								openOnHover
								contentClasses="p-2 text-sm text-secondary italic"
								class="cursor-not-allowed"
							>
								{#snippet trigger()}
									<ExploreAssetButton asset={{ kind: 'ducklake', path: '' }} disabled />
								{/snippet}
								{#snippet content()}
									Please save settings first
								{/snippet}
							</Popover>
						{:else}
							<ExploreAssetButton asset={{ kind: 'ducklake', path: ducklake.name }} />
						{/if}
					</div>
				</Cell>
				<Cell class="w-12">
					<CloseButton small on:close={() => removeDucklake(ducklakeIndex)} />
				</Cell>
			</Row>
		{/each}
		<Row class="!border-0">
			<Cell colspan={tableHeadNames.length} class="pt-0 pb-2">
				<div class="flex justify-center">
					<Button size="sm" btnClasses="max-w-fit" variant="default" on:click={onNewDucklake}>
						<Plus /> New ducklake
					</Button>
				</div>
			</Cell>
		</Row>
	</tbody>
</DataTable>
<SettingsFooter
	class="mt-6 mb-16"
	inline
	{hasUnsavedChanges}
	{onSave}
	onDiscard={() => onDiscard?.()}
	saveLabel="Save ducklake settings"
/>

<ConfirmationModal {...confirmationModal.props} />
