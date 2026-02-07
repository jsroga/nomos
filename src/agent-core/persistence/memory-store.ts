
import { PlanPersistence } from '../planner'
import { Plan } from '../schemas'

export class MemoryPersistence implements PlanPersistence {
    private plan: Plan | null = null

    async loadPlan(): Promise<Plan | null> {
        return this.plan
    }

    async savePlan(plan: Plan): Promise<void> {
        this.plan = plan
    }
}
