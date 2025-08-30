import { BasecampClient } from '../client.js';
import type { CardTable, Card, CardTableList } from '../types.js';

export class CardTablesResource {
  constructor(private readonly client: BasecampClient) {}

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

  getCard(projectId: number, cardId: number) {
    return this.client.get<Card>(`/buckets/${projectId}/card_tables/cards/${cardId}.json`);
  }

  createCard(projectId: number, columnId: number, body: { title: string; description?: string }) {
    return this.client.post<Card>(
      `/buckets/${projectId}/card_tables/lists/${columnId}/cards.json`,
      body
    );
  }
}
