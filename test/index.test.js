/* eslint-env node,mocha,jest */

/* eslint-disable no-unused-vars */
const BluebirdPromise = require("bluebird");
const Context = require("../index").default;

BluebirdPromise.config({
	// Enable cancellation
	cancellation: true,
	// Enable async hooks
	asyncHooks: true
});

/* eslint-enable no-unused-vars */
describe("Context", () => {
	afterEach(() => {
		jest.useRealTimers();
	});

	it("should verify child context is cancelled when parent context is cancelled", async () => {
		jest.useFakeTimers();

		const parentCtxDoneCallback = jest.fn();
		const ctxDoneCallback = jest.fn();

		const parentCtx = new Context();
		const ctx = new Context({ Parent: parentCtx });
		parentCtx.on("done", parentCtxDoneCallback);
		ctx.on("done", ctxDoneCallback);

		expect(parentCtxDoneCallback).not.toBeCalled();
		expect(ctxDoneCallback).not.toBeCalled();
		expect(parentCtx.Done()).toBe(false);
		expect(ctx.Done()).toBe(false);

		parentCtx.Cancel();
		expect(parentCtxDoneCallback).toHaveBeenCalledTimes(1);
		expect(parentCtxDoneCallback).toHaveBeenCalledWith(Context.ERROR_CONTEXT_CANCELLED);
		expect(ctxDoneCallback).toHaveBeenCalledTimes(1);
		expect(ctxDoneCallback).toHaveBeenCalledWith(Context.ERROR_CONTEXT_CANCELLED);
		expect(parentCtx.Done()).toBe(true);
		expect(ctx.Done()).toBe(true);

		parentCtx.Cancel();
		expect(parentCtxDoneCallback).toHaveBeenCalledTimes(1);
		expect(ctxDoneCallback).toHaveBeenCalledTimes(1);
		expect(parentCtx.Done()).toBe(true);
		expect(ctx.Done()).toBe(true);
	});

	it("should verify child context is cancelled when child context is cancelled", async () => {
		jest.useFakeTimers();

		const parentCtxDoneCallback = jest.fn();
		const ctxDoneCallback = jest.fn();

		const parentCtx = new Context();
		const ctx = new Context({ Parent: parentCtx });
		parentCtx.on("done", parentCtxDoneCallback);
		ctx.on("done", ctxDoneCallback);

		expect(parentCtxDoneCallback).not.toBeCalled();
		expect(ctxDoneCallback).not.toBeCalled();
		expect(parentCtx.Done()).toBe(false);
		expect(ctx.Done()).toBe(false);

		ctx.Cancel();
		expect(parentCtxDoneCallback).not.toBeCalled();
		expect(ctxDoneCallback).toHaveBeenCalledTimes(1);
		expect(ctxDoneCallback).toHaveBeenCalledWith(Context.ERROR_CONTEXT_CANCELLED);
		expect(parentCtx.Done()).toBe(false);
		expect(ctx.Done()).toBe(true);

		ctx.Cancel();
		expect(parentCtxDoneCallback).not.toBeCalled();
		expect(ctxDoneCallback).toHaveBeenCalledTimes(1);
		expect(parentCtx.Done()).toBe(false);
		expect(ctx.Done()).toBe(true);
	});

	it("should verify child context is cancelled when context times out", async () => {
		jest.useFakeTimers();

		const parentCtxDoneCallback = jest.fn();
		const ctxDoneCallback = jest.fn();

		const parentCtx = new Context({ Timeout: 2500 });
		const ctx = new Context({ Parent: parentCtx, Timeout: 1500 });
		parentCtx.on("done", parentCtxDoneCallback);
		ctx.on("done", ctxDoneCallback);

		expect(parentCtxDoneCallback).not.toBeCalled();
		expect(ctxDoneCallback).not.toBeCalled();
		expect(parentCtx.Done()).toBe(false);
		expect(ctx.Done()).toBe(false);

		jest.advanceTimersByTime(1000);
		expect(parentCtxDoneCallback).not.toBeCalled();
		expect(ctxDoneCallback).not.toBeCalled();
		expect(parentCtx.Done()).toBe(false);
		expect(ctx.Done()).toBe(false);

		jest.advanceTimersByTime(1000);
		expect(parentCtxDoneCallback).not.toBeCalled();
		expect(ctxDoneCallback).toHaveBeenCalledTimes(1);
		expect(ctxDoneCallback).toHaveBeenCalledWith(Context.ERROR_CONTEXT_TIMED_OUT);
		expect(parentCtx.Done()).toBe(false);
		expect(ctx.Done()).toBe(true);

		jest.advanceTimersByTime(1000);
		expect(parentCtxDoneCallback).toHaveBeenCalledTimes(1);
		expect(parentCtxDoneCallback).toHaveBeenCalledWith(Context.ERROR_CONTEXT_TIMED_OUT);
		expect(ctxDoneCallback).toHaveBeenCalledTimes(1);
		expect(parentCtx.Done()).toBe(true);
		expect(ctx.Done()).toBe(true);
	});

	it("should verify context.WhenDone() resolves when context is cancelled", async () => {
		jest.useFakeTimers();

		const ctxDoneCallback = jest.fn();

		const ctx = new Context({ Timeout: 1500 });
		ctx.on("done", ctxDoneCallback);

		expect(ctxDoneCallback).not.toBeCalled();
		expect(ctx.Done()).toBe(false);

		jest.advanceTimersByTime(1000);
		expect(ctxDoneCallback).not.toBeCalled();
		expect(ctx.Done()).toBe(false);

		await expect(
			BluebirdPromise.all([
				ctx.WhenDone(),
				new BluebirdPromise((resolve) => {
					jest.advanceTimersByTime(1000);
					resolve();
				})
			])
		).resolves.not.toThrow();

		expect(ctxDoneCallback).toHaveBeenCalledTimes(1);
		expect(ctxDoneCallback).toHaveBeenCalledWith(Context.ERROR_CONTEXT_TIMED_OUT);
		expect(ctx.Done()).toBe(true);

		const ctxDoneCallback2 = jest.fn();
		ctx.on("done", ctxDoneCallback2);
		ctx.Restore();

		expect(ctxDoneCallback2).not.toBeCalled();
		expect(ctx.Done()).toBe(false);

		jest.advanceTimersByTime(1000);
		expect(ctxDoneCallback2).not.toBeCalled();
		expect(ctx.Done()).toBe(false);

		await expect(
			BluebirdPromise.all([
				ctx.WhenDone(),
				new BluebirdPromise((resolve) => {
					jest.advanceTimersByTime(1000);
					resolve();
				})
			])
		).resolves.not.toThrow();

		expect(ctxDoneCallback2).toHaveBeenCalledTimes(1);
		expect(ctxDoneCallback2).toHaveBeenCalledWith(Context.ERROR_CONTEXT_TIMED_OUT);
		expect(ctx.Done()).toBe(true);
	});
});
