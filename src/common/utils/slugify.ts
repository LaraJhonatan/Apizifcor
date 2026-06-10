export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // quita tildes
    .replace(/[^a-z0-9\s-]/g, '')      // solo letras, números, espacios y guiones
    .trim()
    .replace(/\s+/g, '-')              // espacios → guiones
    .replace(/-+/g, '-');              // guiones múltiples → uno
}

// Genera slug único agregando sufijo numérico si ya existe
export async function slugifyUnique(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const baseSlug = slugify(base);
  let slug = baseSlug;
  let counter = 2;
  while (await exists(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return slug;
}