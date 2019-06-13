var assert = require('assert');

async function loadWasm() {
	const loader = require('assemblyscript/lib/loader');
	const imports = {
		env: {
			memoryBase: 0,
			tableBase: 0,
			memory: new WebAssembly.Memory({ initial: 256 }),
			table: new WebAssembly.Table({ initial: 256, element: 'anyfunc' }),
			abort: alert
		}
	};
	module = await loader.instantiateStreaming(fetch('build/optimized.wasm'), imports);
	return module;
}

/**
 * Tests
 */
loadWasm().then((module) => {
	/**
     * __getString: Reads (copies) the value of a string from the modules memory
     * Takes a ref as param, in this case an exported string const
     */
	// assert.strictEqual(module.__getString(module.LIFE_MOTTO), "Existance is pain");
	assert.strictEqual(module.__getString(module.LIFE_MOTTO), 'YOLO');

	{
		let str = 'Hello world!';
		/**
         * * __allocString: 
         * Takes a string parameter.
         * Allocates a new string in the module's memory. 
         * Returns a reference to that string.
         * * __retain: 
         * Takes a reference as paramter (number).
         * Retains a reference externally, making sure that it doesn't become collected 
         * prematurely.
         * Returns the reference.
         * * __getString:
         * Reads (copies) the value of a string from the module's memory
         */
		let ref = module.__retain(module.__allocString(str));
		assert.strictEqual(module.__getString(ref), str);

		/**
         *  * strlen: 
         * Exported TS function that takes a string on TS side as param. 
         * Use ref from above to achieve this. 
         */
		assert.strictEqual(module.strlen(ref), str.length);

		/**
         * * __release: 
         * Takes a reference as parameter.
         * Releases a previously retained reference to an object, allowing the 
         * runtime to collect it once its reference count reaches zero.
         */
		module.__release(ref);
	}

	{
		var arr = [ 1, 2, 3, 4, 5 ];
		/**
         * * __allocArray:
         * Takes an id and an array as parameters
         * Allocates a new array in the modules mem. 
         * The id is the unique runtime id of the respective array class.
         * Best way to know the id is an export - see index.ts 
         * Returns reference to it.
         */
		let refArr = module.__retain(module.__allocArray(module.INT32ARRAY_ID, arr));
		// assert(module.__instanceof(ref, module.FLOAT32ARRAY_ID));
		assert(module.__instanceof(refArr, module.INT32ARRAY_ID));

		/**
         * * __getArray:
         * Takes a reference as param.
         * Reads (copies) the values of an array from the modules mem. 
         * Returns number[]
         */
		assert.deepEqual(module.__getArray(refArr), arr);
		console.log('The array: ', module.__getArray(refArr));

		/**
         * * sum:
         * In the same way that strlen takes the reference to pass string
         * as param, sum on TS side takes Int32Array as param, achieve this 
         * using the ref. 
         */
		let sum = module.sum(refArr);
		console.log('Sum of array: ', sum);

		module.__release(refArr);
	}

	{
		let arr = [ 1, 2, 3, 4, 5 ];
		let ref = module.__retain(module.__allocArray(module.ARRAYI32_ID, arr));
		module.changeLength(ref, 3);
		assert.deepEqual(module.__getArray(ref), [ 1, 2, 3 ]);
		module.__release(ref);
	}

	assert.strictEqual(module.varadd(2, 3), 5);

	{
		var car = new module.Car(5);
		assert.strictEqual(car.numDoors, 5);
		assert.strictEqual(car.isDoorsOpen, 0);
		car.openDoors();
		assert.strictEqual(car.isDoorsOpen, 1);
		car.closeDoors();
		assert.strictEqual(car.isDoorsOpen, 0);
		module.__release(car); // uses Car.prototype.valueOf to obtain `thisPtr`
	}

	// // should be able to use trace
	// module.dotrace(42);
});
