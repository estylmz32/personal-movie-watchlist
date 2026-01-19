import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPopularMovies, getPosterUrl } from "../api/tmdb";
import { addToWatchlist, isInWatchlist, removeFromWatchlist } from "../utils/watchlist";

export default function Home() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");

    getPopularMovies(1)
      .then((data) => {
        if (!alive) return;
        setMovies(data?.results || []);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e?.message || "Failed to load movies");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const toggleWatchlist = (e, movie, inList) => {
    e.preventDefault();
    e.stopPropagation();

    if (inList) {
      removeFromWatchlist(movie.id);
    } else {
      addToWatchlist(movie);
    }

    setMovies((x) => [...x]);
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <h1 style={{ marginBottom: 16 }}>Popular Movies</h1>

      {loading && <p>Loading...</p>}
      {error && <p style={{ opacity: 0.85 }}>{error}</p>}

      {!loading && !error && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 16,
            alignItems: "start",
          }}
        >
          {movies.map((m) => {
            const year = m?.release_date ? m.release_date.slice(0, 4) : "";
            const poster = getPosterUrl(m?.poster_path, "w342");
            const inList = isInWatchlist(m?.id);

            return (
              <Link
                key={m.id}
                to={`/details/${m.id}`}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  overflow: "hidden",
                  display: "block",
                }}
              >
                <div style={{ aspectRatio: "2 / 3", background: "rgba(0,0,0,0.25)" }}>
                  {poster ? (
                    <img
                      src={poster}
                      alt={m.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      loading="lazy"
                    />
                  ) : null}
                </div>

                <div style={{ padding: 12, display: "grid", gap: 10, gridTemplateRows: "auto 1fr" }}>
                  <div style={{ display: "grid", gap: 4 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        lineHeight: 1.2,
                        minHeight: 44,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {m.title}
                    </div>

                    <div style={{ fontSize: 13, opacity: 0.8 }}>
                      {year}
                      {typeof m.vote_average === "number" ? ` • ${m.vote_average.toFixed(1)}` : ""}
                    </div>
                  </div>

                  <button
                    onClick={(e) => toggleWatchlist(e, m, inList)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: inList ? "rgba(255,80,80,0.18)" : "rgba(255,255,255,0.12)",
                      color: "inherit",
                      cursor: "pointer",
                      marginTop: 6,
                    }}
                  >
                    {inList ? "Remove" : "Add"}
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
