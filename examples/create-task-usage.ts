#!/usr/bin/env tsx

/**
 * Example: Creating Complete Tasks with create_task
 *
 * This example demonstrates the recommended way to create tasks in Basecamp:
 * - Create a card with a detailed description
 * - Add multiple steps (subtasks) in one operation
 * - Set due dates for the card and individual steps
 *
 * This is much more convenient than creating cards and steps separately.
 */

import { BasecampClient } from '../src/sdk/client.js';
import { CardTablesResource } from '../src/sdk/resources/cardTables.js';

async function main() {
  const client = new BasecampClient();
  const cardTables = new CardTablesResource(client);

  // Example IDs - replace with your actual values
  const projectId = 12345678; // Your project ID
  const columnId = 87654321; // The column/list ID where the card should be created

  console.log('=== Creating Complete Tasks Example ===\n');

  try {
    // Example 1: Simple task with steps
    console.log('1. Creating a simple task with 3 steps...');
    const simpleTask = await cardTables.createCardWithSteps(projectId, columnId, {
      title: 'Setup development environment',
      content: 'Prepare the development environment for the new project',
      due_on: '2025-12-31',
      steps: [
        { title: 'Install Node.js and npm' },
        { title: 'Setup Git repository' },
        { title: 'Install project dependencies' },
      ],
    });
    console.log(`✅ Created: ${simpleTask.card.title} with ${simpleTask.steps.length} steps\n`);

    // Example 2: Complex task with detailed steps and due dates
    console.log('2. Creating a complex task with detailed steps...');
    const complexTask = await cardTables.createCardWithSteps(projectId, columnId, {
      title: 'Implement user authentication system',
      content: `Complete implementation of user authentication with OAuth2 support.

**Requirements:**
- Email/password authentication
- OAuth2 providers (Google, GitHub)
- JWT token handling
- Password reset flow
- Two-factor authentication

**Technical Details:**
- Use passport.js for authentication
- Implement JWT with refresh tokens
- Store sessions in Redis
- Add rate limiting for login attempts`,
      due_on: '2025-12-31',
      steps: [
        {
          title: 'Design authentication flow and database schema',
          due_on: '2025-12-10',
        },
        {
          title: 'Implement email/password authentication',
          due_on: '2025-12-15',
        },
        {
          title: 'Add OAuth2 integration (Google, GitHub)',
          due_on: '2025-12-18',
        },
        {
          title: 'Implement JWT token handling and refresh',
          due_on: '2025-12-20',
        },
        {
          title: 'Create password reset flow',
          due_on: '2025-12-22',
        },
        {
          title: 'Add two-factor authentication',
          due_on: '2025-12-25',
        },
        {
          title: 'Write unit tests and integration tests',
          due_on: '2025-12-28',
        },
        {
          title: 'Documentation and code review',
          due_on: '2025-12-30',
        },
      ],
    });
    console.log(`✅ Created: ${complexTask.card.title} with ${complexTask.steps.length} steps\n`);

    // Example 3: Task with assignees
    console.log('3. Creating a task with assignees...');
    const taskWithAssignees = await cardTables.createCardWithSteps(projectId, columnId, {
      title: 'Design new landing page',
      content: `Create a modern, responsive landing page.

**Design Requirements:**
- Mobile-first approach
- Dark mode support
- Accessibility (WCAG 2.1 AA)
- Fast loading time (<2s)

**Deliverables:**
- Figma mockups
- HTML/CSS implementation
- Performance optimization`,
      due_on: '2025-12-20',
      assignee_ids: [123, 456], // Replace with actual person IDs
      steps: [
        {
          title: 'Research competitors and gather inspiration',
          due_on: '2025-12-05',
          assignees: '123', // Assign to specific person
        },
        {
          title: 'Create wireframes and mockups in Figma',
          due_on: '2025-12-10',
          assignees: '123',
        },
        {
          title: 'Implement HTML/CSS structure',
          due_on: '2025-12-15',
          assignees: '456',
        },
        {
          title: 'Add animations and interactions',
          due_on: '2025-12-18',
          assignees: '456',
        },
        {
          title: 'Optimize performance and accessibility',
          due_on: '2025-12-20',
          assignees: '123,456', // Assign to multiple people
        },
      ],
    });
    console.log(
      `✅ Created: ${taskWithAssignees.card.title} with ${taskWithAssignees.steps.length} steps\n`
    );

    console.log('\n✨ All tasks created successfully!');
    console.log('\nTask URLs:');
    console.log(`1. ${simpleTask.card.app_url}`);
    console.log(`2. ${complexTask.card.app_url}`);
    console.log(`3. ${taskWithAssignees.card.app_url}`);

    console.log('\n💡 Benefits of using createCardWithSteps:');
    console.log('   - One method call instead of multiple API requests');
    console.log('   - Ensures description is always provided');
    console.log('   - Creates card and all steps atomically');
    console.log('   - Returns all created data in one response');
    console.log('   - Perfect for AI-driven task creation');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

main().catch(console.error);
