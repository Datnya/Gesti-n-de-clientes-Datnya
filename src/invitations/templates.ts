export const eventTypes = ["Cumpleaños de niña","Cumpleaños de niño","Quinceañero","Boda","Baby shower"] as const;
export const templates = [
  { id: "rosa-pastel", eventType: "Quinceañero", path: "/rosa", name: "Rosa Pastel", base: "/xv/", color: "rosa pastel", effects: "", stylesheet: "" },
  { id: "princesa-lila", eventType: "Quinceañero", path: "/lila", name: "Princesa Lila", base: "/xv/", color: "lila", effects: "/lila/effects.js", stylesheet: "/lila/theme.css" },
  { id: "azul-acuarela", eventType: "Quinceañero", path: "/azul", name: "Azul Acuarela", base: "/xv/", color: "azul", effects: "/lila/effects.js", stylesheet: "/azul/theme.css" },
  { id: "hello-kitty", eventType: "Cumpleaños de niña", path: "/kitty", name: "Cumpleaños Hello Kitty", base: "/xv/", color: "fucsia", effects: "/kitty/effects.js", stylesheet: "/kitty/theme.css" }
];
export function invitationTemplate(id?: string) {
  return templates.find(template => template.id === (id || "rosa-pastel"));
}






