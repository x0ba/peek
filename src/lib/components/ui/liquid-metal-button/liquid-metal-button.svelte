<script lang="ts">
	import { liquidMetalFragmentShader, ShaderMount } from "@paper-design/shaders";
	import { Sparkles } from "@lucide/svelte";
	import { onMount } from "svelte";
	import type { HTMLButtonAttributes } from "svelte/elements";

	import { cn } from "$lib/utils";

	type Props = HTMLButtonAttributes & {
		label?: string;
		viewMode?: "text" | "icon";
		width?: number;
		height?: number;
	};

	let {
		label = "Get Started",
		viewMode = "text",
		width,
		height,
		class: className,
		onclick,
		...restProps
	}: Props = $props();

	let shaderElement: HTMLDivElement | undefined;
	let shaderMount: ShaderMount | undefined;
	let hovered = $state(false);
	let pressed = $state(false);
	let ripples = $state<Array<{ x: number; y: number; id: number }>>([]);
	let rippleId = 0;

	const dimensions = $derived.by(() => {
		if (viewMode === "icon") {
			const s = height ?? 46;
			return { width: s, height: s, innerWidth: s - 4, innerHeight: s - 4 };
		}
		const w = width ?? 142;
		const h = height ?? 46;
		return { width: w, height: h, innerWidth: w - 4, innerHeight: h - 4 };
	});

	onMount(() => {
		if (!shaderElement) return;

		shaderMount = new ShaderMount(
			shaderElement,
			liquidMetalFragmentShader,
			{
				u_repetition: 4,
				u_softness: 0.5,
				u_shiftRed: 0.3,
				u_shiftBlue: 0.3,
				u_distortion: 0,
				u_contour: 0,
				u_angle: 45,
				u_scale: 8,
				u_shape: 1,
				u_offsetX: 0.1,
				u_offsetY: -0.1
			},
			undefined,
			0.6
		);

		return () => shaderMount?.dispose();
	});

	function handlePointerEnter() {
		hovered = true;
		shaderMount?.setSpeed(1);
	}

	function handlePointerLeave() {
		hovered = false;
		pressed = false;
		shaderMount?.setSpeed(0.6);
	}

	function handleClick(event: Parameters<NonNullable<Props["onclick"]>>[0]) {
		shaderMount?.setSpeed(2.4);
		setTimeout(() => shaderMount?.setSpeed(hovered ? 1 : 0.6), 300);

		const rect = event.currentTarget.getBoundingClientRect();
		const ripple = {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top,
			id: rippleId++
		};

		ripples = [...ripples, ripple];
		setTimeout(() => {
			ripples = ripples.filter(({ id }) => id !== ripple.id);
		}, 600);

		onclick?.(event);
	}
</script>

<div
	class={cn("relative inline-block select-none transition-transform duration-300", className)}
	class:-translate-y-0.5={hovered}
	style:width="{dimensions.width}px"
	style:height="{dimensions.height}px"
>
	<div
		bind:this={shaderElement}
		class="shader-container-liquid-metal absolute inset-0 z-10 overflow-hidden rounded-full opacity-90 transition-opacity duration-300"
		class:opacity-100={hovered}
	></div>

	<div
		class="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_24px_rgba(0,0,0,0.22)] transition-transform duration-500"
		class:scale-95={pressed}
		style:width="{dimensions.innerWidth}px"
		style:height="{dimensions.innerHeight}px"
	></div>

	<div class="pointer-events-none absolute inset-0 z-30 grid place-items-center rounded-full text-white drop-shadow-[0_1px_5px_rgba(0,0,0,0.7)]">
		{#if viewMode === "icon"}
			<Sparkles class="size-4" aria-hidden="true" />
		{:else}
			<span class="px-5 text-sm font-semibold tracking-tight">{label}</span>
		{/if}
	</div>

	<button
		{...restProps}
		type={restProps.type ?? "button"}
		aria-label={restProps["aria-label"] ?? label}
		class="absolute inset-0 z-40 overflow-hidden rounded-full bg-transparent outline-none transition-transform duration-300 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
		class:scale-95={pressed}
		onclick={handleClick}
		onpointerenter={handlePointerEnter}
		onpointerleave={handlePointerLeave}
		onpointerdown={() => (pressed = true)}
		onpointerup={() => (pressed = false)}
	>
		{#each ripples as ripple (ripple.id)}
			<span
				class="pointer-events-none absolute size-4 animate-[liquid-metal-ripple_600ms_ease-out_forwards] rounded-full bg-white/60"
				style:left="{ripple.x}px"
				style:top="{ripple.y}px"
			></span>
		{/each}
	</button>
</div>

<style>
	:global(.shader-container-liquid-metal canvas) {
		position: absolute !important;
		inset: 0 !important;
		display: block !important;
		width: 100% !important;
		height: 100% !important;
		border-radius: 9999px !important;
	}

	@keyframes liquid-metal-ripple {
		0% {
			opacity: 0.6;
			transform: translate(-50%, -50%) scale(0);
		}
		100% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(4);
		}
	}
</style>
