function memoize(f) {
	const d = {};
	return (...args) => {
		if ("value" in d === false) {
			d.value = f(...args);
		}
		return d.value;
	};
}

const singletonUnits = new WeakSet();
export function singleton(c) {
	singletonUnits.add(c);
	return c;
}

const eagerUnits = new WeakSet();
export function eager(c) {
	eagerUnits.add(c);
	singletonUnits.add(c);
	return c;
}

const factoryUnits = new WeakSet();
export function factory(c) {
	factoryUnits.add(c);
	return c;
}

class DependencyStack {
	constructor(iterable = []) {
		this._order = Array.from(iterable).slice();
		this._set = new Set(this._order);
	}

	push(v) {
		if (this._set.has(v)) {
			throw new CircularDependencyError([...this._order, v]);
		}
		this._order.push(v);
		this._set.add(v);
	}

	pop() {
		const v = this._order.pop();
		this._set.delete(v);
	}
}

export function makeToolbox(unitDefinitions) {
	const toolbox = {};
	const toolboxProxy = new Proxy(toolbox, {
		get(target, prop) {
			if (prop in target) {
				return target[prop];
			}
			throw new NonexistantDependencyError(prop);
		},
	});
	const unitsToInstantiate = new Set();

	const dependencyStack = new DependencyStack();

	for (const [name, unit] of Object.entries(unitDefinitions)) {
		if (eagerUnits.has(unit)) {
			unitsToInstantiate.add(name);
		}

		let init;
		if (factoryUnits.has(unit)) {
			init = () => unit(toolboxProxy);
		} else {
			init = () => new unit(toolboxProxy);
		}

		if (singletonUnits.has(unit)) {
			init = memoize(init);
		}

		Object.defineProperty(toolbox, name, {
			enumerable: true,
			configurable: false,
			get() {
				dependencyStack.push(name);
				const obj = init();
				dependencyStack.pop();
				return obj;
			},
		});
	}

	for (const unitName of unitsToInstantiate) {
		toolboxProxy[unitName];
	}

	return toolboxProxy;
}

export class CircularDependencyError extends Error {
	constructor(depStack) {
		super(`Circular dependency: ${depStack.join(" -> ")}`);
	}
}

export class NonexistantDependencyError extends Error {
	constructor(name) {
		super(`Non-existant dependency: ${name}`);
	}
}
