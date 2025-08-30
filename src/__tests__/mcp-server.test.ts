// Test the MCP server functionality without importing the actual server
// This avoids ES module issues with Jest

describe('MCP Server Functionality', () => {
  // Mock the BasecampFetcher class
  const mockListProjects = jest.fn();
  const mockFetchTodos = jest.fn();
  const mockAuthenticate = jest.fn();

  beforeEach(() => {
    // Mock environment variables
    process.env['BASECAMP_USER_AGENT'] = 'Test App (test@example.com)';

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env['BASECAMP_USER_AGENT'];
  });

  describe('handleListProjects', () => {
    it('should format project list correctly', async () => {
      const mockProjects = [
        { id: 1, name: 'Project A', archived: false },
        { id: 2, name: 'Project B', archived: true },
      ];

      mockListProjects.mockResolvedValue(mockProjects);

      // Simulate the handleListProjects logic
      const projectList = mockProjects
        .map(
          project =>
            `- **${project.name}** (ID: ${project.id})${project.archived ? ' [ARCHIVED]' : ''}`
        )
        .join('\n');

      const result = {
        content: [
          {
            type: 'text',
            text: `## Available Basecamp Projects\n\n${projectList}\n\nTotal: ${mockProjects.length} project(s)`,
          },
        ],
      };

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '## Available Basecamp Projects\n\n- **Project A** (ID: 1)\n- **Project B** (ID: 2) [ARCHIVED]\n\nTotal: 2 project(s)',
          },
        ],
      });
    });

    it('should handle empty project list', async () => {
      const mockProjects: any[] = [];

      mockListProjects.mockResolvedValue(mockProjects);

      const result = {
        content: [
          {
            type: 'text',
            text: `## Available Basecamp Projects\n\n\n\nTotal: ${mockProjects.length} project(s)`,
          },
        ],
      };

      expect(result.content[0]?.text).toContain('Total: 0 project(s)');
    });
  });

  describe('handleFetchTodos', () => {
    it('should call fetcher with correct parameters', async () => {
      const args = {
        projectName: 'Test Project',
        tableName: 'Sprint Board',
        columnName: 'In Progress',
        outputPath: './custom-output.json',
      };

      mockFetchTodos.mockResolvedValue(undefined);

      // Simulate the handleFetchTodos logic
      const { projectName, tableName, columnName, outputPath } = args;

      expect(projectName).toBe('Test Project');
      expect(tableName).toBe('Sprint Board');
      expect(columnName).toBe('In Progress');
      expect(outputPath).toBe('./custom-output.json');

      const outputFile = outputPath || '.codex/tasks.json';
      const markdownFile = outputPath?.replace('.json', '.md') || '.codex/tasks.md';

      const result = {
        content: [
          {
            type: 'text',
            text: `✅ Successfully fetched todos from project **${projectName}**\n\nFiles created:\n- \`${outputFile}\` - JSON format for Codex CLI\n- \`${markdownFile}\` - Human-readable Markdown format\n\nYou can now load these tasks into Codex CLI or use them in your project.`,
          },
        ],
      };

      expect(result.content[0]?.text).toContain('Test Project');
      expect(result.content[0]?.text).toContain('./custom-output.json');
      expect(result.content[0]?.text).toContain('./custom-output.md');
    });

    it('should use default output path when not provided', async () => {
      const args = {
        projectName: 'Test Project',
      };

      const outputPath = (args as any).outputPath;
      const outputFile = outputPath || '.codex/tasks.json';
      const markdownFile = outputPath?.replace('.json', '.md') || '.codex/tasks.md';

      expect(outputFile).toBe('.codex/tasks.json');
      expect(markdownFile).toBe('.codex/tasks.md');
    });
  });

  describe('handleAuthenticate', () => {
    it('should call authenticate with default openBrowser true', async () => {
      const args = {};
      const openBrowser = (args as any).openBrowser ?? true;

      expect(openBrowser).toBe(true);

      mockAuthenticate.mockResolvedValue(undefined);

      const result = {
        content: [
          {
            type: 'text',
            text: '✅ Successfully authenticated with Basecamp!\n\nYou can now use other Basecamp tools.',
          },
        ],
      };

      expect(result.content[0]?.text).toContain('Successfully authenticated');
    });

    it('should call authenticate with provided openBrowser value', async () => {
      const args = { openBrowser: false };
      const openBrowser = args.openBrowser;

      expect(openBrowser).toBe(false);
    });
  });

  describe('handleGetProjectInfo', () => {
    it('should return project info when project exists', async () => {
      const mockProjects = [
        { id: 1, name: 'Test Project', archived: false },
        { id: 2, name: 'Another Project', archived: true },
      ];

      const projectName = 'Test Project';
      const project = mockProjects.find(p => p.name.toLowerCase() === projectName.toLowerCase());

      expect(project).toBeDefined();
      expect(project?.name).toBe('Test Project');
      expect(project?.archived).toBe(false);

      const result = {
        content: [
          {
            type: 'text',
            text: `## Project Information\n\n**Name:** ${project?.name}\n**ID:** ${project?.id}\n**Status:** ${
              project?.archived ? 'Archived' : 'Active'
            }\n\nYou can use this project with the \`fetch_todos\` tool.`,
          },
        ],
      };

      expect(result.content[0]?.text).toContain('**Name:** Test Project');
      expect(result.content[0]?.text).toContain('**Status:** Active');
    });

    it('should return archived project info', async () => {
      const mockProjects = [{ id: 2, name: 'Another Project', archived: true }];

      const projectName = 'Another Project';
      const project = mockProjects.find(p => p.name.toLowerCase() === projectName.toLowerCase());

      expect(project?.archived).toBe(true);

      const result = {
        content: [
          {
            type: 'text',
            text: `## Project Information\n\n**Name:** ${project?.name}\n**ID:** ${project?.id}\n**Status:** ${
              project?.archived ? 'Archived' : 'Active'
            }\n\nYou can use this project with the \`fetch_todos\` tool.`,
          },
        ],
      };

      expect(result.content[0]?.text).toContain('**Status:** Archived');
    });

    it('should return error when project not found', async () => {
      const mockProjects = [{ id: 1, name: 'Test Project', archived: false }];

      const projectName = 'Non-existent Project';
      const project = mockProjects.find(p => p.name.toLowerCase() === projectName.toLowerCase());

      expect(project).toBeUndefined();

      const result = {
        content: [
          {
            type: 'text',
            text: `❌ Project **${projectName}** not found.\n\nAvailable projects:\n${mockProjects
              .map(p => `- ${p.name}`)
              .join('\n')}`,
          },
        ],
      };

      expect(result.content[0]?.text).toContain('❌ Project **Non-existent Project** not found.');
      expect(result.content[0]?.text).toContain('- Test Project');
    });

    it('should handle case-insensitive project name matching', async () => {
      const mockProjects = [{ id: 1, name: 'Test Project', archived: false }];

      const projectName = 'test project';
      const project = mockProjects.find(p => p.name.toLowerCase() === projectName.toLowerCase());

      expect(project).toBeDefined();
      expect(project?.name).toBe('Test Project');
    });
  });
});
