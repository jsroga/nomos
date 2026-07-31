# Dark-factory Trigger tasks (opt-in)

`cursor-execute` imports `@cursor/sdk`, which Trigger’s local worker cannot bundle
(`bun:sqlite`, vendor paths, `.d.ts.map` loaders).

Keep this folder **out of** `trigger.config.ts` `dirs` for normal tile/image work.

To register it deliberately, add a second path only when you need headless `/execute`:

```ts
dirs: ['./src/trigger', './src/trigger-dark-factory'],
```

…and ensure `@cursor/sdk` is listed under `build.external`.
