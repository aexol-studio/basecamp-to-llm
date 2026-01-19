#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { BasecampFetcher } from './basecamp-fetcher.js';
import { BasecampClient, type HttpMethod, type RequestOptions } from './sdk/client.js';
import { actions as sdkActions } from './sdk/registry.js';

const program = new Command();

program
  .name('basecamp-to-llm')
  .description('CLI tool to fetch Basecamp todos and convert them to LLM-friendly task formats')
  .version('1.0.0');

program
  .command('fetch')
  .description('Fetch todos from a Basecamp project')
  .argument('<project-name>', 'Name of the Basecamp project')
  .option('-t, --table <table-name>', 'Specific kanban board name')
  .option('-c, --column <column-name>', 'Specific column name to filter by')
  .option('-o, --out <output-path>', 'Output file path (default: .basecamp/tasks.json)')
  .option('--open', 'Open browser for OAuth authorization')
  .action(async (projectName: string, options) => {
    try {
      const fetcher = new BasecampFetcher();
      await fetcher.fetchTodos(projectName, {
        tableName: options.table,
        columnName: options.column,
        outputPath: options.out,
        openBrowser: options.open,
      });
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('auth')
  .description('Authenticate with Basecamp (opens browser)')
  .option('--open', 'Open browser for OAuth authorization')
  .action(async options => {
    try {
      const fetcher = new BasecampFetcher();
      await fetcher.authenticate(options.open);
      console.log(chalk.green('✓ Authentication successful!'));
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('projects')
  .description('List available Basecamp projects')
  .action(async () => {
    try {
      const fetcher = new BasecampFetcher();
      const projects = await fetcher.listProjects();
      console.log(chalk.blue('Available projects:'));
      projects.forEach(project => {
        console.log(
          `  ${chalk.green(project.id)}: ${project.name}${project.archived ? chalk.yellow(' (archived)') : ''}`
        );
      });
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('mcp')
  .description('Start the MCP server for Codex/Cursor integration')
  .action(async () => {
    try {
      const { BasecampMCPServer } = await import('./mcp-server.js');
      const server = new BasecampMCPServer();
      await server.run();
    } catch (error) {
      console.error(
        chalk.red('MCP Server Error:'),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

program
  .command('api')
  .description('Call any Basecamp API endpoint (advanced)')
  .argument('<method>', 'HTTP method: GET, POST, PUT, PATCH, DELETE, HEAD')
  .argument('<path>', 'API path relative to account (e.g., /projects.json) or absolute URL')
  .option('-q, --query <json>', 'Query params JSON, e.g. {"page":1}')
  .option('-d, --data <json>', 'Request body JSON for write methods')
  .option('--absolute', 'Treat path as absolute URL')
  .action(async (method: string, apiPath: string, options) => {
    try {
      const client = new BasecampClient();
      const query = options.query
        ? (JSON.parse(options.query) as RequestOptions['query'])
        : undefined;
      const body = options.data ? (JSON.parse(options.data) as unknown) : undefined;
      const m = String(method || '').toUpperCase();
      const allowed = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'] as const;
      const isHttpMethod = (x: string): x is HttpMethod =>
        (allowed as readonly string[]).includes(x);
      if (!isHttpMethod(m)) throw new Error(`Invalid method: ${method}`);
      const requestOptions: RequestOptions = { absolute: !!options.absolute };
      if (query) requestOptions.query = query;
      if (body !== undefined) requestOptions.body = body;
      const res = await client.request(m, apiPath, requestOptions);
      const out = typeof res === 'string' ? res : JSON.stringify(res, null, 2);
      console.log(out);
    } catch (error) {
      console.error(
        chalk.red('API Error:'),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

// Dynamic SDK commands
const sdkCmd = program.command('sdk').description('Typed SDK actions (list and run)');

sdkCmd
  .command('list')
  .description('List available SDK actions')
  .action(() => {
    console.log('Available actions:');
    for (const a of sdkActions) {
      console.log(`- ${a.name}: ${a.description}`);
    }
  });

sdkCmd
  .command('run')
  .description('Run an SDK action by name with JSON args')
  .argument('<action>', 'Action name, e.g., projects.list')
  .option('-a, --args <json>', 'Arguments JSON object')
  .action(async (actionName: string, options) => {
    try {
      const def = sdkActions.find(a => a.name === actionName);
      if (!def) throw new Error(`Unknown action: ${actionName}`);
      const args = options.args ? JSON.parse(options.args) : {};
      const client = new BasecampClient();
      const res = await def.handler(client, args);
      console.log(typeof res === 'string' ? res : JSON.stringify(res, null, 2));
    } catch (error) {
      console.error(
        chalk.red('SDK Error:'),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

program
  .command('setup-mcp')
  .description('Setup MCP configuration files for Codex and Cursor')
  .action(async () => {
    try {
      const { execSync } = await import('node:child_process');
      const { fileURLToPath } = await import('node:url');
      const { dirname, join } = await import('node:path');

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const setupScript = join(__dirname, '..', 'scripts', 'setup-mcp.js');

      execSync(`node "${setupScript}"`, { stdio: 'inherit' });
    } catch (error) {
      console.error(
        chalk.red('Setup Error:'),
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

program.parse();
