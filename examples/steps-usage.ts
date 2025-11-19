/**
 * Example: Working with Basecamp Card Table Steps (Subtasks)
 *
 * This example demonstrates how to create, update, complete, and reposition steps
 * within cards in Basecamp Card Tables (Kanban boards).
 */

import { BasecampClient, StepsResource } from '../src/sdk/index.js';

async function main() {
  const client = new BasecampClient();
  const steps = new StepsResource(client);

  // Example project and card IDs
  const projectId = 12345678; // Replace with your project ID
  const cardId = 87654321; // Replace with your card ID
  const stepId = 11111111; // Replace with your step ID (for update/complete examples)

  console.log('=== Basecamp Steps Example ===\n');

  // 1. Create a new step in a card
  console.log('1. Creating a new step...');
  try {
    const newStep = await steps.create(projectId, cardId, {
      title: 'Review pull request',
      due_on: '2025-12-31',
      assignees: '123,456', // comma-separated person IDs
    });
    console.log('Created step:', newStep);
  } catch (error) {
    console.error('Error creating step:', error);
  }

  // 2. Update an existing step
  console.log('\n2. Updating a step...');
  try {
    const updatedStep = await steps.update(projectId, stepId, {
      title: 'Review and approve pull request',
      due_on: '2026-01-15',
    });
    console.log('Updated step:', updatedStep);
  } catch (error) {
    console.error('Error updating step:', error);
  }

  // 3. Mark a step as completed
  console.log('\n3. Marking step as completed...');
  try {
    const completedStep = await steps.complete(projectId, stepId, 'on');
    console.log('Completed step:', completedStep);
  } catch (error) {
    console.error('Error completing step:', error);
  }

  // 4. Mark a step as uncompleted
  console.log('\n4. Marking step as uncompleted...');
  try {
    const uncompletedStep = await steps.complete(projectId, stepId, 'off');
    console.log('Uncompleted step:', uncompletedStep);
  } catch (error) {
    console.error('Error uncompleting step:', error);
  }

  // 5. Reposition a step within its card
  console.log('\n5. Repositioning step...');
  try {
    await steps.reposition(projectId, cardId, {
      source_id: stepId,
      position: 2, // Zero-indexed position
    });
    console.log('Step repositioned successfully');
  } catch (error) {
    console.error('Error repositioning step:', error);
  }

  // 6. Get all steps for a card
  console.log('\n6. Getting all steps for a card...');
  try {
    const cardData = await steps.getStepsForCard(projectId, cardId);
    console.log('Card steps:', cardData.steps);
  } catch (error) {
    console.error('Error getting steps:', error);
  }

  // 7. Create multiple steps for a task breakdown
  console.log('\n7. Creating a task breakdown with multiple steps...');
  const taskSteps = [
    { title: 'Design database schema', due_on: '2025-12-01' },
    { title: 'Implement API endpoints', due_on: '2025-12-10' },
    { title: 'Write unit tests', due_on: '2025-12-15' },
    { title: 'Create documentation', due_on: '2025-12-20' },
    { title: 'Code review', due_on: '2025-12-25' },
  ];

  try {
    for (const taskStep of taskSteps) {
      const createdStep = await steps.create(projectId, cardId, taskStep);
      console.log(`Created: ${createdStep.title}`);
    }
    console.log('Task breakdown created successfully!');
  } catch (error) {
    console.error('Error creating task breakdown:', error);
  }
}

// Run the example
main().catch(console.error);
