import type {
	CurriedEncodeAndDecode,
	EncodeAndDecodeOptions,
} from '$lib/types';
import {
	compressToEncodedURIComponent,
	decompressFromEncodedURIComponent,
} from './lz-string';

export function lzEncodeAndDecodeOptions<T = any>(
	defaultValue: T,
): CurriedEncodeAndDecode<T> & { defaultValue: T };
export function lzEncodeAndDecodeOptions<
	T = any,
>(): CurriedEncodeAndDecode<T> & {
	defaultValue: undefined;
};
export function lzEncodeAndDecodeOptions<T = any>(
	defaultValue?: T,
): CurriedEncodeAndDecode<T> {
	const encode_and_decode = {
		encode: (value: T) =>
			compressToEncodedURIComponent(JSON.stringify(value)),
		decode: (value: string | null): T | null => {
			if (!value) return null;
			try {
				return JSON.parse(
					decompressFromEncodedURIComponent(value) ?? '',
				);
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
