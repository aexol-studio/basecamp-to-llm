import { CardTablesResource } from '../sdk/resources/cardTables';
import { BasecampClient } from '../sdk/client';
import type { Card } from '../sdk/types';

// Mock BasecampClient
jest.mock('../sdk/client');

describe('CardTablesResource - createCardWithSteps', () => {
  let client: jest.Mocked<BasecampClient>;
  let cardTablesResource: CardTablesResource;

  beforeEach(() => {
    client = new BasecampClient() as jest.Mocked<BasecampClient>;
    cardTablesResource = new CardTablesResource(client);
  });

  describe('listCardsPage', () => {
    const rawCard: Card = {
      id: 10,
      title: 'Primary title',
      name: 'Fallback name',
      status: 'active',
      position: 3,
      due_on: null,
      assignees: [{ id: 20, name: 'Ada', email_address: 'ada@example.test' }],
      comments_count: 4,
      comment_count: 9,
      steps: [
        { id: 30, title: 'Done', completed: true },
        { id: 31, title: 'Open', completed: false },
      ],
      app_url: 'https://3.basecamp.com/card/10',
      updated_at: '2026-08-30T12:00:00Z',
      content: '<p>Full description</p>',
      description: 'Full description',
    };

    it('returns compact cards by default with normalized summaries', async () => {
      client.getPageWindow = jest.fn().mockResolvedValue({
        items: [rawCard],
        hasMore: true,
      });

      const result = await cardTablesResource.listCardsPage(1, 2);

      expect(client.getPageWindow).toHaveBeenCalledWith(
        '/buckets/1/card_tables/lists/2/cards.json',
        1,
        25
      );
      expect(result).toEqual({
        detail: 'compact',
        cards: [
          {
            id: 10,
            title: 'Primary title',
            status: 'active',
            position: 3,
            due_on: null,
            assignees: [{ id: 20, name: 'Ada' }],
            comments_count: 4,
            steps: { completed: 1, total: 2 },
            app_url: 'https://3.basecamp.com/card/10',
            updated_at: '2026-08-30T12:00:00Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 25,
          returned: 1,
          has_more: true,
          next_page: 2,
        },
      });
      expect(result.cards[0]).not.toHaveProperty('content');
      expect(result.cards[0]).not.toHaveProperty('description');
    });

    it('uses name and legacy comment_count fallbacks and omits undefined fields', async () => {
      client.getPageWindow = jest.fn().mockResolvedValue({
        items: [{ id: 11, name: 'Named card', comment_count: 2 }, { id: 12 }],
        hasMore: false,
      });

      const result = await cardTablesResource.listCardsPage(1, 2, {
        page: 3,
        limit: 5,
      });

      expect(result).toEqual({
        detail: 'compact',
        cards: [
          {
            id: 11,
            title: 'Named card',
            assignees: [],
            comments_count: 2,
            steps: { completed: 0, total: 0 },
          },
          {
            id: 12,
            title: '',
            assignees: [],
            comments_count: 0,
            steps: { completed: 0, total: 0 },
          },
        ],
        pagination: {
          page: 3,
          limit: 5,
          returned: 2,
          has_more: false,
        },
      });
    });

    it('returns the full raw cards only for the requested extended window', async () => {
      client.getPageWindow = jest.fn().mockResolvedValue({
        items: [rawCard],
        hasMore: false,
      });

      const result = await cardTablesResource.listCardsPage(1, 2, {
        detail: 'extended',
        page: 2,
        limit: 1,
      });

      expect(client.getPageWindow).toHaveBeenCalledWith(
        '/buckets/1/card_tables/lists/2/cards.json',
        2,
        1
      );
      expect(result).toEqual({
        detail: 'extended',
        cards: [rawCard],
        pagination: {
          page: 2,
          limit: 1,
          returned: 1,
          has_more: false,
        },
      });
    });

    it('returns an empty envelope for a later page with no cards', async () => {
      client.getPageWindow = jest.fn().mockResolvedValue({
        items: [],
        hasMore: false,
      });

      await expect(cardTablesResource.listCardsPage(1, 2, { page: 7, limit: 10 })).resolves.toEqual(
        {
          detail: 'compact',
          cards: [],
          pagination: {
            page: 7,
            limit: 10,
            returned: 0,
            has_more: false,
          },
        }
      );
    });
  });

  describe('createCardWithSteps', () => {
    it('should create a card with description and steps', async () => {
      const mockCard = {
        id: 123,
        title: 'Test Task',
        content: 'This is a description',
      };

      const mockStep1 = {
        id: 456,
        title: 'Step 1',
        completed: false,
      };

      const mockStep2 = {
        id: 789,
        title: 'Step 2',
        completed: false,
      };

      // Mock createCard
      client.post = jest
        .fn()
        .mockResolvedValueOnce(mockCard) // createCard
        .mockResolvedValueOnce(mockStep1) // create step 1
        .mockResolvedValueOnce(mockStep2); // create step 2

      const result = await cardTablesResource.createCardWithSteps(1, 2, {
        title: 'Test Task',
        content: 'This is a description',
        steps: [{ title: 'Step 1' }, { title: 'Step 2' }],
      });

      expect(client.post).toHaveBeenCalledTimes(3);
      expect(result.card).toEqual(mockCard);
      expect(result.steps).toHaveLength(2);
      expect(result.steps[0]).toEqual(mockStep1);
      expect(result.steps[1]).toEqual(mockStep2);
    });

    it('should create a card without steps', async () => {
      const mockCard = {
        id: 123,
        title: 'Test Task',
        content: 'This is a description',
      };

      client.post = jest.fn().mockResolvedValueOnce(mockCard);

      const result = await cardTablesResource.createCardWithSteps(1, 2, {
        title: 'Test Task',
        content: 'This is a description',
      });

      expect(client.post).toHaveBeenCalledTimes(1);
      expect(result.card).toEqual(mockCard);
      expect(result.steps).toHaveLength(0);
    });

    it('should create a card with assignees', async () => {
      const mockCard = {
        id: 123,
        title: 'Test Task',
        content: 'This is a description',
      };

      client.post = jest.fn().mockResolvedValueOnce(mockCard);
      client.put = jest.fn().mockResolvedValueOnce(mockCard);

      const result = await cardTablesResource.createCardWithSteps(1, 2, {
        title: 'Test Task',
        content: 'This is a description',
        assignee_ids: [100, 200],
      });

      expect(client.post).toHaveBeenCalledTimes(1);
      expect(client.put).toHaveBeenCalledTimes(1);
      expect(client.put).toHaveBeenCalledWith('/buckets/1/card_tables/cards/123.json', {
        assignee_ids: [100, 200],
      });
      expect(result.card).toEqual(mockCard);
    });

    it('should create a card with steps that have due dates and assignees', async () => {
      const mockCard = {
        id: 123,
        title: 'Test Task',
        content: 'This is a description',
      };

      const mockStep = {
        id: 456,
        title: 'Step with details',
        completed: false,
        due_on: '2025-12-31',
      };

      client.post = jest.fn().mockResolvedValueOnce(mockCard).mockResolvedValueOnce(mockStep);

      const result = await cardTablesResource.createCardWithSteps(1, 2, {
        title: 'Test Task',
        content: 'This is a description',
        due_on: '2025-12-31',
        steps: [
          {
            title: 'Step with details',
            due_on: '2025-12-31',
            assignees: '100,200',
          },
        ],
      });

      expect(client.post).toHaveBeenCalledTimes(2);

      // Check step creation call
      expect(client.post).toHaveBeenNthCalledWith(
        2,
        '/buckets/1/card_tables/cards/123/steps.json',
        {
          title: 'Step with details',
          due_on: '2025-12-31',
          assignees: '100,200',
        }
      );

      expect(result.card).toEqual(mockCard);
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0]).toEqual(mockStep);
    });
  });
});
