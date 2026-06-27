<script lang="ts">
	import HighlightCode from '$lib/components/HighlightCode.svelte'
	import Section from '$lib/components/Section.svelte'
	import { HelpCircle } from 'lucide-svelte'
	import { Button, Drawer, Tab, Tabs } from '../../common'
	import DrawerContent from '../../common/drawer/DrawerContent.svelte'
	import TabContent from '$lib/components/common/tabs/TabContent.svelte'

	let drawer: Drawer | undefined = $state()

	interface Props {
		text?: string
	}

	let { text = '审批说明' }: Props = $props()
</script>

<Button
	size="xs"
	variant="default"
	on:click={() => {
		drawer?.openDrawer()
	}}
	>{text} <HelpCircle size={12} />
</Button>

<Drawer bind:this={drawer}>
	<DrawerContent title="暂停/审批/提示说明" on:close={drawer?.closeDrawer}>
		<div class="flex flex-col gap-y-6 text-xs text-primary font-normal">
			<Section label="表单/载荷">
				如需添加表单，请进入高级设置里的暂停配置，再在表单页签中添加表单。下一步可以通过
				`resume`（单个审批人）或 `resumes`（多个审批人）读取提交内容。当前部署未开放审批表单功能；审批人列表仍可通过
				`approvers` 获取。
			</Section>
			<Section label="提示">
				提示是一种允许自助确认的审批步骤。你可以在步骤返回内容中包含继续执行链接，运行流程时界面会自动展示给操作人。
				如果同时加入取消链接，也会展示取消操作。
				示例：
				<Tabs selected="bun" class="pt-4">
					<Tab value="bun" label="TypeScript (Bun)" />
					<Tab value="python" label="Python" />

					{#snippet content()}
						<TabContent value="bun" class="p-2">
							<HighlightCode
								language="deno"
								code={`import * as wmill from "windmill-client"
        
export async function main() {
    const urls = await wmill.getResumeUrls("approver1")

    return {
        resume: urls['resume'],
        cancel: urls['cancel'],
        default_args: {}, // 可选，见下方说明
        enums: {} // 可选，见下方说明
    }
}`}
							/>
						</TabContent>
						<TabContent value="python" class="p-2">
							<HighlightCode
								language="python3"
								code={`import wmill

def main():
    urls = wmill.get_resume_urls()
    return {
        "resume": urls["resume"],
        "cancel": urls["cancel"],
        "default_args": {}, # 可选，见下方说明
        "enums": {} # 可选，见下方说明
    }
                                    `}
							/>
						</TabContent>
					{/snippet}
				</Tabs>
			</Section>
			<Section label="默认参数">
				你可以在此步骤的返回值中加入 `default_args` 对象，用于设置表单参数的默认值。示例：
				<HighlightCode
					language="deno"
					code={`// 假设表单页签中有一个名为 "foo" 的字符串字段，以及一个名为 "bar" 的复选框

import * as wmill from "npm:windmill-client@^1.158.2"

export async function main() {
    // 如果未传入参数且用户已登录，将使用当前用户的用户名
    const urls = await wmill.getResumeUrls("approver1") 

    // 将 resumeUrls 发送给接收人，或参考上方“提示”说明

    return {
        default_args: {
            foo: "foo",
            bar: true
        }
    }
}`}
				/>
			</Section>
			<Section label="动态枚举">
				你可以在此步骤的返回值中加入 `enums` 对象，用于设置表单参数的候选选项。示例：
				<HighlightCode
					language="deno"
					code={`

// 假设表单页签中有一个名为 "foo" 的字符串字段

import * as wmill from "npm:windmill-client@^1.158.2"

export async function main() {
    // 如果未传入参数且用户已登录，将使用当前用户的用户名
    const url = await wmill.getResumeUrls("approver1") 

    // 将 resumeUrls 发送给接收人，或参考上方“提示”说明

    return {
        enums: {
            foo: ["choice1", "choice2"]
        },
    }
}`}
				/>
			</Section>
		</div>
	</DrawerContent>
</Drawer>
