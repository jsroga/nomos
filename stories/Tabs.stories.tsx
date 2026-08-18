import type { Meta, StoryObj } from '@storybook/react-vite'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/Tabs'

const meta = {
  title: 'Primitives/Tabs',
  component: Tabs,
  args: {
    defaultValue: 'bible',
  },
} satisfies Meta<typeof Tabs>

export default meta
type Story = StoryObj<typeof meta>

export const FirstSelected: Story = {
  render: args => (
    <Tabs {...args} className="w-96">
      <TabsList>
        <TabsTrigger value="bible">Bible</TabsTrigger>
        <TabsTrigger value="beats">Beats</TabsTrigger>
        <TabsTrigger value="script">Script</TabsTrigger>
      </TabsList>
      <TabsContent value="bible">World bible is the source of truth.</TabsContent>
      <TabsContent value="beats">Cork board for this episode.</TabsContent>
      <TabsContent value="script">Draft pages.</TabsContent>
    </Tabs>
  ),
}

export const OtherSelected: Story = {
  args: { defaultValue: 'script' },
  render: args => (
    <Tabs {...args} className="w-96">
      <TabsList>
        <TabsTrigger value="bible">Bible</TabsTrigger>
        <TabsTrigger value="beats">Beats</TabsTrigger>
        <TabsTrigger value="script">Script</TabsTrigger>
      </TabsList>
      <TabsContent value="bible">World bible is the source of truth.</TabsContent>
      <TabsContent value="beats">Cork board for this episode.</TabsContent>
      <TabsContent value="script">Draft pages.</TabsContent>
    </Tabs>
  ),
}

export const DisabledTrigger: Story = {
  render: args => (
    <Tabs {...args} className="w-96">
      <TabsList>
        <TabsTrigger value="bible">Bible</TabsTrigger>
        <TabsTrigger value="beats" disabled>
          Beats
        </TabsTrigger>
        <TabsTrigger value="script">Script</TabsTrigger>
      </TabsList>
      <TabsContent value="bible">Beats stay locked until the premise is saved.</TabsContent>
      <TabsContent value="script">Draft pages.</TabsContent>
    </Tabs>
  ),
}

export const ManyTabs: Story = {
  args: { defaultValue: 'ep-1' },
  render: args => (
    <Tabs {...args} className="w-[32rem]">
      <TabsList>
        <TabsTrigger value="ep-1">Ep 1</TabsTrigger>
        <TabsTrigger value="ep-2">Ep 2</TabsTrigger>
        <TabsTrigger value="ep-3">Ep 3</TabsTrigger>
        <TabsTrigger value="ep-4">Ep 4</TabsTrigger>
        <TabsTrigger value="ep-5">Ep 5</TabsTrigger>
      </TabsList>
      <TabsContent value="ep-1">Cold open.</TabsContent>
      <TabsContent value="ep-2">Inciting incident.</TabsContent>
      <TabsContent value="ep-3">Midpoint.</TabsContent>
      <TabsContent value="ep-4">Dark turn.</TabsContent>
      <TabsContent value="ep-5">Cliffhanger.</TabsContent>
    </Tabs>
  ),
}

export const Overflow: Story = {
  args: { defaultValue: 'ep-1' },
  render: args => (
    <Tabs {...args} className="w-56">
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="ep-1">Episode 1</TabsTrigger>
        <TabsTrigger value="ep-2">Episode 2</TabsTrigger>
        <TabsTrigger value="ep-3">Episode 3</TabsTrigger>
        <TabsTrigger value="ep-4">Episode 4</TabsTrigger>
      </TabsList>
      <TabsContent value="ep-1">Scroll the tab list.</TabsContent>
      <TabsContent value="ep-2">Second.</TabsContent>
      <TabsContent value="ep-3">Third.</TabsContent>
      <TabsContent value="ep-4">Fourth.</TabsContent>
    </Tabs>
  ),
}
