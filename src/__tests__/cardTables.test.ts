import { CardTablesResource } from '../sdk/resources/cardTables';
import { BasecampClient } from '../sdk/client';

// Mock BasecampClient
jest.mock('../sdk/client');

describe('CardTablesResource - createCardWithSteps', () => {
  let client: jest.Mocked<BasecampClient>;
  let cardTablesResource: CardTablesResource;

  beforeEach(() => {
    client = new BasecampClient() as jest.Mocked<BasecampClient>;
    cardTablesResource = new CardTablesResource(client);
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
