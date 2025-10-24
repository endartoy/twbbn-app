<script>
	// export const prerender = true;
	
	import favicon from '$lib/assets/favicon.svg';
	import { loadingState } from '$lib/loadingState';
	import { fade } from 'svelte/transition';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title> Twbbn </title>
</svelte:head>

<div>
	{@render children?.()}
</div>


{#if $loadingState}
	<dialog open transition:fade>
		<div class="dialog-content">
			<!-- svelte-ignore element_invalid_self_closing_tag -->
			<progress style="max-width: 350px; width: 50vw; height: 25px;" />
		</div>
	</dialog>
{/if}

