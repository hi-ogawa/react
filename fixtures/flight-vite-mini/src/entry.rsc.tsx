import ReactServer from "react-server-dom-vite/server";
import type { ReactFormState } from "react-dom/client";
import { fromPipeableToWebReadable } from "./utils/fetch";
import { Router } from "./app/routes";

export interface RscHandlerResult {
	stream: ReadableStream<Uint8Array>;
}

export interface ServerPayload {
	root: React.ReactNode;
	formState?: ReactFormState;
	returnValue?: unknown;
}

export async function handler(
	url: URL,
	request: Request,
): Promise<RscHandlerResult> {
	ReactServer.setRequireModule(async (id) => {
		if (import.meta.env.DEV) {
			return import(/* @vite-ignore */ id);
		} else {
			const references = await import("virtual:build-server-references");
			return references.default[id]();
		}
	});

	// handle action
	let returnValue: unknown | undefined;
	let formState: ReactFormState | undefined;
	if (request.method === "POST") {
		const actionId = url.searchParams.get("__rsc");
		if (actionId) {
			// client stream request
			const contentType = request.headers.get("content-type");
			const body = contentType?.startsWith("multipart/form-data")
				? await request.formData()
				: await request.text();
			const args = await ReactServer.decodeReply(body);
			const action = await ReactServer.loadServerAction(actionId);
			returnValue = await (action as any).apply(null, args);
		} else {
			// progressive enhancement
			const formData = await request.formData();
			const decodedAction = await ReactServer.decodeAction(formData);
			formState = await ReactServer.decodeFormState(
				await decodedAction(),
				formData,
			);
		}
	}

	// render flight stream
	const stream = fromPipeableToWebReadable(
		ReactServer.renderToPipeableStream<ServerPayload>(
			{
				root: <Router url={url} />,
				returnValue,
				formState,
			},
			undefined,
			{},
		),
	);

	return {
		stream,
	};
}
