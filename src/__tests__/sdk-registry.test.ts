import { actions } from '../sdk/registry';

describe('SDK Registry', () => {
  it('should include core action names', () => {
    const names = actions.map(a => a.name);
    // Core actions - reduced set for optimal context usage
    expect(names).toEqual([
      'projects.list',
      'card_tables.get',
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

  it('should have exactly 10 actions', () => {
    expect(actions.length).toBe(10);
  });
});
