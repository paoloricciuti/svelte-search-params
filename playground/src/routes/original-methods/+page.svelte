<script lang="ts">
	import { queryParameters, ssp } from 'sveltekit-search-params';
	const store = queryParameters({
		test: true, // this will show up anyway in the stringified version
		number: ssp.number(), // this will convert the string to num in the stringified
		another_number: ssp.number(42), // this will show up anyway and have the right value
		obj: ssp.object<{ value: string }>(), // this will show up anyway and have the right value
	});
</script>

<p data-testid="stringified">
	{JSON.stringify(store)}
</p>
