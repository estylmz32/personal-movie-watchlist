const KEY = "watchlist_v1";

export function getWatchlist() {
  return JSON.parse(localStorage.getItem(KEY) || "[]");
}

export function addToWatchlist(movie) {
  const list = getWatchlist();
  if (list.some((m) => m.id === movie.id)) return;

  const item = {
    id: movie.id,
    title: movie.title,
    release_date: movie.release_date || "",
    poster_path: movie.poster_path || "",
    overview: movie.overview || "",
    vote_average: movie.vote_average ?? null,
    watched: false,
    addedAt: Date.now(),
    note: "",
    rating: null,
  };

  localStorage.setItem(KEY, JSON.stringify([item, ...list]));
}

export function removeFromWatchlist(id) {
  const list = getWatchlist().filter((m) => m.id !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function isInWatchlist(id) {
  return getWatchlist().some((m) => m.id === id);
}

export function getWatchItem(id) {
  return getWatchlist().find((m) => m.id === id) || null;
}

export function toggleWatched(id) {
  const updated = getWatchlist().map((m) =>
    m.id === id ? { ...m, watched: !m.watched } : m
  );
  localStorage.setItem(KEY, JSON.stringify(updated));
}

export function setWatched(id, watched) {
  const updated = getWatchlist().map((m) =>
    m.id === id ? { ...m, watched: Boolean(watched) } : m
  );
  localStorage.setItem(KEY, JSON.stringify(updated));
}

export function updateNote(id, note) {
  const updated = getWatchlist().map((m) =>
    m.id === id ? { ...m, note } : m
  );
  localStorage.setItem(KEY, JSON.stringify(updated));
}

export function updateRating(id, rating) {
  const updated = getWatchlist().map((m) =>
    m.id === id ? { ...m, rating } : m
  );
  localStorage.setItem(KEY, JSON.stringify(updated));
}
