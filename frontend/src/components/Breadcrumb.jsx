import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

export function Breadcrumb({ items }) {
  return (
    <nav data-testid="breadcrumb" className="flex items-center gap-1.5 text-sm mb-4">
      <Link to="/" data-testid="breadcrumb-home" className="flex items-center gap-1 text-[#718096] hover:text-[#FF8200] transition-colors">
        <Home size={14} /> Accueil intégré
      </Link>
      {items.map((it, i) => (
        <React.Fragment key={i}>
          <ChevronRight size={14} className="text-[#CBD5E0]" />
          {it.to ? (
            <Link to={it.to} className="text-[#718096] hover:text-[#FF8200] transition-colors">{it.label}</Link>
          ) : <span className="font-semibold text-[#1A202C]">{it.label}</span>}
        </React.Fragment>
      ))}
    </nav>
  );
}
