import { supabase } from "./supabase.js";

const BUCKET_AVATARS = "avatars";
const BUCKET_PHOTOS = "annonce-photos";

// ---------- AUTH ----------
export async function signUpEmail(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signInEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSessionUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

// ---------- PROFIL (annonceurs) ----------
export async function getProfile(uid) {
  const { data, error } = await supabase
    .from("annonceurs").select("*").eq("id", uid).maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveProfile(profile) {
  const { data, error } = await supabase
    .from("annonceurs").upsert(profile).select().single();
  if (error) throw error;
  return data;
}

export async function uploadAvatar(uid, file) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${uid}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET_AVATARS).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET_AVATARS).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteAccount(uid) {
  const { error } = await supabase.from("annonceurs").delete().eq("id", uid);
  if (error) throw error;
}

// ---------- ANNONCES ----------
export async function fetchAnnonces() {
  const { data, error } = await supabase
    .from("annonces")
    .select("id, title, category_slug, price, city, phone, shop, views, status, description, photos(url, position)")
    .eq("status", "active")
    .order("id", { ascending: false });
  if (error) throw error;
  return (data || []).map((a) => ({
    id: a.id, title: a.title, cat: a.category_slug, price: a.price, city: a.city,
    shop: a.shop, phone: a.phone, views: a.views, desc: a.description,
    photos: (a.photos || []).sort((x, y) => x.position - y.position).map((p) => p.url),
  }));
}

export async function fetchMyAnnonces(uid) {
  const { data, error } = await supabase
    .from("annonces")
    .select("id, title, category_slug, price, city, views, status, photos(url, position)")
    .eq("annonceur_id", uid)
    .order("id", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function insertAnnonce(annonce, files) {
  const { data: ad, error } = await supabase
    .from("annonces")
    .insert({
      annonceur_id: annonce.annonceur_id,
      title: annonce.title,
      category_slug: annonce.cat,
      price: annonce.price,
      city: annonce.city,
      description: annonce.desc,
      contact_phone: annonce.phone,
      shop: annonce.shop || null,
      status: "active",
      views: 0,
    })
    .select().single();
  if (error) throw error;

  if (files && files.length) {
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${ad.annonceur_id}/${ad.id}-${i}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET_PHOTOS).upload(path, f, { upsert: true });
      if (!upErr) {
        const { data: pub } = supabase.storage.from(BUCKET_PHOTOS).getPublicUrl(path);
        await supabase.from("photos").insert({ annonce_id: ad.id, url: pub.publicUrl, position: i });
      }
    }
  }
  return ad;
}

export async function deleteAnnonce(id) {
  const { error } = await supabase.from("annonces").delete().eq("id", id);
  if (error) throw error;
}

export async function incrementViews(id) {
  const { error } = await supabase.rpc("increment_views", { annonce_id: id });
  if (error) throw error;
}

export async function reportAnnonce(id, reason) {
  const { error } = await supabase
    .from("signalements")
    .insert({ annonce_id: id, reason: reason || "Signalé" });
  if (error) throw error;
      }
