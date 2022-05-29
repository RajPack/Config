const searchParamUtils = (function () {
	function buildSearchParamsFlatObj(
		obj: Record<any, any> | Array<any>,
		parentKey = ""
	) {
		const isArray = Array.isArray(obj);
		const isNull = obj === null;
		const isUndefined = obj === undefined;
		const isFunction = typeof obj === "function";
		const isBoolean = typeof obj === "boolean";
		const isNumber = typeof obj === "number";
		const isObject = typeof obj === "object";

		if (isFunction) {
			return {};
		}
		if (isNull || isUndefined) {
			return { [`${parentKey}<null>`]: "null" };
		}
		if (isUndefined) {
			return { [`${parentKey}<undefined>`]: "null" };
		}
		if (isArray) {
			return obj.reduce((acc, value, index) => {
				const key = parentKey
					? `${parentKey}.[${index}]`
					: `[${index}]`;
				const parsedValue = buildSearchParamsFlatObj(value, key);
				return { ...acc, ...parsedValue };
			}, {});
		}
		if (isObject) {
			return Object.keys(obj).reduce((acc, key) => {
				const value = obj[key];
				const _key = parentKey ? `${parentKey}.${key}` : key;
				const parsedValue = buildSearchParamsFlatObj(value, _key);
				return { ...acc, ...parsedValue };
			}, {});
		}
		if (isBoolean) {
			return { [`${parentKey}<bool>`]: obj };
		}
		if (isNumber) {
			return { [`${parentKey}<number>`]: obj };
		}

		// all other types (strings and any other non derivable ones)
		return { [parentKey]: obj };
	}

	function encodeSearchParams(obj: unknown) {
		const flatObj = buildSearchParamsFlatObj(obj);
		const urlSearchParams = new URLSearchParams();
		Object.keys(flatObj).forEach((key) => {
			urlSearchParams.append(key, flatObj[key]);
		});
		return urlSearchParams.toString();
	}

	function decodeSearchParams(searchString: string) {
		const urlSearchParams = new URLSearchParams(searchString);
		const flatObj: Record<any, any> = {};
		urlSearchParams.forEach((value, key) => (flatObj[key] = value));
		console.log(flatObj);
		return buildObjHierarchyFromFlatObj(flatObj);
	}

	function convertType(type: string, value: string) {
		if (type === "bool") {
			return value.toLowerCase() === "true";
		}
		if (type === "number") {
			return Number(value);
		}
		if (type === "null") {
			return null;
		}
		if (type === "undefined") {
			return undefined;
		}
		return value;
	}

	function parseKey(key: string) {
		const arrayMatchRegex = /\[(?<index>\d+)\]((<(?<type>\w+)>)?)?/;
		const objectTypeMatchRegex = /(?<key>([\w\d ]+))((<(?<type>\w+)>)?)?/;
		const arrayMatchResult = arrayMatchRegex.exec(key) as any;
		const objectMatchResult = objectTypeMatchRegex.exec(key) as any;

		if (arrayMatchResult?.groups) {
			return {
				index: Number(arrayMatchResult.groups.index),
				type: arrayMatchResult.groups.type,
			};
		}
		return {
			key: objectMatchResult?.groups.key,
			type: objectMatchResult.groups.type,
		};
	}

	function buildObjHierarchyFromFlatObj(flatObj: Record<string, any>) {
		function assignType(
			key: string,
			lookAheadKey: string,
			obj: Record<any, any> | Array<any>,
			value: string
		) {
			const parsedKey = parseKey(key);
			const keyOrIndex: number | string =
				parsedKey.key || parsedKey.index;
			const type = parsedKey.type;

			//#region Leaf nodes
			if (lookAheadKey === undefined) {
				const _value = convertType(type, value);
				// leaf is of Array type
				if (Array.isArray(obj)) {
					obj[keyOrIndex as number] = _value;
					return;
				}
				// leaf is of Object type
				obj[keyOrIndex as string] = _value;
				return;
			}
			//#endregion

			//#region non terminal/leaf nodes
			const lookAheadParsedKey = parseKey(lookAheadKey);
			const lookAheadIndex = lookAheadParsedKey.index;
			const isNextNodeAnArray = lookAheadIndex !== undefined;

			// non-terminals that are array types
			if (Array.isArray(obj)) {
				obj[keyOrIndex as number] =
					obj[keyOrIndex as number] || (isNextNodeAnArray ? [] : {});
				return;
			}
			// non-terminals that are object types
			obj[key] = obj[key] || (isNextNodeAnArray ? [] : {});
			//#endregion
			return;
		}

		function buildHierachyForKeyPath(
			keys: string[],
			obj: Record<any, any>,
			value: string
		) {
			let currentLocation: Record<any, any> | Array<any> = obj;
			keys.forEach((key, index) => {
				const nextKey = keys[index + 1];
				assignType(key, nextKey, currentLocation, value);
				const parsedKey = parseKey(key);
				currentLocation =
					currentLocation[parsedKey.key || parsedKey.index];
			});
		}
		const result: Record<any, any> = {};
		Object.keys(flatObj).forEach((key) => {
			const keys = key.split(".");
			buildHierachyForKeyPath(keys, result, flatObj[key]);
		});

		return result;
	}

	return {
		encode: encodeSearchParams,
		decode: decodeSearchParams,
	};
})();

// Test
const sampleVal = {
	abc: {
		location: {
			anotherIndirection: ["asdf", "asdff"],
			aNum: 10,
			anObj: { name: "jack", age: 22 },
		},
	},
	xyz: [
		110,
		1123,
		true,
		false,
		null,
		{ kell: "jell", name: ["jill", "jackson", [1, 3, {name: 'jilluy'}]] },
	],
};

const expectedOutput = {
	"abc.location.anotherIndirection.[0]": "asdf",
	"abc.location.anotherIndirection.[1]": "asdff",
	"abc.location.aNum": 10,
	"abc.location.anObj.name": "jack",
	"abc.location.anObj.age": 22,
	"xyz.[0]": 110,
	"xyz.[1]": 1123,
	"xyz.[2]": true,
	"xyz.[3]": false,
	"xyz.[4]": "null",
	"xyz.[5].kell": "jell",
	"xyz.[5].name.[0]": "jill",
	"xyz.[5].name.[1]": "jackson",
};

console.log(JSON.stringify(sampleVal, undefined, 4));
const encodedSearchParams = searchParamUtils.encode(sampleVal);
console.log(encodedSearchParams);
console.log(encodedSearchParams.length);

const decodedSearchParams = searchParamUtils.decode(encodedSearchParams);
console.log(JSON.stringify(decodedSearchParams, undefined, 4));
