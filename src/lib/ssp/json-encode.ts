import type {
	EncodeAndDecodeOptions,
	CurriedEncodeAndDecode,
} from '$lib/types';

function objectEncodeAndDecodeOptions<T extends object = any>(
	defaultValue: T,
): CurriedEncodeAndDecode<T> & { defaultValue: T };
function objectEncodeAndDecodeOptions<
	T extends object = any,
>(): CurriedEncodeAndDecode<T> & { defaultValue: undefined };
function objectEncodeAndDecodeOptions<T extends object = any>(
	defaultValue?: T,
): CurriedEncodeAndDecode<T> {
	const encode_and_decode = {
		encode: (value: T) => JSON.stringify(value),
		decode: (value: string | null): T | null => {
			if (value === null) return null;
			try {
				return JSON.parse(value);
			} catch {
				return null;
			}
		},
		defaultValue,
	};
	function curry_equality(
		equality_fn: EncodeAndDecodeOptions<T>['equalityFn'],
	) {
		return { ...encode_and_decode, equalityFn: equality_fn };
	}
	return Object.assign(curry_equality, encode_and_decode);
}

function arrayEncodeAndDecodeOptions<T = any>(
	defaultValue: T[],
): CurriedEncodeAndDecode<T[]> & { defaultValue: T[] };
function arrayEncodeAndDecodeOptions<T = any>(): CurriedEncodeAndDecode<T[]> & {
	defaultValue: undefined;
};
function arrayEncodeAndDecodeOptions<T = any>(
	defaultValue?: T[],
): CurriedEncodeAndDecode<T[]> {
	const encode_and_decode = {
		encode: (value: T[]) => JSON.stringify(value),
		decode: (value: string | null): T[] | null => {
			if (value === null) return null;
			try {
				return JSON.parse(value);
			} catch {
				return null;
			}
		},
		defaultValue,
	};
	function curry_equality(
		equality_fn: EncodeAndDecodeOptions<T[]>['equalityFn'],
	) {
		return { ...encode_and_decode, equalityFn: equality_fn };
	}
	return Object.assign(curry_equality, encode_and_decode);
}

export { objectEncodeAndDecodeOptions, arrayEncodeAndDecodeOptions };
