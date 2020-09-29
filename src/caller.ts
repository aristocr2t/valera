export class Caller {
	static get(fromFileName: string): Caller {
		const origPrepareStackTrace = Error.prepareStackTrace;
		Error.prepareStackTrace = (e, s) => s;

		const err = new Error();
		let callerfile: string | null;
		let cs: NodeJS.CallSite | undefined;

		const callSites = Array.from(err.stack ?? []) as unknown as NodeJS.CallSite[];

		for (let i = 1, foundFromFilename = false; i < callSites.length; i++) {
			callerfile = callSites[i].getFileName();

			if (!foundFromFilename && callerfile === fromFileName) {
				foundFromFilename = true;
			} else if (foundFromFilename && fromFileName !== callerfile) {
				cs = callSites[i];

				break;
			}
		}

		Error.prepareStackTrace = origPrepareStackTrace;

		return new Caller(cs);
	}

	readonly fileName: string;
	readonly methodName: string;
	readonly functionName: string;
	readonly typeName: string;
	readonly line: number;
	readonly column: number;
	readonly evalOrigin: string;
	readonly isToplevel: boolean;
	readonly isEval: boolean;
	readonly isNative: boolean;
	readonly isConstructor: boolean;

	constructor(cs?: NodeJS.CallSite) {
		if (cs) {
			this.fileName = cs.getFileName() ?? '';
			this.methodName = cs.getMethodName() ?? '';
			this.functionName = cs.getFunctionName() ?? '';
			this.typeName = cs.getTypeName() ?? '';
			this.line = cs.getLineNumber() ?? 0;
			this.column = cs.getColumnNumber() ?? 0;
			this.evalOrigin = cs.getEvalOrigin() ?? '';
			this.isToplevel = cs.isToplevel();
			this.isEval = cs.isEval();
			this.isNative = cs.isNative();
			this.isConstructor = cs.isConstructor();
		} else {
			this.fileName = '';
			this.methodName = '';
			this.functionName = '';
			this.typeName = '';
			this.line = 0;
			this.column = 0;
			this.evalOrigin = '';
			this.isToplevel = false;
			this.isEval = false;
			this.isNative = false;
			this.isConstructor = false;
		}
	}
}
