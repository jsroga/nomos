import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'
import {
  DomainSidebar,
  SidebarEmptyState,
  SidebarLabel,
  SidebarSection,
  SidebarSliderRow,
} from '@/components/DomainSidebar'
import {
  SIDEBAR_DEFAULT_WIDTH,
  SidebarCollapseCopy,
  SidebarPosition,
} from '@/components/DomainSidebar/constants/domain-sidebar'
import { Switch } from '@/components/Switch'
import { enumArgType } from './_helpers/arg-types'
import { noopChange } from './_helpers/handlers'

const meta = {
  title: 'Primitives/DomainSidebar',
  component: DomainSidebar,
  args: {
    header: 'World generation',
    defaultWidth: SIDEBAR_DEFAULT_WIDTH,
    position: SidebarPosition.Left,
  },
  argTypes: {
    position: enumArgType(SidebarPosition),
    collapsible: { control: 'boolean' },
  },
} satisfies Meta<typeof DomainSidebar>

export default meta
type Story = StoryObj<typeof DomainSidebar>

function WorldGenBody() {
  return (
    <div className="grid gap-5 p-4">
      <SidebarSection title="Terrain">
        <SidebarSliderRow label="Roughness" value={40} onChange={noopChange} />
      </SidebarSection>
      <div className="flex items-center justify-between px-1">
        <SidebarLabel htmlFor="rivers">Generate rivers</SidebarLabel>
        <Switch id="rivers" defaultChecked />
      </div>
    </div>
  )
}

export const DefaultWidth: Story = {
  render: args => (
    <div className="h-[420px] overflow-hidden rounded-lg border border-border">
      <DomainSidebar {...args}>
        <WorldGenBody />
      </DomainSidebar>
    </div>
  ),
}

export const Collapsed: Story = {
  args: {
    collapsible: true,
    storageKey: 'storybook-sidebar-collapsed',
    collapseStorageId: 'collapsed-story',
  },
  render: args => (
    <div className="h-[420px] overflow-hidden rounded-lg border border-border">
      <DomainSidebar {...args}>
        <WorldGenBody />
      </DomainSidebar>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const button = await within(canvasElement).findByRole('button', {
      name: SidebarCollapseCopy.Collapse,
    })
    await userEvent.click(button)
  },
}

export const Narrow: Story = {
  args: {
    defaultWidth: 280,
  },
  render: args => (
    <div className="h-[420px] overflow-hidden rounded-lg border border-border">
      <DomainSidebar {...args}>
        <WorldGenBody />
      </DomainSidebar>
    </div>
  ),
}

export const WithControls: Story = {
  args: {
    collapsible: true,
    storageKey: 'storybook-sidebar-controls',
    footer: <p className="px-4 py-3 text-xs text-muted-foreground">12 tiles queued</p>,
  },
  render: args => (
    <div className="h-[420px] overflow-hidden rounded-lg border border-border">
      <DomainSidebar {...args}>
        <WorldGenBody />
      </DomainSidebar>
    </div>
  ),
}

export const EmptyBody: Story = {
  render: args => (
    <div className="h-[420px] overflow-hidden rounded-lg border border-border">
      <DomainSidebar {...args}>
        <SidebarEmptyState message="No generation settings yet." />
      </DomainSidebar>
    </div>
  ),
}
