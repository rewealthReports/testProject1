import type { BrandingProfile } from "../plannerxchange";
import { Link, useLocation } from "react-router-dom";

interface NavLink {
  to: string;
  label: string;
}

const NAV_LINKS: NavLink[] = [
  { to: "/", label: "Clients" },
  { to: "/settings", label: "Questionnaire" },
];

export function BrandedHeader({ branding }: { branding: BrandingProfile }) {
  const location = useLocation();

  return (
    <header
      className="print:hidden flex items-center justify-between px-6 py-3 shadow-sm"
      style={{ backgroundColor: branding.primaryColor, color: branding.fontColor ?? "#ffffff" }}
    >
      <div className="flex items-center gap-3">
        {branding.logoUrl ? (
          <img
            src={branding.logoUrl}
            alt="Firm logo"
            // Responsive sizing — different firms upload different proportions.
            className="h-8 max-w-[160px] object-contain"
          />
        ) : (
          <span className="font-semibold text-sm opacity-80">
            {/* Graceful fallback when no logo is configured */}
            RTQ
          </span>
        )}
        <span className="font-semibold text-base tracking-tight">Risk Tolerance Questionnaire</span>
      </div>

      <nav className="flex items-center gap-1">
        {NAV_LINKS.map((link) => {
          const active = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className="px-3 py-1 rounded text-sm transition-colors"
              style={{
                backgroundColor: active
                  ? (branding.fontColor ? `${branding.fontColor}22` : "rgba(255,255,255,0.2)")
                  : "transparent",
                color: branding.fontColor ?? "#ffffff",
                textDecoration: "none",
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
