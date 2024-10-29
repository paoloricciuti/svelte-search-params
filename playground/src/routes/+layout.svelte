<script lang="ts">
	let { children } = $props();

	$effect(() => {
		document.body.setAttribute('data-kit-started', '');
	});
</script>

{@render children?.()}
