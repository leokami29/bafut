import type { SVGProps } from "react";

type SportType = "padel" | "futbol" | "futbol_sala" | "basquet" | "voleibol" | string;

type Props = SVGProps<SVGSVGElement> & {
  sport: SportType;
  size?: number | string;
};

/**
 * Iconos vectoriales de deportes diseñados en estilo Lucide (stroke 2px, 24x24, currentColor).
 */
export function TournamentSportIcon({
  sport,
  size = 20,
  className = "",
  ...rest
}: Props) {
  const norm = (sport || "").toLowerCase();

  switch (norm) {
    case "padel":
      // Pala de pádel estilizada con agujeros característicos y mango
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
          {...rest}
        >
          {/* Cabeza redonda de la pala */}
          <circle cx="12" cy="9" r="6" />
          {/* Perforaciones de la pala de pádel */}
          <circle cx="10" cy="8" r="0.75" fill="currentColor" strokeWidth="0" />
          <circle cx="14" cy="8" r="0.75" fill="currentColor" strokeWidth="0" />
          <circle cx="12" cy="10.5" r="0.75" fill="currentColor" strokeWidth="0" />
          {/* Cuello y mango */}
          <path d="M10.5 15 L9.5 21 L14.5 21 L13.5 15" />
          {/* Cuerda de seguridad inferior */}
          <path d="M12 21 L12 23" />
        </svg>
      );

    case "futbol":
    case "futbol_sala":
      // Balón de fútbol clásico con patrón geométrico
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
          {...rest}
        >
          <circle cx="12" cy="12" r="9" />
          {/* Pentágono central */}
          <path d="M12 9 L14.5 11 L13.5 14 L10.5 14 L9.5 11 Z" fill="currentColor" fillOpacity="0.25" />
          {/* Líneas a la circunferencia */}
          <path d="M12 9 L12 3" />
          <path d="M14.5 11 L20.5 9.5" />
          <path d="M13.5 14 L18 19" />
          <path d="M10.5 14 L6 19" />
          <path d="M9.5 11 L3.5 9.5" />
        </svg>
      );

    case "basquet":
      // Balón de baloncesto con costuras
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
          {...rest}
        >
          <circle cx="12" cy="12" r="9" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="12" y1="3" x2="12" y2="21" />
          <path d="M5.5 5.5 C8.5 8.5 8.5 15.5 5.5 18.5" />
          <path d="M18.5 5.5 C15.5 8.5 15.5 15.5 18.5 18.5" />
        </svg>
      );

    case "voleibol":
      // Balón de vóley con paneles curvados
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
          {...rest}
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3 A9 9 0 0 1 18.36 18.36" />
          <path d="M12 3 A9 9 0 0 0 5.64 18.36" />
          <path d="M5.64 18.36 A9 9 0 0 0 18.36 18.36" />
          <line x1="12" y1="12" x2="12" y2="21" />
          <line x1="12" y1="12" x2="4.2" y2="7.5" />
          <line x1="12" y1="12" x2="19.8" y2="7.5" />
        </svg>
      );

    default:
      // Trofeo por defecto
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
          {...rest}
        >
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.45.98-.98 1.2A3.99 3.99 0 0 0 6 22h12a3.99 3.99 0 0 0-3.02-3.8c-.53-.22-.98-.65-.98-1.2v-2.34" />
          <path d="M6 2h12v7a6 6 0 0 1-12 0V2Z" />
        </svg>
      );
  }
}
