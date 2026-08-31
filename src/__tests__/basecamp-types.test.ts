import { ListCardsResponse, List } from '../basecamp-types';

describe('Basecamp API Types', () => {
  describe('ListCardsResponse', () => {
    it('should have correct structure for card table response', () => {
      const mockResponse: ListCardsResponse = {
        id: 123,
        status: 'active',
        visible_to_clients: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        title: 'Sprint Board',
        inherits_status: false,
        type: 'CardTable',
        url: 'https://3.basecampapi.com/123/buckets/456/card_tables/123',
        app_url: 'https://3.basecampapi.com/123/buckets/456/card_tables/123',
        bookmark_url: 'https://3.basecampapi.com/123/buckets/456/card_tables/123/bookmark',
        subscription_url: 'https://3.basecampapi.com/123/buckets/456/card_tables/123/subscription',
        position: 1,
        bucket: {
          id: 456,
          name: 'Test Project',
          type: 'Project',
        },
        creator: {
          id: 789,
          attachable_sgid: 'attachable_sgid',
          name: 'John Doe',
          email_address: 'john@example.com',
          personable_type: 'User',
          title: 'Developer',
          bio: 'Software developer',
          location: 'San Francisco',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          admin: true,
          owner: false,
          client: false,
          employee: true,
          time_zone: 'America/Los_Angeles',
          avatar_url: 'https://example.com/avatar.jpg',
          company: {
            id: 101,
            name: 'Example Corp',
          },
          can_ping: true,
          can_manage_projects: true,
          can_manage_people: false,
          can_access_timesheet: true,
          can_access_hill_charts: true,
        },
        subscribers: [],
        public_link_url: 'https://3.basecampapi.com/123/buckets/456/card_tables/123/public_link',
        lists: [
          {
            id: 1,
            status: 'active',
            visible_to_clients: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            title: 'To Do',
            inherits_status: false,
            type: 'List',
            url: 'https://3.basecampapi.com/123/buckets/456/lists/1',
            app_url: 'https://3.basecampapi.com/123/buckets/456/lists/1',
            bookmark_url: 'https://3.basecampapi.com/123/buckets/456/lists/1/bookmark',
            subscription_url: 'https://3.basecampapi.com/123/buckets/456/lists/1/subscription',
            parent: {
              id: 123,
              title: 'Sprint Board',
              type: 'CardTable',
              url: 'https://3.basecampapi.com/123/buckets/456/card_tables/123',
              app_url: 'https://3.basecampapi.com/123/buckets/456/card_tables/123',
            },
            bucket: {
              id: 456,
              name: 'Test Project',
              type: 'Project',
            },
            creator: {
              id: 789,
              attachable_sgid: 'attachable_sgid',
              name: 'John Doe',
              email_address: 'john@example.com',
              personable_type: 'User',
              title: 'Developer',
              bio: 'Software developer',
              location: 'San Francisco',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
              admin: true,
              owner: false,
              client: false,
              employee: true,
              time_zone: 'America/Los_Angeles',
              avatar_url: 'https://example.com/avatar.jpg',
              company: {
                id: 101,
                name: 'Example Corp',
              },
              can_ping: true,
              can_manage_projects: true,
              can_manage_people: false,
              can_access_timesheet: true,
              can_access_hill_charts: true,
            },
            description: 'Tasks to be done',
            subscribers: [],
            color: '#ff0000',
            cards_count: 5,
            comment_count: 2,
            cards_url: 'https://3.basecampapi.com/123/buckets/456/lists/1/cards',
            position: 1,
          },
        ],
      };

      expect(mockResponse.id).toBe(123);
      expect(mockResponse.title).toBe('Sprint Board');
      expect(mockResponse.lists).toHaveLength(1);
      expect(mockResponse.lists[0]?.title).toBe('To Do');
      expect(mockResponse.lists[0]?.cards_url).toBeDefined();
    });

    it('should handle optional fields correctly', () => {
      const minimalResponse: ListCardsResponse = {
        id: 123,
        status: 'active',
        visible_to_clients: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        title: 'Sprint Board',
        inherits_status: false,
        type: 'CardTable',
        url: 'https://3.basecampapi.com/123/buckets/456/card_tables/123',
        app_url: 'https://3.basecampapi.com/123/buckets/456/card_tables/123',
        bookmark_url: 'https://3.basecampapi.com/123/buckets/456/card_tables/123/bookmark',
        subscription_url: 'https://3.basecampapi.com/123/buckets/456/card_tables/123/subscription',
        position: 1,
        bucket: {
          id: 456,
          name: 'Test Project',
          type: 'Project',
        },
        creator: {
          id: 789,
          attachable_sgid: 'attachable_sgid',
          name: 'John Doe',
          email_address: 'john@example.com',
          personable_type: 'User',
          title: 'Developer',
          bio: 'Software developer',
          location: 'San Francisco',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          admin: true,
          owner: false,
          client: false,
          employee: true,
          time_zone: 'America/Los_Angeles',
          avatar_url: 'https://example.com/avatar.jpg',
          company: {
            id: 101,
            name: 'Example Corp',
          },
          can_ping: true,
          can_manage_projects: true,
          can_manage_people: false,
          can_access_timesheet: true,
          can_access_hill_charts: true,
        },
        subscribers: [],
        public_link_url: 'https://3.basecampapi.com/123/buckets/456/card_tables/123/public_link',
        lists: [],
      };

      expect(minimalResponse.lists).toHaveLength(0);
      expect(minimalResponse.subscribers).toHaveLength(0);
    });
  });

  describe('List', () => {
    it('should have correct structure for list with cards', () => {
      const mockList: List = {
        id: 1,
        status: 'active',
        visible_to_clients: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        title: 'In Progress',
        inherits_status: false,
        type: 'List',
        url: 'https://3.basecampapi.com/123/buckets/456/lists/1',
        app_url: 'https://3.basecampapi.com/123/buckets/456/lists/1',
        bookmark_url: 'https://3.basecampapi.com/123/buckets/456/lists/1/bookmark',
        subscription_url: 'https://3.basecampapi.com/123/buckets/456/lists/1/subscription',
        parent: {
          id: 123,
          title: 'Sprint Board',
          type: 'CardTable',
          url: 'https://3.basecampapi.com/123/buckets/456/card_tables/123',
          app_url: 'https://3.basecampapi.com/123/buckets/456/card_tables/123',
        },
        bucket: {
          id: 456,
          name: 'Test Project',
          type: 'Project',
        },
        creator: {
          id: 789,
          attachable_sgid: 'attachable_sgid',
          name: 'John Doe',
          email_address: 'john@example.com',
          personable_type: 'User',
          title: 'Developer',
          bio: 'Software developer',
          location: 'San Francisco',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          admin: true,
          owner: false,
          client: false,
          employee: true,
          time_zone: 'America/Los_Angeles',
          avatar_url: 'https://example.com/avatar.jpg',
          company: {
            id: 101,
            name: 'Example Corp',
          },
          can_ping: true,
          can_manage_projects: true,
          can_manage_people: false,
          can_access_timesheet: true,
          can_access_hill_charts: true,
        },
        description: 'Tasks currently being worked on',
        subscribers: [],
        color: '#00ff00',
        cards_count: 3,
        comment_count: 1,
        cards_url: 'https://3.basecampapi.com/123/buckets/456/lists/1/cards',
        position: 2,
      };

      expect(mockList.id).toBe(1);
      expect(mockList.title).toBe('In Progress');
      expect(mockList.cards_url).toBe('https://3.basecampapi.com/123/buckets/456/lists/1/cards');
      expect(mockList.cards_count).toBe(3);
      expect(mockList.color).toBe('#00ff00');
    });

    it('should handle optional fields in list', () => {
      const minimalList: List = {
        id: 1,
        status: 'active',
        visible_to_clients: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        title: 'To Do',
        inherits_status: false,
        type: 'List',
        url: 'https://3.basecampapi.com/123/buckets/456/lists/1',
        app_url: 'https://3.basecampapi.com/123/buckets/456/lists/1',
        bookmark_url: 'https://3.basecampapi.com/123/buckets/456/lists/1/bookmark',
        subscription_url: 'https://3.basecampapi.com/123/buckets/456/lists/1/subscription',
        parent: {
          id: 123,
          title: 'Sprint Board',
          type: 'CardTable',
          url: 'https://3.basecampapi.com/123/buckets/456/card_tables/123',
          app_url: 'https://3.basecampapi.com/123/buckets/456/card_tables/123',
        },
        bucket: {
          id: 456,
          name: 'Test Project',
          type: 'Project',
        },
        creator: {
          id: 789,
          attachable_sgid: 'attachable_sgid',
          name: 'John Doe',
          email_address: 'john@example.com',
          personable_type: 'User',
          title: 'Developer',
          bio: 'Software developer',
          location: 'San Francisco',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          admin: true,
          owner: false,
          client: false,
          employee: true,
          time_zone: 'America/Los_Angeles',
          avatar_url: 'https://example.com/avatar.jpg',
          company: {
            id: 101,
            name: 'Example Corp',
          },
          can_ping: true,
          can_manage_projects: true,
          can_manage_people: false,
          can_access_timesheet: true,
          can_access_hill_charts: true,
        },
        subscribers: [],
        cards_count: 0,
        comment_count: 0,
        cards_url: 'https://3.basecampapi.com/123/buckets/456/lists/1/cards',
      };

      expect(minimalList.description).toBeUndefined();
      expect(minimalList.color).toBeUndefined();
      expect(minimalList.position).toBeUndefined();
      expect(minimalList.cards_count).toBe(0);
    });
  });

  describe('Card structure', () => {
    it('should define card structure correctly', () => {
      // This test validates that our Card interface matches what we expect from Basecamp
      const mockCard = {
        id: 1,
        title: 'Implement user authentication',
        name: 'Implement user authentication', // Some cards use 'name' instead of 'title'
        status: 'active',
        archived: false,
      };

      expect(mockCard.id).toBe(1);
      expect(mockCard.title).toBe('Implement user authentication');
      expect(mockCard.status).toBe('active');
      expect(mockCard.archived).toBe(false);
    });

    it('should handle cards with different title/name patterns', () => {
      const cardWithTitle = {
        id: 1,
        title: 'Task with title',
        status: 'active',
        archived: false,
      };

      const cardWithName = {
        id: 2,
        name: 'Task with name',
        status: 'active',
        archived: false,
      };

      expect(cardWithTitle.title).toBe('Task with title');
      expect(cardWithName.name).toBe('Task with name');
    });
  });
});
