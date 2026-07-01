Assessment written to `findings/assess.md`.

Verdict: interior-designer is still a legacy flat module, not the target slice shape. The first three fixes should be:
1. Split the 1661-line Zustand god store into UI state vs query/io/core.
2. Remove the browser→Supabase `renameDesign` write path.
3. Reshape async export/retexture flows around module-owned tasks/jobs and add a public `index.ts` barrel.