import { BasecampClient } from "../client.js";
import type { Step } from "../types.js";

export interface CreateStepBody {
  title: string;
  due_on?: string;
  assignees?: string; // comma-separated list of person IDs
}

export interface UpdateStepBody {
  title?: string;
  due_on?: string;
  assignees?: string; // comma-separated list of person IDs
}

export interface CompleteStepBody {
  completion: "on" | "off";
}

export interface RepositionStepBody {
  source_id: number;
  position: number;
}

export class StepsResource {
  constructor(private readonly client: BasecampClient) {}

  /**
   * Get steps for a specific card
   * Steps are returned as part of the card data
   */
  getStepsForCard(projectId: number, cardId: number) {
    return this.client.get<{ steps: Step[] }>(
      `/buckets/${projectId}/card_tables/cards/${cardId}.json`,
    );
  }

  /**
   * Create a new step within a card
   */
  create(projectId: number, cardId: number, body: CreateStepBody) {
    return this.client.post<Step>(
      `/buckets/${projectId}/card_tables/cards/${cardId}/steps.json`,
      body,
    );
  }

  /**
   * Update an existing step
   */
  update(projectId: number, stepId: number, body: UpdateStepBody) {
    return this.client.put<Step>(
      `/buckets/${projectId}/card_tables/steps/${stepId}.json`,
      body,
    );
  }

  /**
   * Mark a step as completed or uncompleted
   */
  complete(projectId: number, stepId: number, completion: "on" | "off") {
    return this.client.put<Step>(
      `/buckets/${projectId}/card_tables/steps/${stepId}/completions.json`,
      { completion },
    );
  }

  /**
   * Reposition a step within its card
   */
  reposition(projectId: number, cardId: number, body: RepositionStepBody) {
    return this.client.post<void>(
      `/buckets/${projectId}/card_tables/cards/${cardId}/positions.json`,
      body,
    );
  }
}
