import { defineConfig } from 'vite';
import obfuscator from 'rollup-plugin-obfuscator';

export default defineConfig(({ command }) => ({
  // GitHub Pages 하위 경로(https://user.github.io/repo/)에서도 동작하도록 상대 경로 사용
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2019',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: { drop_console: true, passes: 2 },
      mangle: { toplevel: true },
      format: { comments: false },
    },
    rollupOptions: {
      output: { entryFileNames: 'assets/[hash].js', chunkFileNames: 'assets/[hash].js', assetFileNames: 'assets/[hash][extname]' },
    },
  },
  plugins: [
    // 빌드 때만 난독화 (dev 서버에서는 원본 그대로)
    command === 'build' &&
      obfuscator({
        global: false,
        options: {
          compact: true,
          controlFlowFlattening: true,
          controlFlowFlatteningThreshold: 0.6,
          deadCodeInjection: true,
          deadCodeInjectionThreshold: 0.2,
          stringArray: true,
          stringArrayEncoding: ['base64'],
          stringArrayThreshold: 0.8,
          stringArrayRotate: true,
          stringArrayShuffle: true,
          splitStrings: true,
          splitStringsChunkLength: 6,
          identifierNamesGenerator: 'hexadecimal',
          renameGlobals: false,
          selfDefending: false,
          simplify: true,
          transformObjectKeys: true,
          unicodeEscapeSequence: false,
        },
      }),
  ].filter(Boolean),
}));
