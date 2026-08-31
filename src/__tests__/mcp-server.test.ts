import { z } from 'zod';
import {
  actions,
  apiRequestZodSchema,
  attachmentDownloadDescription,
  attachmentDownloadZodSchema,
} from '../sdk/registry';

describe('MCP-visible tool contracts', () => {
  it('derives the current fixed and SDK tool names', () => {
    const names = [
      'authenticate',
      'api_request',
      ...actions.map(action => `sdk_${action.name.replace(/[^A-Za-z0-9_-]/g, '_')}`),
      'sdk_attachments_download',
    ];

    expect(names).toEqual([
      'authenticate',
      'api_request',
      'sdk_projects_list',
      'sdk_card_tables_get',
      'sdk_card_tables_list_cards',
      'sdk_card_tables_get_card',
      'sdk_card_tables_get_enriched',
      'sdk_card_tables_create_task',
      'sdk_card_tables_update_card',
      'sdk_card_tables_move_card',
      'sdk_people_list',
      'sdk_comments_create',
      'sdk_steps_complete',
      'sdk_attachments_download',
    ]);
  });

  it('enforces the advertised api_request method enum', () => {
    const schema = z.object(apiRequestZodSchema);

    expect(schema.parse({ method: 'PATCH', path: '/projects.json' })).toMatchObject({
      method: 'PATCH',
      path: '/projects.json',
    });
    expect(() => schema.parse({ method: 'patch', path: '/projects.json' })).toThrow();
    expect(() => schema.parse({ method: 'OPTIONS', path: '/projects.json' })).toThrow();
  });

  it('keeps attachment download input aligned with runtime behavior', () => {
    expect(Object.keys(attachmentDownloadZodSchema)).toEqual(['url', 'filename', 'mimeType']);
    expect(attachmentDownloadDescription).toContain('Always saves');
    expect(attachmentDownloadDescription).toContain('overwriting');
  });
});
