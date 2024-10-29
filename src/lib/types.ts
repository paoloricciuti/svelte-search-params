export type EncodeAndDecodeOptions<T = any> = {
	encode: (value: T) => string | undefined;
	decode: (value: string | null) => T | null;
	defaultValue?: T;
	equalityFn?: T extends object
		? (current: T | null, next: T | null) => boolean
		: never;
};

export type CurriedEncodeAndDecode<T> = ((
	equalityFn: EncodeAndDecodeOptions<T>['equalityFn'],
) => EncodeAndDecodeOptions<T>) &
	EncodeAndDecodeOptions<T>;

export type NavigationOptions = {
	debounceHistory?: number;
	pushHistory?: boolean;
	sort?: boolean;
	showDefaults?: boolean;
};
