import { defineConfig } from "ez-docs/config";

export default defineConfig({
  site: {
    title: "__TITLE__",
  },

  i18n: {
    defaultLocale: "__DEFAULT_LOCALE__",
    locales: __LOCALES__,
  },

  deploy: {
    target: "__DEPLOY_TARGET__",
  },
});
