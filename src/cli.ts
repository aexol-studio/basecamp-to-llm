#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { BasecampFetcher } from './basecamp-fetcher.js';

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
  .option('-o, --out <output-path>', 'Output file path (default: .codex/tasks.json)')
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
