import { browser, building } from '$app/environment';
import { goto } from '$app/navigation';
import { page as page_store } from '$app/stores';
import type { Page } from '@sveltejs/kit';
import { fromStore, readable, type Readable } from 'svelte/store';
import type { EncodeAndDecodeOptions, StoreOptions } from './types';
export type { EncodeAndDecodeOptions, StoreOptions };

// during building we fake the page store with an URL with no search params
// as it should be during prerendering. This allow the application to still build
// and the client side behavior is still persisted after the build
let page: Readable<Pick<Page, 'url'>>;
if (building) {
	page = readable({
		url: new URL(
			'https://github.com/paoloricciuti/sveltekit-search-params',
		),
	});
} else {
	page = page_store;
}

function is_complex_equal<T>(
	current: T,
	next: T,
	equality_fn: (current: T, next: T) => boolean = (current, next) =>
		JSON.stringify(current) === JSON.stringify(next),
) {
	return (
		typeof current === 'object' &&
		typeof next === 'object' &&
		equality_fn(current, next)
	);
}

const GOTO_OPTIONS = {
	keepFocus: true,
	noScroll: true,
	replaceState: true,
};

const GOTO_OPTIONS_PUSH = {
	keepFocus: true,
	noScroll: true,
	replaceState: false,
};

type LooseAutocomplete<T> = {
	[K in keyof T]: T[K];
} & {
	[K: string]: any;
};

type Options<T> = {
	[Key in keyof T]:
		| (T[Key] extends boolean
				? string
				: T[Key] extends EncodeAndDecodeOptions<infer TReturn>
					? TReturn
					: string)
		| (T[Key] extends EncodeAndDecodeOptions<any>
				? undefined extends T[Key]['defaultValue']
					? null
					: never
				: null);
};

// type Overrides<T> = {
// 	[Key in keyof T]?: T[Key] | null;
// };

type SetTimeout = ReturnType<typeof setTimeout>;

const batched_updates = new Set<(query: URLSearchParams) => void>();

let batch_timeout: number;

const debounced_timeouts = new Map<string, SetTimeout>();

const page_state = fromStore(page);

const DEFAULT_ENCODER_DECODER: EncodeAndDecodeOptions = {
	encode: (value) => value.toString(),
	decode: (value: string | null) => (value ? value.toString() : null),
};

const RAW = Symbol('raw');

function do_navigate(
	name: string,
	value: unknown,
	encodes: Map<string | symbol, EncodeAndDecodeOptions['encode']>,
	overrides: Record<string | symbol, unknown>,
	store_options: StoreOptions,
) {
	if (!browser) return;
	overrides[name] = value;
	const {
		debounceHistory = 0,
		pushHistory = true,
		sort = true,
		// showDefaults = true,
		// equalityFn,
	} = store_options;
	const hash = window.location.hash;
	const to_batch = (query: URLSearchParams) => {
		if (value == undefined) {
			query.delete(name);
		} else {
			const new_value = (
				encodes.get(name) ?? DEFAULT_ENCODER_DECODER.encode
			)(value);
			if (new_value == undefined) {
				query.delete(name);
			} else {
				query.set(name, new_value);
			}
		}
	};
	batched_updates.add(to_batch);
	clearTimeout(batch_timeout);
	const query = new URLSearchParams(window.location.search);
	batch_timeout = setTimeout(async () => {
		batched_updates.forEach((batched) => {
			batched(query);
		});
		clearTimeout(debounced_timeouts.get(name));
		if (browser) {
			async function navigate() {
				if (sort) {
					query.sort();
				}
				await goto(
					`?${query}${hash}`,
					pushHistory ? GOTO_OPTIONS_PUSH : GOTO_OPTIONS,
				);
				overrides[name] = undefined;
			}
			if (debounceHistory === 0) {
				navigate();
			} else {
				debounced_timeouts.set(
					name,
					setTimeout(navigate, debounceHistory),
				);
			}
		}
		batched_updates.clear();
	});
}

function create_root_navigator(
	root: object,
	encodes: Map<string | symbol, EncodeAndDecodeOptions['encode']>,
	overrides: Record<string | symbol, unknown>,
	store_options: StoreOptions,
) {
	return (_path: string[], key: string, to_set: unknown) => {
		const path = [..._path];
		const name = path.shift()!;
		const value = structuredClone($state.snapshot(overrides[name]) ?? root);
		let current = value;
		for (const piece of path) {
			current = current[piece as never];
		}
		(current as any)[key] = to_set;
		do_navigate(
			name,
			Array.isArray(value) && key === 'length'
				? structuredClone(value)
				: value,
			encodes,
			overrides,
			store_options,
		);
	};
}

function create_recursive_proxy<
	T extends Record<string, EncodeAndDecodeOptions | boolean>,
>(
	target: unknown,
	cache: Partial<T>,
	decodes: Map<string | symbol, EncodeAndDecodeOptions['decode']>,
	encodes: Map<string | symbol, EncodeAndDecodeOptions['encode']>,
	overrides: Record<string | symbol, unknown>,
	old_values: Map<string | symbol, Options<T>>,
	store_options: StoreOptions,
	path: string[] = [],
	navigator?: ReturnType<typeof create_root_navigator>,
) {
	return new Proxy<LooseAutocomplete<Options<T>>>(
		target as LooseAutocomplete<Options<T>>,
		{
			get(target, name) {
				if (name === RAW) return target;
				if (typeof name === 'symbol' || path.length !== 0)
					return Reflect.get(target, name);
				const value =
					cache[name as never] ??
					(decodes.get(name) ?? DEFAULT_ENCODER_DECODER.decode)(
						page_state.current.url.searchParams.get(name as never),
					);
				if (value != undefined && typeof value === 'object') {
					return create_recursive_proxy(
						value,
						cache,
						decodes,
						encodes,
						overrides,
						old_values,
						store_options,
						[...path, name],
						navigator ??
							create_root_navigator(
								value,
								encodes,
								overrides,
								store_options,
							),
					);
				}
				return value;
			},
			set(target, name, value) {
				if (typeof name === 'symbol')
					return Reflect.set(target, name, value);
				if (!browser) return true;
				if (navigator) {
					navigator(path, name, value);
					return true;
				}
				do_navigate(name, value, encodes, overrides, store_options);
				return true;
			},
			has(target, name) {
				if (name === RAW) return true;
				return Reflect.has(target, name);
			},
		},
	);
}

function should_default(
	value: unknown,
	key: string,
	option: boolean | EncodeAndDecodeOptions,
	show_defaults: boolean,
	encodes: Map<string | symbol, EncodeAndDecodeOptions['encode']>,
	overrides: Record<string | symbol, unknown>,
	store_options: StoreOptions,
): option is EncodeAndDecodeOptions {
	if (
		value == undefined &&
		typeof option !== 'boolean' &&
		option.defaultValue != undefined
	) {
		if (show_defaults) {
			do_navigate(
				key,
				option.defaultValue,
				encodes,
				overrides,
				store_options,
			);
		}
		return true;
	}
	return false;
}

export function queryParameters<
	T extends Record<string, EncodeAndDecodeOptions | boolean>,
>(
	options?: T,
	store_options: StoreOptions = {},
): LooseAutocomplete<Options<T>> {
	const { showDefaults: show_defaults = true } = store_options;
	const cache: Partial<T> = {};
	const decodes: Map<string | symbol, EncodeAndDecodeOptions['decode']> =
		new Map();
	const encodes: Map<string | symbol, EncodeAndDecodeOptions['encode']> =
		new Map();
	const old_values: Map<string | symbol, Options<T>> = new Map();
	const overrides: Record<string | symbol, unknown> = $state({});
	for (const key in options) {
		const decode =
			typeof options?.[key] === 'boolean'
				? DEFAULT_ENCODER_DECODER.decode
				: options?.[key].decode;
		const encode =
			typeof options?.[key] === 'boolean'
				? DEFAULT_ENCODER_DECODER.encode
				: options?.[key].encode;
		decodes.set(key, decode);
		encodes.set(key, encode);

		const der = $derived.by(() => {
			const value =
				overrides[key] ??
				decode(page_state.current.url.searchParams.get(key));
			if (
				!browser &&
				should_default(
					value,
					key,
					options[key],
					show_defaults,
					encodes,
					overrides,
					store_options,
				)
			) {
				return options[key].defaultValue;
			}
			const old_value = old_values.get(key) ?? null;
			if (
				is_complex_equal(
					$state.snapshot(value),
					$state.snapshot(old_value) as any,
					typeof options[key] === 'boolean'
						? undefined
						: options[key].equalityFn,
				)
			) {
				return old_value;
			}
			old_values.set(key, $state.snapshot(value));
			return value;
		});

		$effect.pre(() => {
			if (
				should_default(
					der,
					key,
					options[key],
					show_defaults,
					encodes,
					overrides,
					store_options,
				)
			) {
				overrides[key] = options[key].defaultValue;
			}
		});

		Object.defineProperty(cache, key, {
			get() {
				return der;
			},
		});
	}
	return create_recursive_proxy(
		{},
		cache,
		decodes,
		encodes,
		overrides,
		old_values,
		store_options,
	);
}
