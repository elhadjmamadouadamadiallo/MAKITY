export async function fetchAnnonces() {
  const { data, error } = await supabase
    .from("annonces")
    .select("id, title, category_slug, price, city, contact_phone, shop, views, status, description, photos(url, position)")
    .eq("status", "active")
    .order("id", { ascending: false });
  if (error) throw error;
  return (data || []).map((a) => ({
    id: a.id, title: a.title, cat: a.category_slug, price: a.price, city: a.city,
    shop: a.shop, phone: a.contact_phone, views: a.views, desc: a.description,
    photos: (a.photos || []).sort((x, y) => x.position - y.position).map((p) => p.url),
  }));
}
