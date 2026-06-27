<script lang="ts">
	import { customIcon } from './store'

	interface Props {
		white?: boolean
		size?: string
		color?: string | undefined
		spin?: 'slow' | 'medium' | 'fast' | 'veryfast' | undefined
		class?: string
	}

	let {
		white = false,
		size = '24px',
		color = undefined,
		spin = undefined,
		class: classNames = ''
	}: Props = $props()

</script>

{#if customIcon.white || customIcon.normal}
	{#if white}
		<img
			src={customIcon.white}
			alt="自定义图标"
			width={size}
			height={size}
			class={classNames}
		/>
	{:else}
		<img
			src={customIcon.normal}
			alt="自定义图标"
			width={size}
			height={size}
			class={classNames}
		/>
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
		width={size}
		height={size}
		viewBox="0 0 256 256"
		xml:space="preserve"
	>
		<rect
			x="24"
			y="24"
			width="208"
			height="208"
			rx="48"
			fill={color || (white ? '#ffffff' : '#2563eb')}
		/>
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
