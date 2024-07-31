import { rm } from 'node:fs/promises';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import vitePluginRequire from 'vite-plugin-require';
import solidPlugin from 'vite-plugin-solid';
// import devtools from 'solid-devtools/vite';

export default defineConfig({
  plugins: [
    {
      name: "Clean assets folder",
      async buildStart() {
        await rm(resolve(__dirname, '../lightweight_pycharts/frontend/assets'), {recursive:true, force:true}); 
      }
    },
    /* 
    Uncomment the following line to enable solid-devtools.
    For more info see https://github.com/thetarnav/solid-devtools/tree/main/packages/extension#readme
    */
    // devtools(),
    solidPlugin(),
    vitePluginRequire()
  ],
  server: {
    port: 3000,
  },
  root:__dirname,
  build: {
    minify: true,
    target: 'esnext',
    outDir: '../lightweight_pycharts/frontend'
  },
});

