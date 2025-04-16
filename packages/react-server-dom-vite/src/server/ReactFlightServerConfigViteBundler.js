/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactClientValue} from 'react-server/src/ReactFlightServer';

import type {
  ClientReference,
  ServerReference,
} from '../ReactFlightViteReferences';

export type {ClientReference, ServerReference};

export type ClientManifest = {
  resolveClientReferenceMetadata<T>(
    clientReference: ClientReference<T>,
  ): ClientReferenceMetadata,
  resolveServerReference<T>(id: ServerReferenceId): ClientReference<T>,
}; // API for loading client reference metadata and server references

export type ServerReferenceId = string;

export type ClientReferenceMetadata = mixed;

export type ClientReferenceKey = string;

export {
  isClientReference,
  isServerReference,
} from '../ReactFlightViteReferences';

export function getClientReferenceKey(
  reference: ClientReference<any>,
): ClientReferenceKey {
  return reference.$$id;
}

export function resolveClientReferenceMetadata<T>(
  config: ClientManifest,
  clientReference: ClientReference<T>,
): ClientReferenceMetadata {
  return config.resolveClientReferenceMetadata(clientReference);
}

export function getServerReferenceId<T>(
  config: ClientManifest,
  serverReference: ServerReference<T>,
): ServerReferenceId {
  return serverReference.$$id;
}

export function getServerReferenceBoundArguments<T>(
  config: ClientManifest,
  serverReference: ServerReference<T>,
): null | Array<ReactClientValue> {
  return serverReference.$$bound;
}

export function getServerReferenceLocation<T>(
  config: ClientManifest,
  serverReference: ServerReference<T>,
): void | Error {
  return serverReference.$$location;
}

let requireModule_;

export function setRequireModule(fn) {
  requireModule_ = fn;
}

export function loadServerAction(id) {
  const [id2, name] = id.split("#");
  return requireModule_(id2).then(mod => mod[name])
}

export const serverReferenceManifest = {
  resolveServerReference(reference) {
    const [id, name] = reference.split("#");
    let resolved;
    return {
      preload() {
        return requireModule_(id).then(mod => {
          resolved = mod[name];
        })
      },
      get() {
        return resolved;
      },
    };
  },
};

export const clientReferenceMetadataManifest =
	{
		resolveClientReferenceMetadata(metadata) {
			return metadata.$$id;
		},
	}
