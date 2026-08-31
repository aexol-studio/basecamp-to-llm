import { BasecampClient } from '../client.js';
import type {
  CardTable,
  Card,
  CardTableList,
  Step,
  CardListDetail,
  CardListResponse,
  CompactCard,
} from '../types.js';
import { StepsResource } from './steps.js';

export interface UpdateCardBody {
  title?: string;
  content?: string;
  due_on?: string | null;
  assignee_ids?: number[];
}

export interface CreateCardWithStepsBody {
  title: string;
  content: string; // Required description
  due_on?: string;
  assignee_ids?: number[];
  notify?: boolean;
  steps?: Array<{
    title: string;
    due_on?: string;
    assignees?: string; // comma-separated person IDs
  }>;
}

export interface CardWithStepsResult {
  card: Card;
  steps: Step[];
}

export interface ListCardsPageOptions {
  detail?: CardListDetail;
  page?: number;
  limit?: number;
}

function compactCard(card: Card): CompactCard {
  const steps = card.steps ?? [];
  return {
    id: card.id,
    title: card.title ?? card.name ?? '',
    ...(card.status !== undefined && { status: card.status }),
    ...(card.position !== undefined && { position: card.position }),
    ...(card.due_on !== undefined && { due_on: card.due_on }),
    assignees: (card.assignees ?? []).map(({ id, name }) => ({ id, name })),
    comments_count: card.comments_count ?? card.comment_count ?? 0,
    steps: {
      completed: steps.filter(step => step.completed).length,
      total: steps.length,
    },
    ...(card.app_url !== undefined && { app_url: card.app_url }),
    ...(card.updated_at !== undefined && { updated_at: card.updated_at }),
  };
}

export class CardTablesResource {
  private stepsResource: StepsResource;

  constructor(private readonly client: BasecampClient) {
    this.stepsResource = new StepsResource(client);
  }

  get(projectId: number, tableId: number) {
    return this.client.get<CardTable>(`/buckets/${projectId}/card_tables/${tableId}.json`);
  }

  getColumn(projectId: number, columnId: number) {
    return this.client.get<CardTableList>(
      `/buckets/${projectId}/card_tables/columns/${columnId}.json`
    );
  }

  listCardsByColumnUrl(cardsUrl: string) {
    return this.client.get<Card[]>(cardsUrl, { absolute: true });
  }

  listCards(projectId: number, columnId: number) {
    return this.client.getAllPages<Card>(
      `/buckets/${projectId}/card_tables/lists/${columnId}/cards.json`
    );
  }

  async listCardsPage(
    projectId: number,
    columnId: number,
    options: ListCardsPageOptions = {}
  ): Promise<CardListResponse> {
    const detail = options.detail ?? 'compact';
    const page = options.page ?? 1;
    const limit = options.limit ?? 25;
    if (detail !== 'compact' && detail !== 'extended') {
      throw new Error('detail must be compact or extended');
    }
    if (!Number.isInteger(page) || page < 1) {
      throw new Error('page must be a positive integer');
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new Error('limit must be an integer from 1 through 100');
    }
    const window = await this.client.getPageWindow<Card>(
      `/buckets/${projectId}/card_tables/lists/${columnId}/cards.json`,
      page,
      limit
    );
    const pagination = {
      page,
      limit,
      returned: window.items.length,
      has_more: window.hasMore,
      ...(window.hasMore && { next_page: page + 1 }),
    };

    if (detail === 'extended') {
      return { detail, cards: window.items, pagination };
    }
    return { detail, cards: window.items.map(compactCard), pagination };
  }

  getCard(projectId: number, cardId: number) {
    return this.client.get<Card>(`/buckets/${projectId}/card_tables/cards/${cardId}.json`);
  }

  createCard(
    projectId: number,
    columnId: number,
    body: {
      title: string;
      content?: string;
      due_on?: string;
      notify?: boolean;
    }
  ) {
    return this.client.post<Card>(
      `/buckets/${projectId}/card_tables/lists/${columnId}/cards.json`,
      body
    );
  }

  updateCard(projectId: number, cardId: number, body: UpdateCardBody) {
    return this.client.put<Card>(`/buckets/${projectId}/card_tables/cards/${cardId}.json`, body);
  }

  moveCard(projectId: number, cardId: number, columnId: number) {
    return this.client.post<void>(`/buckets/${projectId}/card_tables/cards/${cardId}/moves.json`, {
      column_id: columnId,
    });
  }

  trashCard(projectId: number, cardId: number) {
    return this.client.put<void>(
      `/buckets/${projectId}/recordings/${cardId}/status/trashed.json`,
      {}
    );
  }

  archiveCard(projectId: number, cardId: number) {
    return this.client.put<void>(
      `/buckets/${projectId}/recordings/${cardId}/status/archived.json`,
      {}
    );
  }

  unarchiveCard(projectId: number, cardId: number) {
    return this.client.put<void>(
      `/buckets/${projectId}/recordings/${cardId}/status/active.json`,
      {}
    );
  }

  /**
   * Create a card with description and steps in one operation
   * This is a convenience method that creates the card first, then adds steps
   */
  async createCardWithSteps(
    projectId: number,
    columnId: number,
    body: CreateCardWithStepsBody
  ): Promise<CardWithStepsResult> {
    // 1. Create the card with required description
    const cardBody: {
      title: string;
      content: string;
      due_on?: string;
      notify?: boolean;
    } = {
      title: body.title,
      content: body.content,
    };
    if (body.due_on) cardBody.due_on = body.due_on;
    if (body.notify !== undefined) cardBody.notify = body.notify;

    const card = await this.createCard(projectId, columnId, cardBody);

    // 2. If assignees provided, update the card with them
    if (body.assignee_ids && body.assignee_ids.length > 0) {
      await this.updateCard(projectId, card.id, {
        assignee_ids: body.assignee_ids,
      });
    }

    // 3. Create steps if provided
    const createdSteps: Step[] = [];
    if (body.steps && body.steps.length > 0) {
      for (const step of body.steps) {
        const stepBody: { title: string; due_on?: string; assignees?: string } = {
          title: step.title,
        };
        if (step.due_on) stepBody.due_on = step.due_on;
        if (step.assignees) stepBody.assignees = step.assignees;

        const createdStep = await this.stepsResource.create(projectId, card.id, stepBody);
        createdSteps.push(createdStep);
      }
    }

    return {
      card,
      steps: createdSteps,
    };
  }
}
