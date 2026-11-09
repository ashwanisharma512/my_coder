const esbuild = require("esbuild");

const isWatch = process.argv.includes("--watch");

async function main() {
  const ctx = await esbuild.context({
    entryPoints: {
      "extension": "src/extension.ts",
      "test/runTest": "src/test/runTest.ts",
      "test/suite/index": "src/test/suite/index.ts",
      "test/suite/extension.test": "src/test/suite/extension.test.ts"
    },
    bundle: true,
    format: "cjs",
    minify: false,
    sourcemap: true,
    sourcesContent: false,
    platform: "node",
    outdir: "dist",
    external: ["vscode", "mocha", "@vscode/test-electron"],
    logLevel: "info",
  });

  if (isWatch) {
    console.log("Watching for changes in extension host...");
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    console.log("Extension host build complete.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
