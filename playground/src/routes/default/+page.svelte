<svelte:options runes />

<script lang="ts">
	import { ssp, queryParameters } from 'sveltekit-search-params';
	const store = queryParameters({
		str2: ssp.string('str2'),
	});
	const store_no_show = queryParameters(
		{
			'str2-no-show': ssp.string('str2-no-show'),
		},
		{ showDefaults: false },
	);
</script>

<span data-testid="str2">{store.str2}</span>

<span data-testid="str2-no-show">{store_no_show['str2-no-show']}</span>
