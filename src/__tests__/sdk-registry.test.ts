import { actions } from '../sdk/registry';

describe('SDK Registry', () => {
  it('should include expected action names', () => {
    const names = actions.map(a => a.name);
    // Core presence checks
    expect(names).toEqual(expect.arrayContaining([
      'projects.list',
      'projects.get',
      'projects.create',
      'projects.update',
      'projects.trash',
      'todos.list',
      'todos.get',
      'todos.create',
      'todos.update',
      'todos.complete',
      'todos.uncomplete',
      'card_tables.get',
      'card_tables.get_column',
      'card_tables.get_card',
      'card_tables.create_card',
      'people.list',
      'people.get',
      'messages.list',
      'messages.get',
      'messages.create',
      'comments.list_for_recording',
      'comments.get',
      'comments.create',
      'comments.update',
    ]));
  });
});

