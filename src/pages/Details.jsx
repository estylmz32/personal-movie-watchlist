import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const API = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";
const SESSION_RESTORE_KEY = "searchRestore";

function buildUrl(path, params = {}) {
  const apiKey = import.meta.env.VITE_TMDB_KEY;
  const u = new URL(API + path);
  u.searchParams.set("api_key", apiKey);
  u.searchParams.set("language", "en-US");
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== "") u.searchParams.set(k, v);
  });
  return u.toString();
}

async function tmdb(path, params = {}) {
  const res = await fetch(buildUrl(path, params));
  if (!res.ok) throw new Error("TMDB request failed");
  return res.json();
}

function loadWatchlist() {
  try {
    const raw = localStorage.getItem("watchlist");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveWatchlist(list) {
  localStorage.setItem("watchlist", JSON.stringify(list));
}

function loadSession(key, fallback) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export default function Details() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [movie, setMovie] = useState(null);
  const [director, setDirector] = useState("");
  const [cast, setCast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [watchlist, setWatchlist] = useState(() => loadWatchlist());

  useEffect(() => {
    saveWatchlist(watchlist);
  }, [watchlist]);

  const inWatchlist = useMemo(() => watchlist.some((x) => String(x.id) === String(id)), [watchlist, id]);

  useEffect(() => {
    let alive = true;

    setLoading(true);
    setErr("");
    setMovie(null);
    setDirector("");
    setCast([]);

    Promise.all([tmdb(`/movie/${id}`, {}), tmdb(`/movie/${id}/credits`, {})])
      .then(([m, c]) => {
        if (!alive) return;

        setMovie(m || null);

        const crew = Array.isArray(c?.crew) ? c.crew : [];
        const d = crew.find((x) => x && x.job === "Director");
        setDirector(d?.name || "");

        const topCast = Array.isArray(c?.cast) ? c.cast.slice(0, 8) : [];
        setCast(topCast);
      })
      .catch(() => {
        if (!alive) return;
        setErr("Could not load details.");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [id]);

  function toggleWatchlist() {
    if (!movie || !movie.id) return;

    setWatchlist((prev) => {
      const exists = prev.some((x) => String(x.id) === String(movie.id));
      if (exists) return prev.filter((x) => String(x.id) !== String(movie.id));

      const item = {
        id: movie.id,
        title: movie.title || "",
        poster_path: movie.poster_path || "",
        release_date: movie.release_date || "",
        watched: false,
        rating: "",
        note: "",
        addedAt: Date.now(),
      };
      return [item, ...prev];
    });
  }

  function goBack() {
    const restore = loadSession(SESSION_RESTORE_KEY, null);
    navigate("/search", { state: restore ? { restore } : undefined });
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <h1 style={{ margin: "8px 0 12px" }}>Details</h1>
        <button
          onClick={goBack}
          style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}
        >
          Back
        </button>
      </div>

      {err && <div style={{ marginTop: 12, color: "crimson" }}>{err}</div>}
      {loading && <div style={{ marginTop: 12, opacity: 0.75 }}>Loading...</div>}

      {!loading && movie && (
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, alignItems: "start" }}>
          <div style={{ border: "1px solid #eee", borderRadius: 12, overflow: "hidden", background: "#f3f3f3" }}>
            {movie.poster_path ? (
              <img
                src={IMG + movie.poster_path}
                alt={movie.title || "Movie poster"}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : null}
          </div>

          <div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <h2 style={{ margin: 0 }}>{movie.title}</h2>
              <button
                onClick={toggleWatchlist}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  background: inWatchlist ? "#eee" : "#fff",
                  cursor: "pointer",
                }}
              >
                {inWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
              </button>
            </div>

            <div style={{ marginTop: 8, opacity: 0.8 }}>
              {(movie.release_date || "").slice(0, 4) || "—"}
              {director ? ` · Director: ${director}` : ""}
            </div>

            {movie.overview ? <p style={{ marginTop: 12, lineHeight: 1.6 }}>{movie.overview}</p> : null}

            {cast.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Top Cast</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10 }}>
                  {cast.map((c) => (
                    <div key={c.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 10 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{c.name}</div>
                      <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>{c.character || ""}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
