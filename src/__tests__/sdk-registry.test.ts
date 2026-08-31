import { actions } from '../sdk/registry';
import { z } from 'zod';

describe('SDK Registry', () => {
  it('should include core action names', () => {
    const names = actions.map(a => a.name);
    // Core actions - reduced set for optimal context usage
    expect(names).toEqual([
      'projects.list',
      'card_tables.get',
      'card_tables.list_cards',
      'card_tables.get_card',
      'card_tables.get_enriched',
      'card_tables.create_task',
      'card_tables.update_card',
      'card_tables.move_card',
      'people.list',
      'comments.create',
      'steps.complete',
    ]);
  });

  it('should have exactly 11 actions', () => {
    expect(actions.length).toBe(11);
  });

  describe('projects.list schema', () => {
    const action = actions.find(item => item.name === 'projects.list');

    it('enforces the status enum and positive integer pages', () => {
      expect(action?.schema).toMatchObject({
        properties: {
          status: { type: 'string', enum: ['archived', 'trashed'] },
          page: { type: 'integer', minimum: 1 },
        },
      });

      const schema = z.object(action?.zodSchema ?? {});
      expect(schema.parse({ status: 'archived', page: 1 })).toEqual({
        status: 'archived',
        page: 1,
      });
      expect(() => schema.parse({ status: 'active' })).toThrow();
      expect(() => schema.parse({ page: 0 })).toThrow();
      expect(() => schema.parse({ page: 1.5 })).toThrow();
    });
  });

  it('describes card_tables.get as raw board metadata', () => {
    const action = actions.find(item => item.name === 'card_tables.get');

    expect(action?.description).toContain('raw card table');
    expect(action?.description).toContain('card_tables.list_cards');
    expect(action?.description).not.toContain('all columns and cards');
  });

  describe('card_tables.list_cards schema', () => {
    const action = actions.find(item => item.name === 'card_tables.list_cards');

    it('declares compact pagination defaults and JSON Schema bounds', () => {
      expect(action).toBeDefined();
      expect(action?.schema).toMatchObject({
        properties: {
          detail: {
            type: 'string',
            enum: ['compact', 'extended'],
            default: 'compact',
          },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 25,
          },
        },
      });
    });

    it('applies Zod defaults and accepts extended detail', () => {
      expect(action).toBeDefined();
      const schema = z.object(action?.zodSchema ?? {});

      expect(schema.parse({ projectId: 1, columnId: 2 })).toEqual({
        projectId: 1,
        columnId: 2,
        detail: 'compact',
        page: 1,
        limit: 25,
      });
      expect(
        schema.parse({
          projectId: 1,
          columnId: 2,
          detail: 'extended',
          page: 3,
          limit: 100,
        })
      ).toMatchObject({ detail: 'extended', page: 3, limit: 100 });
    });

    it.each([{ page: 0 }, { page: 1.5 }, { limit: 0 }, { limit: 101 }, { limit: 1.5 }])(
      'rejects invalid pagination bounds: %p',
      invalid => {
        expect(action).toBeDefined();
        const schema = z.object(action?.zodSchema ?? {});

        expect(() => schema.parse({ projectId: 1, columnId: 2, ...invalid })).toThrow();
      }
    );
  });
});
