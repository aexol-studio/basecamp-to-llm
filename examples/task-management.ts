#!/usr/bin/env tsx

/**
 * Example: Task Management with Basecamp SDK
 *
 * This example demonstrates how to:
 * - Create todos and kanban cards
 * - Update their status
 * - Move cards between columns
 * - Archive/trash items
 *
 * Make sure to set your environment variables before running:
 * export BASECAMP_CLIENT_ID="your_client_id"
 * export BASECAMP_CLIENT_SECRET="your_client_secret"
 * export BASECAMP_REDIRECT_URI="http://localhost:8787/callback"
 * export BASECAMP_USER_AGENT="Your App Name (your@email.com)"
 */

import { BasecampClient } from '../src/sdk/client.js';
import { ProjectsResource } from '../src/sdk/resources/projects.js';
import { TodosResource } from '../src/sdk/resources/todos.js';
import { CardTablesResource } from '../src/sdk/resources/cardTables.js';

async function main(): Promise<void> {
  try {
    const client = new BasecampClient();
    const projectsResource = new ProjectsResource(client);
    const todosResource = new TodosResource(client);
    const cardTablesResource = new CardTablesResource(client);

    console.log('🔍 Listing available projects...');
    const projects = await projectsResource.list();

    if (projects.length === 0) {
      console.log('No projects found.');
      return;
    }

    const project = projects[0];
    console.log(`\n📋 Using project: "${project.name}" (ID: ${project.id})`);

    // Example 1: Working with Todos
    console.log('\n=== TODOS EXAMPLE ===');

    // You'll need a todolist ID - this is just an example
    const todolistId = 123456; // Replace with actual ID

    console.log('\n1️⃣ Creating a new todo...');
    const newTodo = await todosResource.create(project.id, todolistId, {
      content: 'Review new feature implementation',
      description: 'Check code quality and test coverage',
      due_on: '2024-12-31',
      assignee_ids: [], // Add assignee IDs if needed
    });
    console.log(`✅ Created todo: "${newTodo.content}" (ID: ${newTodo.id})`);

    console.log('\n2️⃣ Updating the todo...');
    await todosResource.update(project.id, newTodo.id, {
      content: 'Review and approve new feature implementation',
      description: 'Check code quality, test coverage, and security',
      due_on: '2024-12-31',
    });
    console.log('✅ Todo updated');

    console.log('\n3️⃣ Completing the todo...');
    await todosResource.complete(project.id, newTodo.id);
    console.log('✅ Todo marked as complete');

    console.log('\n4️⃣ Uncompleting the todo...');
    await todosResource.uncomplete(project.id, newTodo.id);
    console.log('✅ Todo marked as incomplete');

    console.log('\n5️⃣ Repositioning the todo...');
    await todosResource.reposition(project.id, newTodo.id, 1);
    console.log('✅ Todo moved to position 1');

    console.log('\n6️⃣ Archiving the todo...');
    await todosResource.archive(project.id, newTodo.id);
    console.log('✅ Todo archived');

    console.log('\n7️⃣ Unarchiving the todo...');
    await todosResource.unarchive(project.id, newTodo.id);
    console.log('✅ Todo unarchived');

    // Example 2: Working with Kanban Cards
    console.log('\n\n=== KANBAN CARDS EXAMPLE ===');

    // You'll need card table and column IDs - these are just examples
    const cardTableId = 789012; // Replace with actual ID
    const columnId = 345678; // Replace with actual column ID
    const anotherColumnId = 345679; // Replace with another column ID

    console.log('\n1️⃣ Getting kanban board info...');
    const cardTable = await cardTablesResource.get(project.id, cardTableId);
    console.log(`✅ Card table: "${cardTable.title}"`);
    console.log(`   Columns: ${cardTable.lists?.map(l => l.title).join(', ')}`);

    console.log('\n2️⃣ Creating a new card...');
    const newCard = await cardTablesResource.createCard(project.id, columnId, {
      title: 'Design new landing page',
      content: 'Create mockups and get approval from stakeholders',
      due_on: '2024-12-31',
      notify: false,
    });
    console.log(`✅ Created card: "${newCard.title}" (ID: ${newCard.id})`);

    console.log('\n3️⃣ Updating the card...');
    await cardTablesResource.updateCard(project.id, newCard.id, {
      title: 'Design and implement new landing page',
      content: 'Create mockups, get approval, and implement',
      due_on: '2024-12-31',
    });
    console.log('✅ Card updated');

    console.log('\n4️⃣ Moving card to another column...');
    await cardTablesResource.moveCard(project.id, newCard.id, anotherColumnId);
    console.log('✅ Card moved to new column');

    console.log('\n5️⃣ Archiving the card...');
    await cardTablesResource.archiveCard(project.id, newCard.id);
    console.log('✅ Card archived');

    console.log('\n6️⃣ Unarchiving the card...');
    await cardTablesResource.unarchiveCard(project.id, newCard.id);
    console.log('✅ Card unarchived');

    console.log('\n\n✨ All done! Check your Basecamp project to see the changes.');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
