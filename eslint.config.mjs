import globals from "globals";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginImport from "eslint-plugin-import";

export default tseslint.config(
  // 1. Global ignores and default configs
  {
    ignores: [
      "node_modules/",
      "dist/",
      "dashboard/dist/",
      "dashboard/node_modules/"
    ],
  },
  js.configs.recommended,

  // 2. Backend CommonJS files (.js)
  {
    files: ["src/**/*.js", "scripts/**/*.js", "config/**/*.js", "server.js"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      import: pluginImport,
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },

  // 3. CJS/Module config files and root ESM configs
  {
    files: [
      "**/*.cjs",
      "migrations/**/*.js",
      "dashboard/tailwind.config.mjs",
      "vitest.config.mjs",
      "eslint.config.mjs"
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        module: "readonly",
        URL: "readonly"
      },
    }
  },

  // 4. TypeScript files
  {
    files: ["**/*.ts"],
    extends: tseslint.configs.recommended,
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },

  // 5. Old migration files
  {
    files: ["migrations/_archive/**/*.js"],
    languageOptions: {
      globals: {
        Sequelize: "readonly",
      }
    }
  },

  // 6. Frontend/Dashboard specific config (React)
  {
    files: ["dashboard/src/**/*.{js,jsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
    },
    rules: {
      ...pluginReact.configs.recommended.rules,
      ...pluginReactHooks.configs.recommended.rules,
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off"
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  }
  ,
  // 7. Test files (Vitest globals)
  {
    files: ["src/**/*.test.js", "tests/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        vi: "readonly",
      },
    },
  }
);
