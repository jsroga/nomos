export enum PlanItemStatusValue {
  Pending = 'pending',
}

export enum PlanSchemaDescription {
  ItemId = 'Unique identifier (e.g., \'1\', \'1.2\')',
  ItemTitle = 'Concise task title',
  ItemDescription = 'More detailed instructions',
  ItemDependencies = 'IDs of tasks that must be finished first',
  ItemMetadata = 'Domain-specific data (e.g. plot points, ECS entities)',
  PlanId = 'Unique Plan ID',
  PlanGoal = 'High-level objective of this plan',
  PlanContext = 'Why this plan exists',
  PlanItems = 'Ordered list of tasks',
  ExecutiveThoughts = 'Stream of consciousness log',
  ExecutiveErrors = 'Encountered errors',
  ExecutiveVariables = 'Scratchpad memory',
}

export const PLAN_ITEM_DEFAULT_STATUS = PlanItemStatusValue.Pending
