import { StepsResource } from '../sdk/resources/steps';
import { BasecampClient } from '../sdk/client';

// Mock BasecampClient
jest.mock('../sdk/client');

describe('StepsResource', () => {
  let client: jest.Mocked<BasecampClient>;
  let stepsResource: StepsResource;

  beforeEach(() => {
    client = new BasecampClient() as jest.Mocked<BasecampClient>;
    stepsResource = new StepsResource(client);
  });

  describe('create', () => {
    it('should create a step with required fields', async () => {
      const mockStep = {
        id: 123,
        title: 'Test Step',
        completed: false,
      };

      client.post = jest.fn().mockResolvedValue(mockStep);

      const result = await stepsResource.create(1, 2, {
        title: 'Test Step',
      });

      expect(client.post).toHaveBeenCalledWith('/buckets/1/card_tables/cards/2/steps.json', {
        title: 'Test Step',
      });
      expect(result).toEqual(mockStep);
    });

    it('should create a step with optional fields', async () => {
      const mockStep = {
        id: 123,
        title: 'Test Step',
        completed: false,
        due_on: '2025-12-31',
      };

      client.post = jest.fn().mockResolvedValue(mockStep);

      const result = await stepsResource.create(1, 2, {
        title: 'Test Step',
        due_on: '2025-12-31',
        assignees: '123,456',
      });

      expect(client.post).toHaveBeenCalledWith('/buckets/1/card_tables/cards/2/steps.json', {
        title: 'Test Step',
        due_on: '2025-12-31',
        assignees: '123,456',
      });
      expect(result).toEqual(mockStep);
    });
  });

  describe('update', () => {
    it('should update a step', async () => {
      const mockStep = {
        id: 123,
        title: 'Updated Step',
        completed: false,
      };

      client.put = jest.fn().mockResolvedValue(mockStep);

      const result = await stepsResource.update(1, 123, {
        title: 'Updated Step',
      });

      expect(client.put).toHaveBeenCalledWith('/buckets/1/card_tables/steps/123.json', {
        title: 'Updated Step',
      });
      expect(result).toEqual(mockStep);
    });
  });

  describe('complete', () => {
    it('should mark a step as completed', async () => {
      const mockStep = {
        id: 123,
        title: 'Test Step',
        completed: true,
      };

      client.put = jest.fn().mockResolvedValue(mockStep);

      const result = await stepsResource.complete(1, 123, 'on');

      expect(client.put).toHaveBeenCalledWith('/buckets/1/card_tables/steps/123/completions.json', {
        completion: 'on',
      });
      expect(result).toEqual(mockStep);
    });

    it('should mark a step as uncompleted', async () => {
      const mockStep = {
        id: 123,
        title: 'Test Step',
        completed: false,
      };

      client.put = jest.fn().mockResolvedValue(mockStep);

      const result = await stepsResource.complete(1, 123, 'off');

      expect(client.put).toHaveBeenCalledWith('/buckets/1/card_tables/steps/123/completions.json', {
        completion: 'off',
      });
      expect(result).toEqual(mockStep);
    });
  });

  describe('reposition', () => {
    it('should reposition a step within its card', async () => {
      client.post = jest.fn().mockResolvedValue(undefined);

      await stepsResource.reposition(1, 2, {
        source_id: 123,
        position: 3,
      });

      expect(client.post).toHaveBeenCalledWith('/buckets/1/card_tables/cards/2/positions.json', {
        source_id: 123,
        position: 3,
      });
    });
  });

  describe('getStepsForCard', () => {
    it('should get steps for a specific card', async () => {
      const mockResponse = {
        steps: [
          { id: 1, title: 'Step 1', completed: false },
          { id: 2, title: 'Step 2', completed: true },
        ],
      };

      client.get = jest.fn().mockResolvedValue(mockResponse);

      const result = await stepsResource.getStepsForCard(1, 2);

      expect(client.get).toHaveBeenCalledWith('/buckets/1/card_tables/cards/2.json');
      expect(result).toEqual(mockResponse);
    });
  });
});
