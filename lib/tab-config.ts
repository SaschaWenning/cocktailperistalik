export interface TabConfig {
  id: string
  name: string
  icon?: string
  location: "main" | "service"
  passwordProtected?: boolean
  alwaysVisible?: boolean // Für Tabs, die immer sichtbar sein müssen (z.B. Servicemenü)
}

export interface AppConfig {
  tabs: TabConfig[]
}

// Standard-Konfiguration
export const defaultTabConfig: AppConfig = {
  tabs: [
    {
      id: "cocktails",
      name: "Cocktails",
      location: "main",
      passwordProtected: false,
    },
    {
      id: "virgin",
      name: "Alkoholfrei",
      location: "main",
      passwordProtected: false,
    },
    {
      id: "shots",
      name: "Shots",
      location: "main",
      passwordProtected: false,
    },
    {
      id: "recipe-creator",
      name: "Neues Rezept",
      location: "service",
      passwordProtected: true,
    },
    {
      id: "levels",
      name: "Füllstände",
      location: "service",
      passwordProtected: true,
    },
    {
      id: "ingredients",
      name: "Zutaten",
      location: "service",
      passwordProtected: true,
    },
    {
      id: "calibration",
      name: "Kalibrierung",
      location: "service",
      passwordProtected: true,
    },
    {
      id: "cleaning",
      name: "Reinigung",
      location: "service",
      passwordProtected: true,
    },
    {
      id: "venting",
      name: "Entlüften",
      location: "service",
      passwordProtected: true,
    },
    {
      id: "hidden-cocktails",
      name: "Ausgeblendete Cocktails",
      location: "service",
      passwordProtected: true,
    },
    {
      id: "beleuchtung",
      name: "Beleuchtung",
      location: "service",
      passwordProtected: true,
    },
    {
      id: "statistics",
      name: "Statistik",
      location: "service",
      passwordProtected: true,
    },
    {
      id: "service",
      name: "Servicemenü",
      location: "main",
      passwordProtected: false,
      alwaysVisible: true,
    },
  ],
}
