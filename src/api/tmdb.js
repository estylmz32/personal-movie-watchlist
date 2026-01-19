const BASE = "https://api.themoviedb.org/3";

function key() {
  return import.meta.env.VITE_TMDB_KEY;
}

async function req(path) {
  const k = key();
  if (!k) {
    throw new Error("VITE_TMDB_KEY is missing");
  }

  const url = `${BASE}${path}${path.includes("?") ? "&" : "?"}api_key=${encodeURIComponent(k)}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    const msg = data?.status_message ? ` (${data.status_message})` : "";
    throw new Error(`TMDB request failed: ${res.status}${msg}`);
  }

  return data;
}

export function getPopular(page = 1) {
  return req(`/movie/popular?language=en-US&page=${page}`);
}

export function searchMovies(query, page = 1) {
  return req(
    `/search/movie?language=en-US&include_adult=false&page=${page}&query=${encodeURIComponent(query || "")}`
  );
}

export function getMovie(id) {
  return req(`/movie/${id}?language=en-US`);
}

export function getMovieCredits(id) {
  return req(`/movie/${id}/credits?language=en-US`);
}

export function getPosterUrl(path, size = "w342") {
  if (!path) return "";
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export const getPopularMovies = getPopular;
export const getMovieDetails = getMovie;
