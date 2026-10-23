export function credentialPriority(service: string) {
  const normalized = service.trim().toLocaleLowerCase().replace(/\s+/g, "");
  if (normalized === "cpanel") return 0;
  if (normalized === "namecheap") return 1;
  return 2;
}
