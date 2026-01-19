import { Routes, Route, NavLink } from "react-router-dom";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Watchlist from "./pages/Watchlist";
import Details from "./pages/Details";
import "./App.css";

export default function App() {
  return (
    <div className="appWrap">
      <div className="container">
        <div className="nav">
          <div className="navInner">
            <NavLink to="/" className={({ isActive }) => (isActive ? "navLink navLinkActive" : "navLink")}>
              Home
            </NavLink>
            <NavLink to="/search" className={({ isActive }) => (isActive ? "navLink navLinkActive" : "navLink")}>
              Search
            </NavLink>
            <NavLink to="/watchlist" className={({ isActive }) => (isActive ? "navLink navLinkActive" : "navLink")}>
              Watchlist
            </NavLink>
          </div>
        </div>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/details/:id" element={<Details />} />
        </Routes>
      </div>
    </div>
  );
}
