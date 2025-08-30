#!/usr/bin/env tsx

/**
 * TypeScript example usage of @aexol-studio/basecamp-to-llm
 * 
 * Make sure to set your environment variables before running:
 * export BASECAMP_CLIENT_ID="your_client_id"
 * export BASECAMP_CLIENT_SECRET="your_client_secret"
 * export BASECAMP_REDIRECT_URI="http://localhost:8787/callback"
 * export BASECAMP_USER_AGENT="Your App Name (your@email.com)"
 */

import { BasecampFetcher } from '../src/index.js';

async function main(): Promise<void> {
  try {
    const fetcher = new BasecampFetcher();
    
    console.log('🔍 Listing available projects...');
    const projects = await fetcher.listProjects();
    
    if (projects.length === 0) {
      console.log('No projects found. Make sure you have access to Basecamp projects.');
      return;
    }
    
    console.log('📋 Available projects:');
    projects.forEach((project, index) => {
      console.log(`  ${index + 1}. ${project.name} (ID: ${project.id})${project.archived ? ' [ARCHIVED]' : ''}`);
    });
    
    // Use the first project as an example
    const firstProject = projects[0];
    console.log(`\n🚀 Fetching todos from "${firstProject.name}"...`);
    
    await fetcher.fetchTodos(firstProject.name, {
      outputPath: './example-output.json',
    });
    
    console.log('✅ Done! Check example-output.json for the results.');
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
