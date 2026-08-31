import { BasecampClient } from '../client.js';
import type { Person } from '../types.js';

export class PeopleResource {
  constructor(private readonly client: BasecampClient) {}

  list() {
    return this.client.get<Person[]>('/people.json');
  }

  get(personId: number) {
    return this.client.get<Person>(`/people/${personId}.json`);
  }
}
