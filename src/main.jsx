import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Watchlist from "./pages/Watchlist";
import Details from "./pages/Details";
import "./index.css";

function Layout() {
  return (
    <div style={{ minHeight: "100vh", background: "#111", color: "white" }}>
      <nav style={{ display: "flex", gap: 12, padding: 14, borderBottom: "1px solid #333" }}>
        <Link to="/" style={{ color: "white" }}>Home</Link>
        <Link to="/search" style={{ color: "white" }}>Search</Link>
        <Link to="/watchlist" style={{ color: "white" }}>Watchlist</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/details/:id" element={<Details />} />
      </Routes>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  </React.StrictMode>
);
