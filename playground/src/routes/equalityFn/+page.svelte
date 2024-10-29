<script lang="ts">
	import { untrack } from 'svelte';

	import { queryParameters, ssp } from 'sveltekit-search-params';
	const params = queryParameters({
		str: ssp.object<{ value: string }>()(() => false),
	});

	let store_changes = $state(0);

	$effect(() => {
		JSON.stringify(params.str?.value);
		untrack(() => store_changes++);
	});
</script>

{#if params.str}
	<input data-testid="str2-input" bind:value={params.str.value} />
	<div data-testid="str2">{params.str.value}</div>
{/if}
<p data-testid="how-many-store-changes">{store_changes}</p>
