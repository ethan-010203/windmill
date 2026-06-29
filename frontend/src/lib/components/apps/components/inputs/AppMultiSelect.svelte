<script lang="ts">
	import AlignWrapper from '../helpers/AlignWrapper.svelte'
	import InitializeComponent from '../helpers/InitializeComponent.svelte'

	interface Props {
		id: string
		render: boolean
		verticalAlignment?: 'top' | 'center' | 'bottom' | undefined
	}

	let { id, render, verticalAlignment = undefined }: Props = $props()
</script>

<InitializeComponent {id} />

<AlignWrapper {render} hFull {verticalAlignment}>
	<div>当前多选组件版本已不再支持。请重新创建多选组件以使用新版本。</div>
</AlignWrapper>
