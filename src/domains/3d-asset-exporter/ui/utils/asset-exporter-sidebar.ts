/** Asset Exporter sidebar chrome copy and class tokens. */

export enum AssetExporterSidebarCopy {
  Wordmark = 'ASSET EXPORTER',
  PromptLabel = 'MASTER PROMPT',
  PromptPlaceholder = 'Define the art style for exported assets…',
  EmptyProject = 'Please select or create a project to start.',
  SelectAll = 'Select all',
  ClearSelection = 'Clear selection',
  ExportAll = 'Export all',
  ExportSelectedPrefix = 'Export',
  ExportSelectedSuffix = 'selected',
  ExportingPrefix = 'Exporting',
}

export enum AssetExporterAriaRole {
  Progressbar = 'progressbar',
}

export enum AssetExporterSidebarStorage {
  Panel = 'asset-exporter',
}

export enum AssetExporterSidebarClass {
  Body = 'flex flex-col',
  Divider = 'h-px bg-border/55 mt-5 mb-4',
  FooterBar = 'relative flex gap-[7px] px-3.5 pt-3 pb-3.5 border-t border-border/70',
  Ghost = 'flex-1 inline-flex items-center justify-center gap-2 h-[34px] rounded-lg shadow-[inset_0_0_0_1px_hsl(var(--border)/0.85)] text-[12.5px] text-foreground/85 transition-all duration-150 ease-in-out hover:bg-accent/70 disabled:text-muted-foreground/45 disabled:shadow-[inset_0_0_0_1px_hsl(var(--border)/0.5)] disabled:pointer-events-none',
  Export = 'flex-1 inline-flex items-center justify-center gap-2 h-[34px] rounded-lg bg-primary/14 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.45)] text-[12.5px] text-primary transition-all duration-150 ease-in-out hover:bg-primary/20 disabled:bg-transparent disabled:text-muted-foreground/45 disabled:shadow-[inset_0_0_0_1px_hsl(var(--border)/0.5)] disabled:pointer-events-none',
  Spinner = 'h-3 w-3 rounded-full shadow-[inset_0_0_0_2px_hsl(var(--primary)/0.3)] border-t-2 border-primary animate-spin',
}

export function formatExportSelectedLabel(count: number): string {
  return `${AssetExporterSidebarCopy.ExportSelectedPrefix} ${count} ${AssetExporterSidebarCopy.ExportSelectedSuffix}`
}

export function formatExportingLabel(count: number): string {
  return `${AssetExporterSidebarCopy.ExportingPrefix} ${count}…`
}
