<svelte:options runes />

<script lang="ts">
	import { queryParameters, ssp } from 'sveltekit-search-params';
	const params = queryParameters(
		{
			str2: true,
			num: ssp.number(0),
		},
		{ debounceHistory: 1000 },
	);
</script>

<input data-testid="str2-input" bind:value={params.str2} />
<div data-testid="str2">{params.str2}</div>

<button
	data-testid="num"
	onclick={() => {
		params.num++;
	}}>{params.num}</button
>

<button
	data-testid="change-both"
	onclick={() => {
		params.num++;
		params.str2 = 'changed';
	}}>change both</button
>
