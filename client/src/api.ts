import type { FilterOptions, SessionInfo, UserPreferences, MatchResult, VotingResults } from "./types";

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

export async function verifyAdminPassword(password: string): Promise<{ valid: boolean }> {
  return request<{ valid: boolean }>("/admin/verify", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export async function createSession(movieCount?: number, adminPassword?: string): Promise<{ code: string; movieCount: number }> {
  return request<{ code: string; movieCount: number }>("/session", { 
    method: "POST",
    body: JSON.stringify({ movieCount, adminPassword }),
  });
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

export async function reroll(code: string): Promise<{ result: MatchResult["result"]; isLast: boolean; isFirst: boolean }> {
  return request<{ result: MatchResult["result"]; isLast: boolean; isFirst: boolean }>(`/session/${code}/reroll`, {
    method: "POST",
  });
}

export async function previous(code: string): Promise<{ result: MatchResult["result"]; isLast: boolean; isFirst: boolean }> {
  return request<{ result: MatchResult["result"]; isLast: boolean; isFirst: boolean }>(`/session/${code}/previous`, {
    method: "POST",
  });
}

export async function vote(
  code: string,
  userId: string,
  movieId: string,
  voteValue: boolean
): Promise<{ success: boolean; votingComplete: boolean }> {
  return request<{ success: boolean; votingComplete: boolean }>(`/session/${code}/vote`, {
    method: "POST",
    body: JSON.stringify({ userId, movieId, vote: voteValue }),
  });
}

export async function getVotingResults(code: string): Promise<VotingResults> {
  return request<VotingResults>(`/session/${code}/voting-results`);
}

export interface SimpleMovie {
  id: string;
  title: string;
  year: number;
  poster: string | null;
  imdbRating: number | null;
  tmdbRating: number | null;
  rtRating: number | null;
  inLibrary: boolean;
}

export async function getSimilarMovies(title: string, year: number): Promise<SimpleMovie[]> {
  const data = await request<{ similar: SimpleMovie[] }>(`/similar?title=${encodeURIComponent(title)}&year=${year}`);
  return data.similar;
}
