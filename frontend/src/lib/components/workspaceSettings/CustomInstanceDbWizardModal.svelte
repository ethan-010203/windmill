<script lang="ts">
	import {
		SettingService,
		type CustomInstanceDb,
		type CustomInstanceDbTag,
		type ListCustomInstanceDbsResponse
	} from '$lib/gen'
	import { slide } from 'svelte/transition'
	import Modal2 from '../common/modal/Modal2.svelte'
	import Alert from '../common/alert/Alert.svelte'
	import LoggedWizardResult, { firstEmptyStepIsError } from '../wizards/LoggedWizardResult.svelte'
	import Button from '../common/button/Button.svelte'
	import { sendUserToast } from '$lib/toast'
	import { isCustomInstanceDbEnabled } from './utils.svelte'
	import type { ResourceReturn } from 'runed'
	import type { ConfirmationModalHandle } from '../common/confirmationModal/asyncConfirmationModal.svelte'
	import ExploreAssetButton from '../ExploreAssetButton.svelte'
	import { ArrowRight, InfoIcon, Trash2 } from 'lucide-svelte'
	import type { Snippet } from 'svelte'
	import { truncate } from '$lib/utils'
	import Tooltip from '../meltComponents/Tooltip.svelte'
	import { superadmin } from '$lib/stores'

	type Props = {
		customInstanceDbs: ResourceReturn<ListCustomInstanceDbsResponse>
		confirmationModal: ConfirmationModalHandle
		bottomHint?: Snippet | undefined
		opened: { status: CustomInstanceDb | undefined; dbname: string } | undefined
		tag?: CustomInstanceDbTag
	}

	let {
		customInstanceDbs,
		confirmationModal,
		bottomHint,
		opened = $bindable(),
		tag
	}: Props = $props()

	let customInstanceDbSetupIsRunning = $state(false)
	let dropIsRunning = $state(false)
	let preventClose = false
</script>

<Modal2
	bind:isOpen={() => !!opened, (v) => !v && !preventClose && (opened = undefined)}
	target="#content"
	title={'Custom Instance Database Setup'}
	contentClasses="flex flex-col"
	fixedWidth="md"
	fixedHeight="md"
>
	{#if opened}
		{@const status = opened?.status}
		{@const dbname = opened?.dbname}
		{@const enableManageButton =
			status?.logs.created_database === 'OK' || status?.logs.created_database === 'SKIP'}
		<div class="flex h-full divide-x gap-4">
			<div class="basis-2/5 grow-0 shrink-0 flex flex-col">
				<div class="flex-1 flex flex-col">
					<span class="text-sm font-bold mb-2 overflow break-all">{dbname}</span>
					<span class="text-sm">
						Custom instance databases are databases created in the Windmill PostgreSQL instance.
						Their credentials are automatically managed by Windmill and are never exposed to users.
						Only super admins can create them.
					</span>
				</div>
				<div class="pt-6">
					{#if bottomHint}
						<div class="text-secondary text-2xs mb-2">
							{@render bottomHint()}
						</div>
					{/if}
					<div class="flex gap-2">
						<ExploreAssetButton
							class="flex-1"
							asset={{ kind: 'resource', path: 'CUSTOM_INSTANCE_DB/' + dbname }}
							_resourceMetadata={{ resource_type: 'postgresql' }}
							disabled={!$isCustomInstanceDbEnabled || !enableManageButton}
							onClick={() => (opened = undefined)}
						/>
						{#if $superadmin}
							<Button
								size="sm"
								destructive
								iconOnly
								variant="accent"
								startIcon={{ icon: Trash2 }}
								loading={dropIsRunning}
								onClick={async () => {
									preventClose = true
									let confirm = await confirmationModal.ask({
										title: 'Drop database',
										children: `This will permanently drop the database "${dbname}". All data will be lost. This action is irreversible.`,
										confirmationText: 'Drop database'
									})
									preventClose = false
									if (!confirm) return

									try {
										dropIsRunning = true
										await SettingService.dropCustomInstanceDb({ name: dbname })
										await customInstanceDbs.refetch()
										sendUserToast(`Database "${dbname}" dropped successfully`)
										opened = undefined
									} catch (e) {
										sendUserToast(`Failed to drop database: ${e}`, true)
										console.error('Error dropping custom instance database', e)
									} finally {
										dropIsRunning = false
									}
								}}
							>
									删除数据库
							</Button>
						{/if}
					</div>
				</div>
			</div>
			<div class="flex-1 shrink-0 flex flex-col pl-4 gap-2">
				<div class="flex-1 overflow-y-scroll">
					{#if status?.error}
						<div transition:slide={{ duration: 200 }} class="mb-4">
								<Alert title="设置自定义实例数据库时出错" type="error">
								{status.error}
							</Alert>
						</div>
					{/if}

					<LoggedWizardResult
						steps={firstEmptyStepIsError(
							[
								{
									title: '需要超级管理员权限',
									status: status?.logs.super_admin,
									description:
										'需要超级管理员权限，才能在平台 PostgreSQL 实例中创建新数据库'
								},
								{
									title: '读取并解析数据库凭据',
									status: status?.logs.database_credentials,
									description:
										'平台使用 DATABASE_URL 或 DATABASE_URL_FILE 环境变量连接 PostgreSQL 实例。请确保配置正确'
								},
								{
									title: '数据库名称有效',
									status: status?.logs.valid_dbname,
									description:
										'数据库名称只能包含字母、数字和下划线，且不能与平台主数据库同名（通常为 "windmill"）'
								},
								{
									title:
										'创建数据库' +
										(status?.logs.created_database === 'SKIP' ? '（已存在，已跳过）' : ''),
									status: status?.logs.created_database,
									description: `在平台 PostgreSQL 实例中运行：CREATE DATABASE "${dbname}"。`
								},
								{
									title: `连接到 ${dbname} 数据库`,
									status: status?.logs.db_connect,
									description:
										"使用默认管理员用户（DATABASE_URL 中的用户，通常为 'postgres'）连接到新建数据库，以便执行后续命令"
								},
								{
									title: '授予 custom_instance_user 权限',
									status: status?.logs.grant_permissions,
									description:
										'授予 custom_instance_user 使用该数据库所需的权限。custom_instance_user 已在迁移过程中创建，自动生成的密码存储在 global_settings.custom_instance_pg_databases.user_pwd。需要执行的命令：\n\n' +
										`GRANT CONNECT ON DATABASE "${dbname}" TO custom_instance_user;\n` +
										'GRANT USAGE ON SCHEMA public TO custom_instance_user;\n' +
										'GRANT CREATE ON SCHEMA public TO custom_instance_user;\n' +
										`GRANT CREATE ON DATABASE "${dbname}" TO custom_instance_user;\n` +
										'ALTER DEFAULT PRIVILEGES IN SCHEMA public \n' +
										'  	GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES\n    TO custom_instance_user;\n' +
										'ALTER ROLE custom_instance_user CREATEROLE;'
								}
							],
							status?.error ?? undefined
						)}
					/>
				</div>
				{#if $superadmin}
					<Tooltip>
						<Button
							endIcon={{ icon: InfoIcon }}
							onClick={async () => {
								await SettingService.refreshCustomInstanceUserPwd()
								sendUserToast('custom_instance_user 密码已刷新')
							}}>刷新 custom_instance_user 密码</Button
						>
						{#snippet text()}
							如果自定义实例数据库密码存在问题，可以尝试此操作。
						{/snippet}
					</Tooltip>
				{/if}
				<Button
					size="sm"
					id="run-custom-instance-db-setup-button"
					variant={!status?.success ? 'accent' : 'default'}
					endIcon={status?.success ? undefined : { icon: ArrowRight }}
					disabled={!$isCustomInstanceDbEnabled}
					onClick={async () => {
						if (customInstanceDbSetupIsRunning) return

						let wasAlreadySuccessful = status?.success ?? false
						if (status?.logs.created_database != 'OK' && status?.logs.created_database != 'SKIP') {
							preventClose = true
							let confirm = await confirmationModal.ask({
								title: '确认设置',
								children: `这将在平台 PostgreSQL 实例中创建新数据库 ${dbname}`,
								confirmationText: '设置数据库'
							})
							preventClose = false
							if (!confirm) return
						}

						try {
							customInstanceDbSetupIsRunning = true
							let result = await SettingService.setupCustomInstanceDb({
								name: dbname,
								requestBody: { tag }
							})
							await customInstanceDbs.refetch()
							if (result.success) {
								if (!wasAlreadySuccessful) sendUserToast('设置成功')
								else sendUserToast('检查成功')
							} else {
								sendUserToast(result.error ?? '发生错误', true)
							}
						} catch (e) {
							sendUserToast('发生意外错误，请查看控制台详情', true)
							console.error('Error setting up custom instance database', e)
						} finally {
							customInstanceDbSetupIsRunning = false
						}
					}}
					loading={customInstanceDbSetupIsRunning}
				>
					{#if !$isCustomInstanceDbEnabled}
						只有超级管理员可以设置自定义实例数据库
					{:else if status?.success}
						再次检查
					{:else if status?.error}
						重试
					{:else}
						设置 {truncate(dbname, 24)}
					{/if}
				</Button>
			</div>
		</div>
	{/if}
</Modal2>
