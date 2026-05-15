import type { Scenario, ScenarioMeta } from '@shared/index';

const BASE_URL = 'http://localhost:3000/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API error ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function listScenarios(): Promise<ScenarioMeta[]> {
  return request('/scenarios');
}

export function getScenario(id: string): Promise<Scenario> {
  return request(`/scenarios/${encodeURIComponent(id)}`);
}

export function createScenario(
  data: Omit<Scenario, 'id' | 'metadata'>,
): Promise<Scenario> {
  return request('/scenarios', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateScenario(
  id: string,
  data: Omit<Scenario, 'id' | 'metadata'>,
): Promise<Scenario> {
  return request(`/scenarios/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteScenario(id: string): Promise<void> {
  return request(`/scenarios/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
