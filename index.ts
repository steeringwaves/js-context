import * as BluebirdPromise from "bluebird";
import * as _ from "lodash";

import { EventEmitter } from "events";

BluebirdPromise.config({
	// Enable cancellation
	cancellation: true,
	// Enable async hooks
	asyncHooks: true
});

export interface Config {
	Parent?: Context;
	Timeout?: number;
}

export default class Context extends EventEmitter {
	static ERROR_CONTEXT_CANCELLED: Error = new Error("Context cancelled");

	static ERROR_CONTEXT_TIMED_OUT: Error = new Error("Context timed out");

	private _done: boolean = false;

	private _parent: Context | undefined = undefined;

	private _timeoutMS: number = 0;

	private _timeout: NodeJS.Timeout | undefined;

	constructor(config?: Config) {
		super();
		this.setMaxListeners(Infinity);

		const opts: Config = _.defaultsDeep(config, <Config>{
			Parent: undefined,
			Timeout: 0
		});

		if (opts.Parent) {
			this._parent = opts.Parent;
		}

		if (this._parent) {
			this._parent.on("done", (e?: Error) => {
				if (this._done) {
					return;
				}
				this._done = true;
				if (!e) {
					e = Context.ERROR_CONTEXT_CANCELLED;
				}
				this.emit("done", e);
			});
		}

		if (this._parent) {
			if (this._parent.Done()) {
				if (!this._done) {
					this._done = true;
					this.emit("done", Context.ERROR_CONTEXT_CANCELLED);
				}
			}
		}

		if ("number" === typeof opts.Timeout) {
			if (opts.Timeout > 0) {
				this._timeoutMS = opts.Timeout;

				this._timeout = setTimeout(() => {
					this.cleanup(); // run prior to running Cancel()

					this.Cancel(Context.ERROR_CONTEXT_TIMED_OUT.message);
				}, this._timeoutMS);
			}
		}
	}

	private cleanup() {
		if (this._timeout) {
			clearTimeout(this._timeout);
			this._timeout = undefined;
		}
	}

	public Cancel(reason?: string | Error): void {
		if (this._done) {
			return;
		}

		this._done = true;
		let e = Context.ERROR_CONTEXT_CANCELLED;
		if (reason && reason instanceof Error) {
			e = <Error>reason;
		} else if (reason) {
			e = new Error(<string>reason);
		}
		this.emit("done", e);
		this.cleanup();
	}

	public cancel(reason?: string | Error): void {
		this.Cancel(reason);
	}

	public Restore(): void {
		if (!this._done) {
			return;
		}

		if (this._parent) {
			if (this._parent.Done()) {
				return;
			}
		}

		this._done = false;
		this.cleanup();

		if (this._timeoutMS > 0) {
			this._timeout = setTimeout(() => {
				this.cleanup(); // run prior to running Cancel()

				this.Cancel(Context.ERROR_CONTEXT_TIMED_OUT.message);
			}, this._timeoutMS);
		}
	}

	public restore(): void {
		this.Restore();
	}

	public Done(): boolean {
		return this._done;
	}

	public done(): boolean {
		return this._done;
	}

	public WhenDone(): BluebirdPromise<string> {
		return new BluebirdPromise((resolve: (...args: any) => void) => {
			if (this._done) {
				resolve(Context.ERROR_CONTEXT_CANCELLED.message);
				return;
			}
			this.once("done", resolve);
		});
	}
}
