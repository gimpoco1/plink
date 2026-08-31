import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import messages from "./locales.json";

export const languages = ["en", "es", "it"] as const;
export type Language = (typeof languages)[number];

export const languageLabels: Record<Language, string> = {
  en: "English",
  es: "Español",
  it: "Italiano",
};

const LANGUAGE_STORAGE_KEY = "plink:language:v1";
export const LANGUAGE_DIALOG_REOPEN_KEY = "plink:reopen-language-dialog";

/* const messages = {
  en: {
    "language.label": "Language",
    "language.description": "Choose the language used in Plink.",
    "topbar.backToGame": "Back to game",
    "topbar.backToGames": "Back to games",
    "topbar.newGame": "New game",
    "topbar.signIn": "Sign in",
    "topbar.loading": "Loading...",
    "topbar.localOnly": "Local only",
    "topbar.account": "Account",
    "topbar.gameActions": "Game actions",
    "topbar.gameSettings": "Game settings",
    "topbar.gameHistory": "Game history",
    "topbar.invitePlayers": "Invite players",
    "topbar.managePlayers": "Manage players",
    "topbar.manageTeams": "Manage teams",
    "topbar.resetScores": "Reset scores",
    "topbar.endGame": "End game",
    "tabs.home": "Home",
    "tabs.sessions": "Sessions",
    "tabs.stats": "Stats",
    "tabs.players": "Players",
    "tabs.teams": "Teams",
    "tabs.playersView": "Players view",
    "common.pro": "Pro",
    "home.eyebrow": "Your scoreboard",
    "home.titleLineOne": "Keep the score.",
    "home.titleLineTwo": "Enjoy the game.",
    "home.copy": "Jump into a new match or keep your next round moving fast.",
    "home.resume": "Resume last game",
    "home.frequentGames": "Games you play often",
    "home.frequentGamesCopy": "Start a new game from your usual setups.",
    "home.teams": "Teams",
    "home.start": "Start",
  },
  es: {
    "language.label": "Idioma",
    "language.description": "Elige el idioma que se usa en Plink.",
    "topbar.backToGame": "Volver al juego",
    "topbar.backToGames": "Volver a las partidas",
    "topbar.newGame": "Nueva partida",
    "topbar.signIn": "Iniciar sesión",
    "topbar.loading": "Cargando...",
    "topbar.localOnly": "Solo local",
    "topbar.account": "Cuenta",
    "topbar.gameActions": "Acciones de la partida",
    "topbar.gameSettings": "Configuración de la partida",
    "topbar.gameHistory": "Historial de la partida",
    "topbar.invitePlayers": "Invitar jugadores",
    "topbar.managePlayers": "Gestionar jugadores",
    "topbar.manageTeams": "Gestionar equipos",
    "topbar.resetScores": "Restablecer marcadores",
    "topbar.endGame": "Terminar partida",
    "tabs.home": "Inicio",
    "tabs.sessions": "Partidas",
    "tabs.stats": "Estadísticas",
    "tabs.players": "Jugadores",
    "tabs.teams": "Equipos",
    "tabs.playersView": "Vista de jugadores",
    "common.pro": "Pro",
    "home.eyebrow": "Tu marcador",
    "home.titleLineOne": "Lleva la cuenta.",
    "home.titleLineTwo": "Disfruta del juego.",
    "home.copy": "Empieza una partida nueva o mantén la próxima ronda en marcha.",
    "home.resume": "Reanudar la última partida",
    "home.frequentGames": "Partidas que juegas a menudo",
    "home.frequentGamesCopy": "Empieza una partida con tus configuraciones habituales.",
    "home.teams": "Equipos",
    "home.start": "Empezar",
  },
  it: {
    "language.label": "Lingua",
    "language.description": "Scegli la lingua usata in Plink.",
    "topbar.backToGame": "Torna alla partita",
    "topbar.backToGames": "Torna alle partite",
    "topbar.newGame": "Nuova partita",
    "topbar.signIn": "Accedi",
    "topbar.loading": "Caricamento...",
    "topbar.localOnly": "Solo locale",
    "topbar.account": "Account",
    "topbar.gameActions": "Azioni della partita",
    "topbar.gameSettings": "Impostazioni della partita",
    "topbar.gameHistory": "Cronologia della partita",
    "topbar.invitePlayers": "Invita giocatori",
    "topbar.managePlayers": "Gestisci giocatori",
    "topbar.manageTeams": "Gestisci squadre",
    "topbar.resetScores": "Reimposta punteggi",
    "topbar.endGame": "Termina partita",
    "tabs.home": "Home",
    "tabs.sessions": "Partite",
    "tabs.stats": "Statistiche",
    "tabs.players": "Giocatori",
    "tabs.teams": "Squadre",
    "tabs.playersView": "Vista giocatori",
    "common.pro": "Pro",
    "home.eyebrow": "Il tuo segnapunti",
    "home.titleLineOne": "Tieni il punteggio.",
    "home.titleLineTwo": "Goditi il gioco.",
    "home.copy": "Inizia una nuova partita o fai continuare il prossimo turno senza rallentamenti.",
    "home.resume": "Riprendi l'ultima partita",
    "home.frequentGames": "Partite che giochi spesso",
    "home.frequentGamesCopy": "Inizia una nuova partita con le tue configurazioni abituali.",
    "home.teams": "Squadre",
    "home.start": "Inizia",
  },
} as const; */

export type TranslationKey = keyof (typeof messages)["en"];

function detectLanguage(): Language {
  if (typeof window === "undefined") return "en";

  try {
    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (languages.includes(storedLanguage as Language)) {
      return storedLanguage as Language;
    }
  } catch {
    // Fall back to the device language when local storage is unavailable.
  }

  const browserLanguage = window.navigator.language.toLowerCase().split("-")[0];
  return languages.includes(browserLanguage as Language)
    ? (browserLanguage as Language)
    : "en";
}

type I18nValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setActiveLanguage] = useState<Language>(detectLanguage);

  const setLanguage = useCallback((nextLanguage: Language) => {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    } catch {
      // The selected language remains active for this session.
    }
    setActiveLanguage(nextLanguage);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<I18nValue>(
    () => ({
      language,
      setLanguage,
      t: (key) => messages[language][key],
    }),
    [language, setLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used within I18nProvider");
  return value;
}
