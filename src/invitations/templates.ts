export const templates = [
  { id: "rosa-pastel", name: "Rosa Pastel", base: "/xv/" }
];
export function invitationTemplate(id?: string) {
  return templates.find(template => template.id === (id || "rosa-pastel"));
}
