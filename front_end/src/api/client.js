const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

export async function getReadings({ stakeId, limit = 100 } = {}) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (stakeId) params.set("stake_id", stakeId);
  const res = await fetch(`${BASE}/api/readings?${params}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  if (data.status === "error") throw new Error(data.error);
  return data.readings;
}

export async function getStakes() {
  const res = await fetch(`${BASE}/api/stakes`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  if (data.status === "error") throw new Error(data.error);
  return data.stakes;
}

export async function getHealth() {
  const res = await fetch(`${BASE}/api/health`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  if (data.status === "error") throw new Error(data.error);
  return data;
}