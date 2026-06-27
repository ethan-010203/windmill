<script lang="ts">
	import Tutorial from '../Tutorial.svelte'

	interface Props {
		name: string;
		index: number;
	}

	let { name, index }: Props = $props();

	let tutorial: Tutorial | undefined = $state(undefined)

	export function runTutorial() {
		tutorial?.runTutorial()
	}
</script>

<Tutorial
	bind:this={tutorial}
	{index}
	{name}
	on:error
	on:skipAll
	getSteps={(driver) => [
		{
			popover: {
				title: '表达式判断教程',
				description:
					'学习如何构建第一个按条件执行的分支。你可以使用方向键切换步骤。'
			}
		}
	]}
/>
