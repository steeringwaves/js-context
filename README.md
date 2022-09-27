# @steeringwaves/context

![workflow](https://github.com/github/docs/actions/workflows/test.yml/badge.svg)

A typescript context library.

## Example

```js
const Context = require("@steeringwaves/context").default;

const parent = new Context();
const child = new Context({ Parent: parentCtx });
parent.on("done", () => {
	console.log("parent done");
});

child.on("done", () => {
	console.log("child done");
});

console.log(child.Done()); // false

parent.Cancel();

console.log(child.Done()); // true

```
