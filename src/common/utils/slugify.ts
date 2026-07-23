export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

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