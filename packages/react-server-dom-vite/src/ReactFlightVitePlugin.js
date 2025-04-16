/**
 *
 * @param {{
*    getClientReferences: () => Record<string, string>;
*    getServerReferences: () => Record<string, string>;
*  }} rscOptions
* @returns {import("vite").Plugin}
*/
export default function vitePluginRsc(rscOptions) {
 return [
   {
     name: "rsc-core",
     configEnvironment() {
       return {
         resolve: {
           noExternal: [
             "react-server-dom-vite/plugin-runtime-server",
             "react-server-dom-vite/plugin-runtime-client",
           ],
         },
       };
     },
     resolveId(source) {
       if (source.startsWith("virtual:react-server-dom-vite/")) {
         return "\0" + source;
       }
     },
     load(id) {
       if (id === "\0virtual:react-server-dom-vite/client-references") {
         const code = generateDynamicImportCode(rscOptions.getClientReferences())
         return { code: `export default {${code}}`, map: { mappings: "" } };
       }
       if (id === "\0virtual:react-server-dom-vite/server-references") {
         const code = generateDynamicImportCode(rscOptions.getServerReferences())
         return { code: `export default {${code}}`, map: { mappings: "" } };
       }
       if (id === "\0virtual:react-server-dom-vite/client-runtime") {
         return { code: CLIENT_RUNTIME_CODE, map: { mappings: "" } };
       }
       if (id === "\0virtual:react-server-dom-vite/server-runtime") {
         return { code: SERVER_RUNTIME_CODE, map: { mappings: "" } };
       }
     },
   },
 ];
}

/**
* @param {Record<string, string>} map
* @returns {string}
*/
function generateDynamicImportCode(map) {
 let code = Object.entries(map)
   .map(
     ([key, id]) =>
       `${JSON.stringify(key)}: () => import(${JSON.stringify(id)}),`,
   )
   .join("\n");
 return code;
}

const CLIENT_RUNTIME_CODE = `
export const clientReferenceManifest = {
 resolveClientReference(reference) {
   const [id, name] = reference.split("#");
   let resolved;
   return {
     async preload() {
       let mod;
       if (import.meta.env.DEV) {
         mod = await import(/* @vite-ignore */ id);
       } else {
         // @ts-ignore
         const references = await import("virtual:react-server-dom-vite/client-references");
         mod = await references.default[id]();
       }
       resolved = mod[name];
     },
     get() {
       return resolved;
     },
   };
 },
};
`

const SERVER_RUNTIME_CODE = `
export const serverReferenceManifest = {
 resolveServerReference(reference) {
   const [id, name] = reference.split("#");
   let resolved;
   return {
     async preload() {
       let mod;
       if (import.meta.env.DEV) {
         mod = await import(/* @vite-ignore */ id);
       } else {
         const references = await import("virtual:react-server-dom-vite/server-references");
         mod = await references.default[id]();
       }
       resolved = mod[name];
     },
     get() {
       return resolved;
     },
   };
 },
};

export const clientReferenceMetadataManifest = {
 resolveClientReferenceMetadata(metadata) {
   return metadata.$$id;
 },
};
`
