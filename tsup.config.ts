import { defineConfig } from "tsup";

export default defineConfig(options => {
    const isDevelopment = options.env?.NODE_ENV === "development";

    return {
        entry: ["src/index.ts"],
        sourcemap: isDevelopment,
        dts: true,
        clean: true,
        esbuildOptions(options) {
            options.minifyWhitespace = true;
            options.minifySyntax = true;
            options.minifyIdentifiers = false;
            options.keepNames = true;
        },
        loader: {
            ".svg": "dataurl"
        },
    };
});