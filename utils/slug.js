function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "project";
}

async function uniqueSlug(baseSlug, exists) {
  let slug = baseSlug;
  let n = 1;
  while (await exists(slug)) {
    slug = `${baseSlug}-${n}`;
    n += 1;
  }
  return slug;
}

module.exports = { slugify, uniqueSlug };
