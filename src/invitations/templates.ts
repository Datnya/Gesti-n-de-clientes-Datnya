export const templates = [
  { id: "rosa-pastel", path: "/rosa", name: "Rosa Pastel", base: "/xv/", color: "rosa pastel", effects: "", stylesheet: "" },
  { id: "princesa-lila", path: "/lila", name: "Princesa Lila", base: "/xv/", color: "lila", effects: "/lila/effects.js", stylesheet: "/lila/theme.css" }
];
export function invitationTemplate(id?: string) {
  return templates.find(template => template.id === (id || "rosa-pastel"));
}



