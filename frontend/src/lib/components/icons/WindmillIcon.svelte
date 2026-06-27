<script lang="ts">
	import { customIcon } from './store'

	interface Props {
		height?: string
		width?: string
		white?: boolean
		spin?: 'slow' | 'medium' | 'fast' | 'veryfast' | undefined
		class?: string
		size?: number
	}

	let {
		height: heightProp = '24px',
		width: widthProp = '24px',
		white = false,
		spin = undefined,
		class: classNames = '',
		size = undefined
	}: Props = $props()

	let width = $derived(size ? `${size}px` : widthProp)
	let height = $derived(size ? `${size}px` : heightProp)
</script>

{#if customIcon.white || customIcon.normal}
	{#if white}
		<img src={customIcon.white} alt="自定义图标" {width} {height} class={classNames} />
	{:else}
		<img src={customIcon.normal} alt="自定义图标" {width} {height} class={classNames} />
	{/if}
{:else}
	<svg
		class={classNames}
		class:animate-[spin_2s_linear_infinite]={spin === 'veryfast'}
		class:animate-[spin_5s_linear_infinite]={spin === 'fast'}
		class:animate-[spin_15s_linear_infinite]={spin === 'medium'}
		class:animate-[spin_50s_linear_infinite]={spin === 'slow'}
		version="1.1"
		id="Calque_1"
		xmlns="http://www.w3.org/2000/svg"
		xmlns:xlink="http://www.w3.org/1999/xlink"
		x="0px"
		y="0px"
		{width}
		{height}
		viewBox="0 0 256 256"
		xml:space="preserve"
	>
		<rect x="24" y="24" width="208" height="208" rx="48" fill={white ? '#ffffff' : '#2563eb'} />
		<path
			d="M78 94h100M78 128h100M78 162h64"
			fill="none"
			stroke={white ? '#1e232e' : '#ffffff'}
			stroke-width="18"
			stroke-linecap="round"
		/>
		<circle cx="78" cy="94" r="12" fill={white ? '#1e232e' : '#ffffff'} />
		<circle cx="78" cy="128" r="12" fill={white ? '#1e232e' : '#ffffff'} />
		<circle cx="78" cy="162" r="12" fill={white ? '#1e232e' : '#ffffff'} />
	</svg>
{/if}
