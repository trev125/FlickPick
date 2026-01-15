import type { FilterOptions, SessionInfo, UserPreferences, MatchResult } from "./types";

const API_BASE = "/api";

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }

  return response.json();
}

export async function getFilters(): Promise<FilterOptions> {
  return request<FilterOptions>("/filters");
}

export async function createSession(): Promise<{ code: string }> {
  return request<{ code: string }>("/session", { method: "POST" });
}

export async function getSession(code: string): Promise<SessionInfo> {
  return request<SessionInfo>(`/session/${code}`);
}

export async function joinSession(
  code: string,
  userId: string,
  name: string
): Promise<{ code: string; joined: boolean }> {
  return request<{ code: string; joined: boolean }>(`/session/${code}/join`, {
    method: "POST",
    body: JSON.stringify({ userId, name }),
  });
}

export async function submitPreferences(
  code: string,
  userId: string,
  preferences: UserPreferences
): Promise<{ submitted: boolean; allSubmitted: boolean }> {
  return request<{ submitted: boolean; allSubmitted: boolean }>(
    `/session/${code}/preferences`,
    {
      method: "POST",
      body: JSON.stringify({ userId, preferences }),
    }
  );
}

export async function getResult(code: string): Promise<MatchResult> {
  return request<MatchResult>(`/session/${code}/result`);
}

export async function reroll(code: string): Promise<{ result: MatchResult["result"]; isLast: boolean }> {
  return request<{ result: MatchResult["result"]; isLast: boolean }>(`/session/${code}/reroll`, {
    method: "POST",
  });
}
