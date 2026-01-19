import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const API = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w342";
const SESSION_RESTORE_KEY = "searchRestore";
const SESSION_PATH_KEY = "lastSearchPath";

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
  const { signal, ...rest } = params;
  const res = await fetch(buildUrl(path, rest), { signal });
  if (!res.ok) throw new Error("TMDB request failed");
  return res.json();
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
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

function saveSession(key, value) {
  sessionStorage.setItem(key, JSON.stringify(value));
}

export default function Search() {
  const location = useLocation();
  const navigate = useNavigate();

  const [mode, setMode] = useState("movie");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [movieResults, setMovieResults] = useState([]);
  const [personResults, setPersonResults] = useState([]);

  const [selectedPerson, setSelectedPerson] = useState(null);
  const [personMovies, setPersonMovies] = useState([]);

  const [recent, setRecent] = useState(() => loadJSON("recentSearches", []));

  const abortRef = useRef(null);
  const restoredRef = useRef(false);
  const debounceRef = useRef(null);
  const writeUrlLockRef = useRef(false);

  const normalizedQ = useMemo(() => q.trim(), [q]);

  useEffect(() => {
    saveJSON("recentSearches", recent.slice(0, 10));
  }, [recent]);

  useEffect(() => {
    sessionStorage.setItem(SESSION_PATH_KEY, location.pathname + location.search);
  }, [location.pathname, location.search]);

  useEffect(() => {
    saveSession(SESSION_RESTORE_KEY, {
      mode,
      q,
      selectedPersonId: selectedPerson?.id || null,
    });
  }, [mode, q, selectedPerson?.id]);

  useEffect(() => {
    if (restoredRef.current) return;

    const sp = new URLSearchParams(location.search);
    const urlMode = sp.get("mode");
    const urlQ = sp.get("q");

    const urlRestore =
      (urlMode === "movie" || urlMode === "person" || urlMode === "people") || urlQ
        ? {
            mode: urlMode === "people" ? "person" : urlMode || "movie",
            q: urlQ || "",
            selectedPersonId: null,
          }
        : null;

    const navRestore = location.state?.restore || null;
    const sessionRestore = loadSession(SESSION_RESTORE_KEY, null);
    const restore = navRestore || urlRestore || sessionRestore;

    if (!restore) return;
    restoredRef.current = true;

    const nextMode = restore.mode === "people" ? "person" : restore.mode || "movie";
    const nextQ = restore.q || "";
    const nextPersonId = restore.selectedPersonId || null;

    setMode(nextMode);
    setQ(nextQ);

    if (nextMode === "movie" && nextQ.trim()) {
      runSearch(nextQ, { silentRecent: true });
      return;
    }

    if (nextMode === "person" && nextQ.trim()) {
      runSearch(nextQ, { silentRecent: true });
      if (nextPersonId) restorePerson(nextPersonId);
    }
  }, [location.search, location.state]);

  useEffect(() => {
    setErr("");
    setSelectedPerson(null);
    setPersonMovies([]);
    setMovieResults([]);
    setPersonResults([]);
  }, [mode]);

  useEffect(() => {
    if (!restoredRef.current) return;
    if (writeUrlLockRef.current) return;

    const sp = new URLSearchParams(location.search);
    const currentMode = sp.get("mode") || "";
    const currentQ = sp.get("q") || "";

    const nextMode = mode === "person" ? "person" : "movie";
    const nextQ = q || "";

    if (currentMode === nextMode && currentQ === nextQ) return;

    writeUrlLockRef.current = true;
    navigate(
      {
        pathname: "/search",
        search: `?mode=${encodeURIComponent(nextMode)}&q=${encodeURIComponent(nextQ)}`,
      },
      { replace: true }
    );
    setTimeout(() => {
      writeUrlLockRef.current = false;
    }, 0);
  }, [mode, q]);

  useEffect(() => {
    if (!restoredRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const text = normalizedQ;
    if (!text) return;

    debounceRef.current = setTimeout(() => {
      runSearch(text);
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [normalizedQ, mode]);

  async function runSearch(query, opts = {}) {
    const text = query.trim();
    if (!text) return;

    setLoading(true);
    setErr("");

    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      if (mode === "movie") {
        const data = await tmdb("/search/movie", {
          query: text,
          include_adult: "false",
          page: 1,
          signal: ac.signal,
        });
        setMovieResults((data?.results || []).slice(0, 24));
        setPersonResults([]);
      } else {
        const data = await tmdb("/search/person", {
          query: text,
          include_adult: "false",
          page: 1,
          signal: ac.signal,
        });
        setPersonResults((data?.results || []).slice(0, 24));
        setMovieResults([]);
      }

      if (!opts.silentRecent) {
        setRecent((prev) => {
          const next = [text, ...prev.filter((x) => x !== text)];
          return next.slice(0, 10);
        });
      }
    } catch (e) {
      if (e?.name !== "AbortError") setErr("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function restorePerson(personId) {
    try {
      const p = await tmdb(`/person/${personId}`, {});
      if (!p?.id) return;
      await openPerson({
        id: p.id,
        name: p.name,
        known_for_department: p.known_for_department,
        profile_path: p.profile_path,
      });
    } catch {}
  }

  async function openPerson(person) {
    setSelectedPerson(person);
    setPersonMovies([]);
    setLoading(true);
    setErr("");

    try {
      const data = await tmdb(`/person/${person.id}/movie_credits`, {});
      const list = (data?.cast || [])
        .filter((m) => m && m.id)
        .sort((a, b) => (b?.popularity || 0) - (a?.popularity || 0))
        .slice(0, 30);
      setPersonMovies(list);
    } catch {
      setErr("Could not load person movies.");
    } finally {
      setLoading(false);
    }
  }

  function clearAll() {
    setQ("");
    setMovieResults([]);
    setPersonResults([]);
    setSelectedPerson(null);
    setPersonMovies([]);
    setErr("");
    setRecent([]);
    localStorage.removeItem("recentSearches");
    sessionStorage.removeItem(SESSION_RESTORE_KEY);
    sessionStorage.removeItem(SESSION_PATH_KEY);
    writeUrlLockRef.current = true;
    navigate({ pathname: "/search", search: "" }, { replace: true });
    setTimeout(() => {
      writeUrlLockRef.current = false;
    }, 0);
  }

  function onKeyDown(e) {
    if (e.key === "Enter") runSearch(q);
    if (e.key === "Escape") clearAll();
  }

  const from = location.pathname + location.search;

  const restoreState = {
    from,
    restore: {
      mode,
      q,
      selectedPersonId: selectedPerson?.id || null,
    },
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <h1 style={{ margin: "8px 0 12px" }}>Search</h1>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", border: "1px solid #ddd", borderRadius: 10, overflow: "hidden" }}>
          <button
            onClick={() => setMode("movie")}
            style={{ padding: "10px 14px", border: 0, background: mode === "movie" ? "#eee" : "#fff", cursor: "pointer" }}
          >
            Movies
          </button>
          <button
            onClick={() => setMode("person")}
            style={{ padding: "10px 14px", border: 0, background: mode === "person" ? "#eee" : "#fff", cursor: "pointer" }}
          >
            People
          </button>
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={mode === "movie" ? "Search movies..." : "Search actors/people..."}
          style={{ flex: "1 1 420px", padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", outline: "none" }}
        />

        <button
          onClick={() => runSearch(q)}
          disabled={!normalizedQ || loading}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: !normalizedQ || loading ? "#f6f6f6" : "#fff",
            cursor: !normalizedQ || loading ? "not-allowed" : "pointer",
          }}
        >
          Search
        </button>

        <button
          onClick={clearAll}
          style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}
        >
          Clear
        </button>
      </div>

      {recent.length > 0 && (
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ opacity: 0.7 }}>Recent:</span>
          {recent.map((x) => (
            <button
              key={x}
              onClick={() => {
                setQ(x);
                runSearch(x);
              }}
              style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}
            >
              {x}
            </button>
          ))}
        </div>
      )}

      {err && <div style={{ marginTop: 12, color: "crimson" }}>{err}</div>}
      {loading && <div style={{ marginTop: 12, opacity: 0.75 }}>Loading...</div>}

      {mode === "movie" && movieResults.length > 0 && (
        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
          {movieResults.map((m) => (
            <Link
              key={m.id}
              to={`/details/${m.id}`}
              state={restoreState}
              style={{ textDecoration: "none", color: "inherit", border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}
            >
              <div style={{ aspectRatio: "2/3", background: "#f3f3f3" }}>
                {m.poster_path ? (
                  <img src={IMG + m.poster_path} alt={m.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
                ) : null}
              </div>
              <div style={{ padding: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.2 }}>{m.title}</div>
                <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>{(m.release_date || "").slice(0, 4) || "—"}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {mode === "person" && selectedPerson && (
        <div style={{ marginTop: 16, border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <div style={{ fontWeight: 700 }}>
              {selectedPerson.name}
              {selectedPerson.known_for_department ? (
                <span style={{ opacity: 0.7, fontWeight: 400 }}> · {selectedPerson.known_for_department}</span>
              ) : null}
            </div>
            <button
              onClick={() => {
                setSelectedPerson(null);
                setPersonMovies([]);
              }}
              style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}
            >
              Back
            </button>
          </div>

          {personMovies.length > 0 ? (
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
              {personMovies.map((m) => (
                <Link
                  key={m.id}
                  to={`/details/${m.id}`}
                  state={restoreState}
                  style={{ textDecoration: "none", color: "inherit", border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}
                >
                  <div style={{ aspectRatio: "2/3", background: "#f3f3f3" }}>
                    {m.poster_path ? (
                      <img src={IMG + m.poster_path} alt={m.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
                    ) : null}
                  </div>
                  <div style={{ padding: 10 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.2 }}>{m.title}</div>
                    <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>{(m.release_date || "").slice(0, 4) || "—"}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            !loading && <div style={{ marginTop: 10, opacity: 0.7 }}>No movies found.</div>
          )}
        </div>
      )}

      {mode === "person" && !selectedPerson && personResults.length > 0 && (
        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {personResults.map((p) => (
            <button
              key={p.id}
              onClick={() => openPerson(p)}
              style={{
                textAlign: "left",
                border: "1px solid #eee",
                borderRadius: 12,
                overflow: "hidden",
                background: "#fff",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <div style={{ display: "flex", gap: 10, padding: 10, alignItems: "center" }}>
                <div style={{ width: 56, height: 56, borderRadius: 12, background: "#f3f3f3", overflow: "hidden", flex: "0 0 56px" }}>
                  {p.profile_path ? (
                    <img src={IMG + p.profile_path} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
                  ) : null}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.name}
                  </div>
                  <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>{p.known_for_department || "Person"}</div>
                </div>
              </div>

              {Array.isArray(p.known_for) && p.known_for.length > 0 ? (
                <div style={{ padding: "0 10px 10px", opacity: 0.75, fontSize: 12, lineHeight: 1.4 }}>
                  Known for:{" "}
                  {p.known_for
                    .slice(0, 3)
                    .map((k) => k?.title || k?.name)
                    .filter(Boolean)
                    .join(", ")}
                </div>
              ) : null}
            </button>
          ))}
        </div>
      )}

      {!loading && !err && normalizedQ && mode === "movie" && movieResults.length === 0 && (
        <div style={{ marginTop: 16, opacity: 0.7 }}>No results.</div>
      )}

      {!loading && !err && normalizedQ && mode === "person" && !selectedPerson && personResults.length === 0 && (
        <div style={{ marginTop: 16, opacity: 0.7 }}>No results.</div>
      )}
    </div>
  );
}
