import React, { useState, useMemo, useEffect } from "react";
import {
  fetchAnnonces, fetchMyAnnonces, incrementViews, reportAnnonce,
  signUpEmail, signInEmail, signOut, getSessionUser, getProfile, saveProfile,
  deleteAccount as dbDeleteAccount, insertAnnonce, deleteAnnonce, uploadAvatar,
} from "./lib/db.js";

/*  MAKITY — Le marché guinéen en ligne (connecté à Supabase)
    Authentification e-mail (phase de développement) ; la vérification WhatsApp
    la remplacera avant le lancement. Le numéro WhatsApp reste demandé et affiché.
*/

const INK = "#15303A", PAPER = "#FAF7F2", SLATE = "#5B7079";
const GREEN = "#1EB53A", GOLD = "#FCD116", RED = "#CE1126";
const CARD = "#FFFFFF", LINE = "#E7E1D6";

const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Hanken+Grotesk:wght@400;500;600;700&display=swap');
@keyframes mkRise { from { opacity:0; transform: translateY(14px);} to {opacity:1; transform:none;} }
@keyframes mkFade { from { opacity:0;} to {opacity:1;} }
@keyframes mkPop { from { opacity:0; transform: scale(.96) translateY(10px);} to {opacity:1; transform:none;} }
@keyframes mkSpin { to { transform: rotate(360deg); } }
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
::-webkit-scrollbar { height: 0; width: 0; }
input:focus, select:focus, textarea:focus { outline: 2px solid ${GREEN}; outline-offset: 1px; }
`;

const CATEGORIES = [
  { id: "tel", label: "Téléphones & accessoires", icon: "📱" },
  { id: "info", label: "Informatique & électronique", icon: "💻" },
  { id: "elec", label: "Électroménager", icon: "🧊" },
  { id: "mode", label: "Mode & habillement", icon: "👗" },
  { id: "tissus", label: "Tissus & pagnes", icon: "🧵" },
  { id: "beaute", label: "Beauté & cosmétiques", icon: "💄" },
  { id: "maison", label: "Maison & ameublement", icon: "🛋️" },
  { id: "alim", label: "Alimentation & vivriers", icon: "🌾" },
  { id: "mat", label: "Matériaux & construction", icon: "🧱" },
  { id: "auto", label: "Auto, moto & pièces", icon: "🏍️" },
  { id: "agri", label: "Agriculture & élevage", icon: "🐐" },
  { id: "bijoux", label: "Bijoux & montres", icon: "⌚" },
  { id: "bebe", label: "Bébé & enfant", icon: "🍼" },
  { id: "divers", label: "Divers", icon: "📦" },
];
const catLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label || "Divers";
const catIcon = (id) => CATEGORIES.find((c) => c.id === id)?.icon || "📦";

const CITIES = ["Conakry", "Nzérékoré", "Kankan", "Kindia", "Labé", "Boké", "Mamou",
  "Faranah", "Siguiri", "Kissidougou", "Guéckédou", "Macenta", "Télimélé", "Dabola"];

const TINTS = {
  tel: ["#1EB53A", "#0E8C2C"], info: ["#2B6CB0", "#1A4D86"], elec: ["#0EA5A5", "#0A7A7A"],
  mode: ["#CE1126", "#9C0E1D"], tissus: ["#B8860B", "#8A6508"], beaute: ["#C026A3", "#911C7A"],
  maison: ["#7C5E3C", "#5C452C"], alim: ["#5FA82A", "#477F1F"], mat: ["#6B7280", "#4B5563"],
  auto: ["#15303A", "#0C1E26"], agri: ["#3F7A4A", "#2E5A37"], bijoux: ["#A37B12", "#7C5D0D"],
  bebe: ["#D98AAE", "#B86A8E"], divers: ["#5B7079", "#43545C"],
};

// Annonces d'exemple : affichées uniquement si la base est encore vide.
const ADS_SEED = [
  { id: 1, title: "iPhone 13 — 128 Go, bleu", cat: "tel", price: 4500000, city: "Conakry", shop: "Électronique Diallo", phone: "224621000001", views: 412, desc: "iPhone 13 128 Go en très bon état, batterie 92%. Débloqué tous opérateurs." },
  { id: 2, title: "Réfrigérateur 200 L", cat: "elec", price: 3200000, city: "Conakry", shop: "Camara Électro", phone: "224622000002", views: 230, desc: "Réfrigérateur neuf 200 litres, classe A, garantie 6 mois. Livraison Conakry." },
  { id: 3, title: "Bazin riche brodé (complet)", cat: "tissus", price: 850000, city: "Labé", shop: "Boutique Hadja Aïssatou", phone: "224623000003", views: 587, desc: "Bazin riche getzner brodé main, qualité supérieure. Vente en gros et détail." },
  { id: 4, title: "Sac de riz 50 kg", cat: "alim", price: 480000, city: "Kindia", shop: "Marché Madina Vivres", phone: "224627000007", views: 503, desc: "Riz parfumé importé, sac de 50 kg. Prix dégressif pour les revendeurs." },
  { id: 5, title: "Moto Sanili 125", cat: "auto", price: 12000000, city: "Kankan", shop: "Garage Touré", phone: "224625000005", views: 96, desc: "Moto Sanili 125 cc neuve, carte grise en règle. Facilité de paiement possible." },
  { id: 6, title: "Coffret parfum & soins", cat: "beaute", price: 420000, city: "Conakry", shop: "Beauté Néné", phone: "224629000009", views: 341, desc: "Coffret parfum longue tenue + crème. Produits authentiques. Livraison Conakry." },
];

const fmtFG = (n) => Number(n || 0).toLocaleString("fr-FR").replace(/\u202f/g, " ") + " FG";
const DOTS = "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)";

// Traduit les erreurs Supabase courantes
function frError(e) {
  const m = (e?.message || "").toLowerCase();
  if (m.includes("already registered") || m.includes("already exists")) return "Cet e-mail a déjà un compte. Connectez-vous.";
  if (m.includes("invalid login")) return "E-mail ou mot de passe incorrect.";
  if (m.includes("at least 6")) return "Mot de passe trop court (6 caractères minimum).";
  if (m.includes("not configured") || m.includes("failed to fetch")) return "Connexion à la base impossible (vérifiez la configuration).";
  return e?.message || "Une erreur est survenue.";
}
const mapProfile = (p) => ({ id: p.id, shop: p.shop_name, city: p.city, phone: p.phone, avatar: p.avatar_url });

function PinLogo({ size = 30 }) {
  const gid = "pg" + size;
  return (
    <svg width={size} height={size} viewBox="0 0 24 26" aria-hidden="true">
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={GREEN} /><stop offset="50%" stopColor={GOLD} /><stop offset="100%" stopColor={RED} />
      </linearGradient></defs>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill={`url(#${gid})`} />
      <text x="12" y="12.6" fontSize="9.5" fontWeight="800" textAnchor="middle" fill={PAPER} fontFamily="'Bricolage Grotesque', sans-serif">M</text>
    </svg>
  );
}
function Spinner({ c = PAPER }) {
  return <span style={{ display: "inline-block", width: 16, height: 16, border: `2px solid ${c}`, borderTopColor: "transparent", borderRadius: "50%", animation: "mkSpin .7s linear infinite", verticalAlign: "middle" }} />;
}

const fld = { width: "100%", padding: "12px 13px", borderRadius: 12, border: `1.5px solid ${LINE}`, background: CARD, color: INK, fontSize: 15, fontFamily: "inherit", marginTop: 6 };
const lbl = { fontSize: 13, fontWeight: 700, color: INK, display: "block", marginTop: 14 };
const primaryBtn = { width: "100%", padding: "14px 0", borderRadius: 14, border: "none", background: INK, color: PAPER, fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 18, fontFamily: "inherit" };
const outlineBtn = { width: "100%", padding: "13px 0", borderRadius: 14, border: `1.5px solid ${INK}`, background: "transparent", color: INK, fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 10, fontFamily: "inherit" };
const greenBtn = { ...primaryBtn, background: GREEN, color: "#06351A" };

function AHeader({ title, onBack }) {
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 20, background: INK, color: PAPER, padding: "13px 16px", display: "flex", alignItems: "center", gap: 10 }}>
      <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 999, border: "none", background: "rgba(255,255,255,.12)", color: PAPER, fontSize: 18, cursor: "pointer", flex: "0 0 auto" }} aria-label="Retour">←</button>
      <PinLogo size={24} />
      <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 17 }}>{title}</span>
    </header>
  );
}
const page = { minHeight: "100vh", background: PAPER, color: INK, fontFamily: "'Hanken Grotesk', system-ui, sans-serif" };
const wrap = { maxWidth: 480, margin: "0 auto", padding: "22px 20px 40px" };

function Avatar({ src, size = 44, ring = false }) {
  const base = { width: size, height: size, borderRadius: "50%", flex: "0 0 auto", objectFit: "cover", border: ring ? `2px solid ${GOLD}` : "none" };
  if (src) return <img src={src} alt="" style={base} />;
  return <div style={{ ...base, background: "linear-gradient(135deg,#1EB53A,#15303A)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.5 }}>🏪</div>;
}

// ===== ÉCRAN 0 — ENTRÉE =====
function Entry({ onClient, onAnnonceur }) {
  return (
    <div style={{ ...page, background: INK, color: PAPER, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, opacity: .07, backgroundImage: DOTS, backgroundSize: "16px 16px" }} />
      <div style={{ position: "absolute", top: -120, right: -120, width: 320, height: 320, borderRadius: "50%", background: `radial-gradient(circle, ${GREEN}55, transparent 70%)` }} />
      <div style={{ position: "absolute", bottom: -140, left: -120, width: 320, height: 320, borderRadius: "50%", background: `radial-gradient(circle, ${RED}44, transparent 70%)` }} />
      <div style={{ display: "flex", height: 4, position: "relative", zIndex: 2 }}>
        <div style={{ flex: 1, background: GREEN }} /><div style={{ flex: 1, background: GOLD }} /><div style={{ flex: 1, background: RED }} />
      </div>
      <div style={{ flex: 1, position: "relative", zIndex: 2, maxWidth: 520, width: "100%", margin: "0 auto", padding: "0 22px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ textAlign: "center", animation: "mkPop .5s ease both" }}>
          <PinLogo size={64} />
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 46, letterSpacing: -1.5, marginTop: 6 }}>MAKITY</div>
          <div style={{ color: "#9FB4BC", fontSize: 15, marginTop: 2 }}>Rapidité · Efficacité · Facilité</div>
        </div>
        <div style={{ textAlign: "center", marginTop: 38, marginBottom: 16, fontSize: 14, color: "#C7D3D8" }}>Vous êtes…</div>
        <button onClick={onClient} style={choiceCard(GREEN, 0)}>
          <span style={choiceIcon(GREEN)}>🛍️</span>
          <span style={{ textAlign: "left", flex: 1 }}><span style={choiceTitle}>Client</span><span style={choiceSub}>Parcourir les annonces et contacter les vendeurs</span></span>
          <span style={{ color: SLATE, fontSize: 22 }}>›</span>
        </button>
        <button onClick={onAnnonceur} style={choiceCard(RED, 90)}>
          <span style={choiceIcon(RED)}>🏪</span>
          <span style={{ textAlign: "left", flex: 1 }}><span style={choiceTitle}>Annonceur</span><span style={choiceSub}>Commerçant ou marchand : publier et gérer mes marchandises</span></span>
          <span style={{ color: SLATE, fontSize: 22 }}>›</span>
        </button>
        <div style={{ textAlign: "center", marginTop: 26, fontSize: 11.5, color: "#7E939B" }}>En continuant, vous acceptez les conditions d'utilisation de MAKITY.</div>
      </div>
    </div>
  );
}
const choiceCard = (accent, delay) => ({ width: "100%", display: "flex", alignItems: "center", gap: 14, background: CARD, border: "none", borderLeft: `5px solid ${accent}`, borderRadius: 16, padding: "16px", marginBottom: 14, cursor: "pointer", boxShadow: "0 8px 24px rgba(0,0,0,.22)", animation: `mkPop .5s ease both`, animationDelay: `${delay + 120}ms` });
const choiceIcon = (bg) => ({ width: 46, height: 46, borderRadius: 12, flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, background: bg + "1A" });
const choiceTitle = { display: "block", fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 800, color: INK };
const choiceSub = { display: "block", fontSize: 12.5, color: SLATE, marginTop: 2, lineHeight: 1.3 };

// ===== ANNONCEUR — Accueil auth =====
function AuthHome({ onHome, onLogin, onRegister }) {
  return (
    <div style={page}>
      <AHeader title="Espace annonceur" onBack={onHome} />
      <div style={wrap}>
        <div style={{ fontSize: 30, textAlign: "center" }}>🏪</div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 800, textAlign: "center", margin: "10px 0 4px" }}>Bienvenue, marchand</h1>
        <p style={{ textAlign: "center", color: SLATE, fontSize: 14, marginTop: 0 }}>Réservé aux commerçants et marchands.</p>
        <button style={primaryBtn} onClick={onLogin}>Se connecter</button>
        <button style={outlineBtn} onClick={onRegister}>Créer un compte</button>
        <div style={{ marginTop: 22, padding: "12px 14px", background: "#EAF6EC", border: `1px solid ${GREEN}`, borderRadius: 12, fontSize: 12.5, color: "#0E5A22" }}>
          🎉 <b>Phase de lancement :</b> l'inscription et la publication sont <b>gratuites</b>.
        </div>
      </div>
    </div>
  );
}

// ===== Inscription (A1) — e-mail + profil =====
function Register({ onBack, onAuthed }) {
  const [shop, setShop] = useState("");
  const [city, setCity] = useState(CITIES[0]);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [cgu, setCgu] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const digits = phone.replace(/\D/g, "");

  const onAvatar = (e) => {
    const f = (e.target.files || [])[0];
    if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); }
  };
  const submit = async () => {
    if (!shop.trim()) return setErr("Indiquez le nom de votre boutique ou activité.");
    if (digits.length < 9) return setErr("Numéro WhatsApp invalide (ex. 6XX XX XX XX).");
    if (!email.includes("@")) return setErr("Adresse e-mail invalide.");
    if (password.length < 6) return setErr("Mot de passe : 6 caractères minimum.");
    if (!cgu) return setErr("Vous devez accepter les conditions d'utilisation.");
    setErr(""); setBusy(true);
    try {
      const data = await signUpEmail(email.trim(), password);
      // Le compte doit être confirmé par e-mail avant de créer le profil.
      // On garde les infos boutique en attente, le profil sera créé à la 1ère connexion.
      try {
        let avatarDataUrl = null;
        if (avatarFile) {
          avatarDataUrl = await new Promise((res) => {
            const r = new FileReader();
            r.onload = () => res(r.result);
            r.onerror = () => res(null);
            r.readAsDataURL(avatarFile);
          });
        }
        localStorage.setItem("makity_pending_profile", JSON.stringify({
          email: email.trim(),
          shop_name: shop.trim(),
          city,
          phone: "224" + digits.slice(-9),
          avatar_data: avatarDataUrl,
        }));
      } catch (_) {}
      setDone(true);
    } catch (e) {
      setErr(frError(e));
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div style={page}>
        <AHeader title="Vérifiez votre e-mail" onBack={onBack} />
        <div style={wrap}>
          <div style={{ fontSize: 44, textAlign: "center", marginTop: 10 }}>📧</div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 800, textAlign: "center", margin: "12px 0 8px" }}>Confirmez votre e-mail</h1>
          <p style={{ textAlign: "center", color: SLATE, fontSize: 14.5, lineHeight: 1.5 }}>
            Un e-mail de confirmation vient d'être envoyé à <b style={{ color: INK }}>{email.trim()}</b>.
          </p>
          <div style={{ marginTop: 18, padding: "14px 16px", background: "#EAF6EC", border: `1px solid ${GREEN}`, borderRadius: 12, fontSize: 13.5, color: "#0E5A22", lineHeight: 1.5 }}>
            1. Ouvrez votre boîte mail.<br />
            2. Cliquez sur le lien de confirmation.<br />
            3. Revenez ici et <b>connectez-vous</b> pour finaliser votre compte.
          </div>
          <p style={{ textAlign: "center", color: SLATE, fontSize: 12, marginTop: 14 }}>
            Pensez à vérifier le dossier « Spam » ou « Courrier indésirable ».
          </p>
          <button style={primaryBtn} onClick={onBack}>J'ai compris</button>
        </div>
      </div>
    );
  }

  return (
    <div style={page}>
      <AHeader title="Créer un compte" onBack={onBack} />
      <div style={wrap}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 6 }}>
          <label style={{ cursor: "pointer", position: "relative" }}>
            <Avatar src={avatarPreview} size={86} ring />
            <span style={{ position: "absolute", right: -2, bottom: -2, width: 30, height: 30, borderRadius: "50%", background: INK, color: PAPER, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, border: `2px solid ${PAPER}` }}>📷</span>
            <input type="file" accept="image/*" onChange={onAvatar} style={{ display: "none" }} />
          </label>
          <div style={{ fontSize: 12, color: SLATE, marginTop: 8 }}>Photo de profil (logo ou boutique)</div>
        </div>

        <label style={lbl}>Nom commercial (boutique / activité)</label>
        <input style={fld} value={shop} onChange={(e) => setShop(e.target.value)} placeholder="Ex. Électronique Diallo" />

        <label style={lbl}>Ville</label>
        <input style={fld} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex. Conakry, Labé, Kankan…" list="villes-guinee" />
        <datalist id="villes-guinee">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>

        <label style={lbl}>Numéro WhatsApp (affiché sur vos annonces)</label>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          <span style={{ padding: "12px", borderRadius: 12, border: `1.5px solid ${LINE}`, background: "#F1ECE3", fontSize: 15, fontWeight: 700 }}>+224</span>
          <input style={{ ...fld, marginTop: 0 }} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="6XX XX XX XX" inputMode="numeric" />
        </div>

        <label style={lbl}>E-mail (pour vous connecter)</label>
        <input style={fld} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" inputMode="email" />

        <label style={lbl}>Mot de passe</label>
        <input style={fld} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6 caractères minimum" />

        <label style={{ display: "flex", gap: 9, alignItems: "flex-start", marginTop: 18, fontSize: 13, color: INK, cursor: "pointer" }}>
          <input type="checkbox" checked={cgu} onChange={(e) => setCgu(e.target.checked)} style={{ marginTop: 2, width: 18, height: 18, accentColor: GREEN }} />
          <span>J'accepte les <b>conditions d'utilisation</b> de MAKITY et je certifie que mes marchandises sont licites.</span>
        </label>

        {err && <div style={{ marginTop: 14, color: RED, fontSize: 13, fontWeight: 600 }}>{err}</div>}
        <button style={{ ...primaryBtn, opacity: busy ? .7 : 1 }} onClick={submit} disabled={busy}>
          {busy ? <Spinner /> : "Créer mon compte"}
        </button>
        <div style={{ fontSize: 11, color: SLATE, marginTop: 10, textAlign: "center" }}>La connexion par e-mail est temporaire (développement). Elle sera remplacée par la vérification WhatsApp avant le lancement.</div>
      </div>
    </div>
  );
}

// ===== Connexion =====
function Login({ onBack, onAuthed, onRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!email.includes("@") || !password) return setErr("Renseignez votre e-mail et votre mot de passe.");
    setErr(""); setBusy(true);
    try {
      const data = await signInEmail(email.trim(), password);
      let profile = await getProfile(data.user.id);
      if (!profile) {
        // Première connexion après confirmation : on crée le profil depuis les infos en attente
        let pending = null;
        try { pending = JSON.parse(localStorage.getItem("makity_pending_profile") || "null"); } catch (_) {}
        if (pending && pending.email === email.trim()) {
          let avatarUrl = null;
          if (pending.avatar_data) {
            try {
              const blob = await (await fetch(pending.avatar_data)).blob();
              const file = new File([blob], "avatar.jpg", { type: blob.type || "image/jpeg" });
              avatarUrl = await uploadAvatar(data.user.id, file);
            } catch (_) {}
          }
          profile = await saveProfile({
            id: data.user.id, shop_name: pending.shop_name, city: pending.city,
            phone: pending.phone, avatar_url: avatarUrl,
          });
          try { localStorage.removeItem("makity_pending_profile"); } catch (_) {}
        }
      }
      if (!profile) { setErr("Profil introuvable. Si vous venez de confirmer votre e-mail, réessayez."); return; }
      onAuthed(mapProfile(profile));
    } catch (e) { setErr(frError(e)); }
    finally { setBusy(false); }
  };
  return (
    <div style={page}>
      <AHeader title="Se connecter" onBack={onBack} />
      <div style={wrap}>
        <div style={{ fontSize: 30, textAlign: "center" }}>🔑</div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 800, textAlign: "center", margin: "8px 0 16px" }}>Bon retour</h1>
        <label style={lbl}>E-mail</label>
        <input style={fld} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" inputMode="email" />
        <label style={lbl}>Mot de passe</label>
        <input style={fld} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Votre mot de passe" />
        {err && <div style={{ marginTop: 14, color: RED, fontSize: 13, fontWeight: 600 }}>{err}</div>}
        <button style={{ ...primaryBtn, opacity: busy ? .7 : 1 }} onClick={submit} disabled={busy}>{busy ? <Spinner /> : "Connexion"}</button>
        <button style={outlineBtn} onClick={onRegister}>Créer un compte</button>
      </div>
    </div>
  );
}

// ===== Tableau de bord (A2) =====
function Dashboard({ session, myAds, loading, onHome, onPublish, onSub, onAccount, onDelete }) {
  const totalViews = myAds.reduce((s, a) => s + (a.views || 0), 0);
  return (
    <div style={page}>
      <header style={{ position: "sticky", top: 0, zIndex: 20, background: INK, color: PAPER, padding: "13px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onHome} style={{ width: 34, height: 34, borderRadius: 999, border: "none", background: "rgba(255,255,255,.12)", color: PAPER, fontSize: 16, cursor: "pointer", flex: "0 0 auto" }} aria-label="Accueil">←</button>
          <Avatar src={session.avatar} size={40} ring />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 16, lineHeight: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.shop}</div>
            <div style={{ fontSize: 11.5, color: "#9FB4BC" }}>📍 {session.city} · +{session.phone}</div>
          </div>
          <button onClick={onAccount} style={{ width: 36, height: 36, borderRadius: 999, border: "none", background: "rgba(255,255,255,.12)", color: PAPER, fontSize: 16, cursor: "pointer" }} aria-label="Compte">⚙️</button>
        </div>
      </header>
      <div style={{ display: "flex", height: 3 }}><div style={{ flex: 1, background: GREEN }} /><div style={{ flex: 1, background: GOLD }} /><div style={{ flex: 1, background: RED }} /></div>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "16px 14px 40px" }}>
        <div style={{ display: "flex", gap: 10 }}>
          <Stat n={myAds.length} l="Mes annonces" />
          <Stat n={totalViews} l="Vues cumulées" />
        </div>
        <button onClick={onSub} style={{ width: "100%", textAlign: "left", marginTop: 12, padding: "13px 14px", background: "#EAF6EC", border: `1px solid ${GREEN}`, borderRadius: 14, cursor: "pointer" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#0E5A22" }}>Abonnement · Phase de lancement</div>
          <div style={{ fontSize: 12.5, color: "#0E5A22", marginTop: 2 }}>Gratuit — publications illimitées. Voir les détails ›</div>
        </button>
        <button style={{ ...primaryBtn, marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={onPublish}>＋ Publier une annonce</button>
        <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, marginTop: 26, marginBottom: 6 }}>Mes annonces</h2>
        {loading ? (
          <div style={{ textAlign: "center", padding: 30, color: SLATE }}><Spinner c={INK} /></div>
        ) : myAds.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px 16px", color: SLATE, background: CARD, border: `1px dashed ${LINE}`, borderRadius: 14 }}>
            <div style={{ fontSize: 34 }}>📦</div>
            <p style={{ margin: "8px 0 0", fontSize: 13.5 }}>Aucune annonce pour l'instant.<br />Publiez votre première marchandise.</p>
          </div>
        ) : myAds.map((a) => (
          <div key={a.id} style={{ display: "flex", gap: 12, alignItems: "center", background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: 10, marginBottom: 10 }}>
            <MiniThumb ad={a} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: GREEN }}>{fmtFG(a.price)}</div>
              <div style={{ fontSize: 11.5, color: SLATE, marginTop: 2 }}>👁 {a.views} vues · {a.city}</div>
            </div>
            <button onClick={() => onDelete(a.id)} style={{ border: "none", background: "#FBE9EA", color: RED, borderRadius: 10, padding: "8px 10px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Retirer</button>
          </div>
        ))}
      </div>
    </div>
  );
}
function Stat({ n, l }) {
  return (
    <div style={{ flex: 1, background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: "14px 12px", textAlign: "center" }}>
      <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 800, color: INK }}>{n}</div>
      <div style={{ fontSize: 11.5, color: SLATE, marginTop: 2 }}>{l}</div>
    </div>
  );
}
function MiniThumb({ ad }) {
  const [a, b] = TINTS[ad.cat] || TINTS.divers;
  if (ad.photos && ad.photos[0]) return <img src={ad.photos[0]} alt="" style={{ width: 58, height: 58, borderRadius: 10, objectFit: "cover", flex: "0 0 auto" }} />;
  return <div style={{ width: 58, height: 58, borderRadius: 10, flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, background: `linear-gradient(135deg, ${a}, ${b})` }}>{catIcon(ad.cat)}</div>;
}

// ===== Publier (A3) =====
function PublishAd({ session, onBack, onPublish }) {
  const [title, setTitle] = useState("");
  const [cat, setCat] = useState(CATEGORIES[0].id);
  const [price, setPrice] = useState("");
  const [city, setCity] = useState(session.city);
  const [desc, setDesc] = useState("");
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const onFiles = (e) => {
    const list = Array.from(e.target.files || []).slice(0, 15);
    setFiles(list); setPreviews(list.map((f) => URL.createObjectURL(f)));
  };
  const submit = async () => {
    if (!title.trim()) return setErr("Donnez un titre à l'article.");
    if (!price || Number(price) <= 0) return setErr("Indiquez un prix valide (en FG).");
    setErr(""); setBusy(true);
    try {
      await onPublish({ title: title.trim(), cat, price: Number(price), city, desc: desc.trim() || "—" }, files);
    } catch (e) { setErr(frError(e)); setBusy(false); }
  };
  return (
    <div style={page}>
      <AHeader title="Publier une annonce" onBack={onBack} />
      <div style={wrap}>
        <label style={lbl}>Titre de l'article</label>
        <input style={fld} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. iPhone 13 128 Go bleu" />
        <label style={lbl}>Catégorie</label>
        <select style={{ ...fld, appearance: "none" }} value={cat} onChange={(e) => setCat(e.target.value)}>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
        </select>
        <label style={lbl}>Prix (FG)</label>
        <input style={fld} value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} placeholder="Ex. 350000" inputMode="numeric" />
        <label style={lbl}>Ville</label>
        <input style={fld} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex. Conakry, Labé, Kankan…" list="villes-guinee2" />
        <datalist id="villes-guinee2">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>
        <label style={lbl}>Photos (jusqu'à 15)</label>
        <label style={{ ...fld, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: SLATE }}>
          📷 Choisir des photos
          <input type="file" accept="image/*" multiple onChange={onFiles} style={{ display: "none" }} />
        </label>
        {previews.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {previews.map((p, i) => <img key={i} src={p} alt="" style={{ width: 64, height: 64, borderRadius: 10, objectFit: "cover" }} />)}
          </div>
        )}
        <label style={lbl}>Description</label>
        <textarea style={{ ...fld, minHeight: 90, resize: "vertical" }} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="État, détails, conditions…" />
        <div style={{ marginTop: 14, fontSize: 11.5, color: SLATE }}>Contact affiché : <b>+{session.phone}</b> · Annonceur : <b>{session.shop}</b></div>
        {err && <div style={{ marginTop: 12, color: RED, fontSize: 13, fontWeight: 600 }}>{err}</div>}
        <button style={{ ...greenBtn, opacity: busy ? .7 : 1 }} onClick={submit} disabled={busy}>{busy ? <Spinner c="#06351A" /> : "Publier maintenant"}</button>
      </div>
    </div>
  );
}

// ===== Abonnement (A4) =====
function Subscription({ onBack }) {
  return (
    <div style={page}>
      <AHeader title="Abonnement" onBack={onBack} />
      <div style={wrap}>
        <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 16, padding: 18 }}>
          <div style={{ display: "inline-block", padding: "4px 12px", borderRadius: 999, background: "#EAF6EC", color: "#0E5A22", fontSize: 12, fontWeight: 800 }}>● ACTIF — Gratuit</div>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, margin: "12px 0 4px" }}>Phase de lancement</h2>
          <p style={{ color: SLATE, fontSize: 13.5, marginTop: 0 }}>Pendant le lancement de MAKITY, l'inscription et la publication sont entièrement gratuites, sans limite.</p>
        </div>
        <div style={{ background: INK, color: PAPER, borderRadius: 16, padding: 18, marginTop: 14 }}>
          <div style={{ fontSize: 12, color: "#9FB4BC", fontWeight: 700, letterSpacing: 1 }}>À VENIR</div>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 30, fontWeight: 800, marginTop: 6 }}>150 000 FG<span style={{ fontSize: 15, color: "#9FB4BC" }}> / mois</span></div>
          <ul style={{ margin: "12px 0 0", paddingLeft: 18, fontSize: 13.5, lineHeight: 1.8 }}>
            <li>Publications <b>illimitées</b> pendant le mois</li>
            <li>Paiement par <b>Mobile Money</b></li>
            <li>Annonces suspendues si l'abonnement n'est pas réglé</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ===== Compte (A5) =====
function Account({ session, onBack, onLogout, onDeleteAccount, onAvatarChange }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const onAvatar = async (e) => {
    const f = (e.target.files || [])[0];
    if (f) { setBusy(true); try { await onAvatarChange(f); } finally { setBusy(false); } }
  };
  return (
    <div style={page}>
      <AHeader title="Mon compte" onBack={onBack} />
      <div style={wrap}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 16 }}>
          <label style={{ cursor: "pointer", position: "relative" }}>
            <Avatar src={session.avatar} size={92} ring />
            <span style={{ position: "absolute", right: -2, bottom: -2, width: 30, height: 30, borderRadius: "50%", background: INK, color: PAPER, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, border: `2px solid ${PAPER}` }}>{busy ? "…" : "📷"}</span>
            <input type="file" accept="image/*" onChange={onAvatar} style={{ display: "none" }} />
          </label>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 19, marginTop: 10 }}>{session.shop}</div>
        </div>
        <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 16, padding: 18 }}>
          <Row k="Boutique" v={session.shop} />
          <Row k="Ville" v={session.city} />
          <Row k="WhatsApp" v={"+" + session.phone} />
          <Row k="Numéro vérifié" v="✅ Oui" />
        </div>
        <button style={outlineBtn} onClick={onLogout}>Se déconnecter</button>
        {!confirm ? (
          <button style={{ ...outlineBtn, border: `1.5px solid ${RED}`, color: RED }} onClick={() => setConfirm(true)}>Supprimer mon compte</button>
        ) : (
          <div style={{ marginTop: 12, padding: 14, border: `1.5px solid ${RED}`, borderRadius: 14, background: "#FBE9EA" }}>
            <div style={{ fontSize: 13.5, color: "#7A0E18", fontWeight: 600 }}>Cette action est définitive et retirera <b>toutes vos annonces</b>. Confirmer ?</div>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "none", background: "#fff", color: INK, fontWeight: 700, cursor: "pointer" }} onClick={() => setConfirm(false)}>Annuler</button>
              <button style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "none", background: RED, color: "#fff", fontWeight: 700, cursor: "pointer" }} onClick={onDeleteAccount}>Supprimer</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
function Row({ k, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${LINE}` }}>
      <span style={{ color: SLATE, fontSize: 13.5 }}>{k}</span>
      <span style={{ fontWeight: 700, fontSize: 13.5 }}>{v}</span>
    </div>
  );
}

// ===== CLIENT — Catalogue + Fiche =====
function Thumb({ ad, big = false }) {
  const [a, b] = TINTS[ad.cat] || TINTS.divers;
  if (ad.photos && ad.photos[0]) {
    return (
      <div style={{ position: "relative", width: "100%", height: big ? 260 : 130, overflow: "hidden", background: "#000" }}>
        <img src={ad.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <span style={{ position: "absolute", top: big ? 14 : 10, fontSize: 10.5, fontWeight: 700, color: PAPER, background: "rgba(21,48,58,.7)", padding: "3px 9px", borderRadius: 999, ...(big ? { right: 14 } : { left: 10 }) }}>{catLabel(ad.cat)}</span>
      </div>
    );
  }
  return (
    <div style={{ position: "relative", width: "100%", height: big ? 260 : 130, background: `radial-gradient(120% 120% at 30% 20%, ${a} 0%, ${b} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.12, backgroundImage: DOTS, backgroundSize: "14px 14px" }} />
      <span style={{ fontSize: big ? 90 : 46, filter: "drop-shadow(0 4px 10px rgba(0,0,0,.25))" }}>{catIcon(ad.cat)}</span>
      <span style={{ position: "absolute", top: big ? 14 : 10, fontSize: 10.5, fontWeight: 700, color: PAPER, background: "rgba(21,48,58,.55)", padding: "3px 9px", borderRadius: 999, backdropFilter: "blur(4px)", ...(big ? { right: 14 } : { left: 10 }) }}>{catLabel(ad.cat)}</span>
    </div>
  );
}
function Carousel({ ad }) {
  const photos = (ad.photos && ad.photos.length) ? ad.photos : [];
  const [idx, setIdx] = useState(0);
  const [zoom, setZoom] = useState(false);
  const touchX = React.useRef(null);
  if (photos.length === 0) return <Thumb ad={ad} big />;
  const n = photos.length;
  const go = (i) => setIdx((i + n) % n);
  const prev = () => go(idx - 1);
  const next = () => go(idx + 1);
  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (dx > 40) prev();
    else if (dx < -40) next();
    touchX.current = null;
  };
  return (
    <div style={{ position: "relative", width: "100%", height: 300, overflow: "hidden", background: "#000" }}
         onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div style={{ display: "flex", height: "100%", width: "100%", transform: `translateX(-${idx * 100}%)`, transition: "transform .3s ease" }}>
        {photos.map((src, i) => (
          <img key={i} src={src} alt="" onClick={() => setZoom(true)} style={{ width: "100%", height: "100%", flex: "0 0 100%", objectFit: "cover", cursor: "zoom-in" }} />
        ))}
      </div>
      <span style={{ position: "absolute", top: 14, right: 14, fontSize: 10.5, fontWeight: 700, color: PAPER, background: "rgba(21,48,58,.7)", padding: "3px 9px", borderRadius: 999 }}>{catLabel(ad.cat)}</span>
      <span style={{ position: "absolute", bottom: 44, right: 14, fontSize: 10.5, fontWeight: 600, color: PAPER, background: "rgba(21,48,58,.7)", padding: "3px 9px", borderRadius: 999 }}>👆 Toucher pour agrandir</span>
      {n > 1 && (
        <>
          <button onClick={prev} aria-label="Précédent" style={carBtn("left")}>‹</button>
          <button onClick={next} aria-label="Suivant" style={carBtn("right")}>›</button>
          <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap", padding: "0 12px" }}>
            {photos.map((_, i) => (
              <span key={i} onClick={() => go(i)} style={{ width: i === idx ? 22 : 8, height: 8, borderRadius: 999, background: i === idx ? PAPER : "rgba(255,255,255,.5)", transition: "all .2s", cursor: "pointer" }} />
            ))}
          </div>
          <span style={{ position: "absolute", top: 14, left: 14, fontSize: 11, fontWeight: 700, color: PAPER, background: "rgba(21,48,58,.7)", padding: "3px 9px", borderRadius: 999 }}>{idx + 1}/{n}</span>
        </>
      )}
      {zoom && <Lightbox photos={photos} start={idx} onClose={() => setZoom(false)} />}
    </div>
  );
}

function Lightbox({ photos, start = 0, onClose }) {
  const [i, setI] = useState(start);
  const touchX = React.useRef(null);
  const n = photos.length;
  const go = (k) => setI((k + n) % n);
  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (dx > 40) go(i - 1);
    else if (dx < -40) go(i + 1);
    touchX.current = null;
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 100, display: "flex", flexDirection: "column", animation: "mkFade .2s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px" }}>
        <span style={{ color: PAPER, fontSize: 14, fontWeight: 700 }}>{i + 1} / {n}</span>
        <button onClick={onClose} aria-label="Fermer" style={{ width: 46, height: 46, borderRadius: 999, border: `2px solid ${PAPER}`, background: "rgba(255,255,255,.12)", color: PAPER, fontSize: 22, fontWeight: 800, cursor: "pointer" }}>✕</button>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}
           onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <img src={photos[i]} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        {n > 1 && (
          <>
            <button onClick={() => go(i - 1)} aria-label="Précédent" style={carBtn("left")}>‹</button>
            <button onClick={() => go(i + 1)} aria-label="Suivant" style={carBtn("right")}>›</button>
          </>
        )}
      </div>
      <div style={{ textAlign: "center", color: "#C7D3D8", fontSize: 12.5, padding: "14px 20px 22px" }}>
        Appui long sur la photo pour l'enregistrer dans votre téléphone
      </div>
    </div>
  );
}
const carBtn = (side) => ({ position: "absolute", top: "50%", transform: "translateY(-50%)", [side]: 12, width: 52, height: 52, borderRadius: 999, border: `2px solid ${PAPER}`, background: "rgba(21,48,58,.85)", color: PAPER, fontSize: 32, fontWeight: 800, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(0,0,0,.45)", zIndex: 3 });
function AdDetail({ ad, onClose, onReport }) {
  const waText = encodeURIComponent(`Bonjour, je suis intéressé(e) par votre annonce sur MAKITY :\n« ${ad.title} » — ${fmtFG(ad.price)} (${ad.city}).\nEst-elle toujours disponible ?`);
  const [reported, setReported] = useState(false);
  const report = async () => { try { await onReport(ad.id); } catch (_) {} setReported(true); };
  const share = async () => {
    const url = `${window.location.origin}/a/${ad.id}`;
    const text = `${ad.title} — ${fmtFG(ad.price)} (${ad.city})\nÀ voir sur MAKITY :`;
    try {
      if (navigator.share) {
        await navigator.share({ title: ad.title, text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        alert("Lien copié ! Vous pouvez le coller sur WhatsApp ou Facebook.");
      }
    } catch (_) {}
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: PAPER, zIndex: 50, overflowY: "auto", animation: "mkFade .25s ease" }}>
      <div style={{ maxWidth: 520, margin: "0 auto", paddingBottom: 28 }}>
        <button onClick={onClose} style={{ position: "absolute", top: 14, left: 14, zIndex: 4, width: 48, height: 48, borderRadius: 999, border: `2px solid ${PAPER}`, background: "rgba(21,48,58,.85)", color: PAPER, fontSize: 24, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 14px rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="Retour">←</button>
        <Carousel ad={ad} />
        <div style={{ padding: "18px 18px 0" }}>
          <h1 style={{ margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, lineHeight: 1.15, color: INK, fontWeight: 700 }}>{ad.title}</h1>
          <div style={{ marginTop: 10, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 800, color: GREEN }}>{fmtFG(ad.price)}</div>
          <div style={{ display: "flex", gap: 14, marginTop: 12, color: SLATE, fontSize: 13.5, flexWrap: "wrap" }}>
            <span>📍 {ad.city}</span><span>👁 {ad.views} vues</span><span>{catIcon(ad.cat)} {catLabel(ad.cat)}</span>
          </div>
          <div style={{ marginTop: 16, padding: "12px 14px", background: CARD, border: `1px solid ${LINE}`, borderRadius: 14 }}>
            <div style={{ fontSize: 11, color: SLATE, textTransform: "uppercase", letterSpacing: 1 }}>Annonceur</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: INK, marginTop: 2 }}>{ad.shop}</div>
            <div style={{ fontSize: 12.5, color: SLATE, marginTop: 2 }}>Responsable de cette annonce</div>
          </div>
          <p style={{ marginTop: 16, fontSize: 15, lineHeight: 1.55, color: "#2B2B2B" }}>{ad.desc}</p>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <a href={`tel:+${ad.phone}`} style={{ flex: 1, textAlign: "center", padding: "14px 0", borderRadius: 14, background: INK, color: PAPER, fontWeight: 700, textDecoration: "none", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>📞 Appeler</a>
            <a href={`https://wa.me/${ad.phone}?text=${waText}`} target="_blank" rel="noreferrer" style={{ flex: 1, textAlign: "center", padding: "14px 0", borderRadius: 14, background: "#25D366", color: "#06351A", fontWeight: 800, textDecoration: "none", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>WhatsApp</a>
          </div>
          <div style={{ display: "flex", gap: 18, marginTop: 14, justifyContent: "center" }}>
            <button style={ghostBtn} onClick={share}>↗ Partager</button>
            <button style={ghostBtn} onClick={report} disabled={reported}>{reported ? "✓ Signalé" : "⚑ Signaler"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
const ghostBtn = { background: "none", border: "none", color: SLATE, fontSize: 13.5, cursor: "pointer", padding: "6px 4px", fontWeight: 600 };
function AdCard({ ad, onOpen, i }) {
  return (
    <button onClick={() => onOpen(ad)} style={{ textAlign: "left", background: CARD, border: `1px solid ${LINE}`, borderRadius: 16, overflow: "hidden", cursor: "pointer", padding: 0, boxShadow: "0 1px 2px rgba(21,48,58,.04)", animation: `mkRise .5s ease both`, animationDelay: `${i * 45}ms` }}>
      <Thumb ad={ad} />
      <div style={{ padding: "10px 11px 12px" }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: INK, lineHeight: 1.25, height: 34, overflow: "hidden" }}>{ad.title}</div>
        <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 16, fontWeight: 800, color: GREEN, marginTop: 4 }}>{fmtFG(ad.price)}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 7 }}>
          <span style={{ fontSize: 11.5, color: SLATE, maxWidth: "62%", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{ad.shop}</span>
          <span style={{ fontSize: 11, color: SLATE }}>📍{ad.city}</span>
        </div>
      </div>
    </button>
  );
}
function Catalogue({ ads, onHome, onReport, initialAdId }) {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState("all");
  const [city, setCity] = useState("all");
  const [sort, setSort] = useState("recent");
  const [selected, setSelected] = useState(null);
  const cities = useMemo(() => ["all", ...Array.from(new Set(ads.map((a) => a.city))).sort()], [ads]);
  const list = useMemo(() => {
    let r = ads.filter((a) => {
      const q = query.trim().toLowerCase();
      const okQ = !q || a.title.toLowerCase().includes(q) || (a.desc || "").toLowerCase().includes(q);
      const okC = activeCat === "all" || a.cat === activeCat;
      const okV = city === "all" || a.city === city;
      return okQ && okC && okV;
    });
    if (sort === "recent") r = [...r].sort((a, b) => b.id - a.id);
    if (sort === "asc") r = [...r].sort((a, b) => a.price - b.price);
    if (sort === "desc") r = [...r].sort((a, b) => b.price - a.price);
    return r;
  }, [ads, query, activeCat, city, sort]);
  // Ouvrir automatiquement l'annonce dont l'id est dans l'URL (lien partagé)
  useEffect(() => {
    if (initialAdId && ads.length) {
      const found = ads.find((a) => String(a.id) === String(initialAdId));
      if (found) { setSelected(found); incrementViews(found.id).catch(() => {}); }
    }
  }, [initialAdId, ads]);
  const open = (ad) => {
    setSelected(ad);
    incrementViews(ad.id).catch(() => {});
    window.history.pushState({ adId: ad.id }, "", `/a/${ad.id}`);
  };
  const close = () => {
    setSelected(null);
    window.history.pushState({}, "", "/");
  };
  // Bouton retour du navigateur : fermer le détail si ouvert
  useEffect(() => {
    const onPop = () => {
      const m = window.location.pathname.match(/^\/a\/(.+)$/);
      if (m) {
        const found = ads.find((a) => String(a.id) === String(m[1]));
        setSelected(found || null);
      } else {
        setSelected(null);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [ads]);
  return (
    <div style={page}>
      <header style={{ position: "sticky", top: 0, zIndex: 20, background: INK, color: PAPER, padding: "12px 16px 14px", boxShadow: "0 2px 14px rgba(21,48,58,.18)" }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <button onClick={onHome} style={{ width: 34, height: 34, borderRadius: 999, border: "none", background: "rgba(255,255,255,.12)", color: PAPER, fontSize: 17, cursor: "pointer", flex: "0 0 auto" }} aria-label="Accueil">←</button>
            <PinLogo size={28} />
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: -0.5 }}>MAKITY</div>
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: 11, color: "#9FB4BC", textAlign: "right", lineHeight: 1.2 }}>Rapidité · Efficacité<br />Facilité</div>
          </div>
          <div style={{ marginTop: 12, position: "relative" }}>
            <span style={{ position: "absolute", left: 13, top: 11, fontSize: 16, opacity: .6 }}>🔎</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un article…" style={{ width: "100%", padding: "11px 12px 11px 38px", borderRadius: 12, border: "none", fontSize: 15, background: PAPER, color: INK, fontFamily: "inherit" }} />
          </div>
        </div>
      </header>
      <div style={{ display: "flex", height: 3 }}><div style={{ flex: 1, background: GREEN }} /><div style={{ flex: 1, background: GOLD }} /><div style={{ flex: 1, background: RED }} /></div>
      <main style={{ maxWidth: 980, margin: "0 auto", padding: "0 12px 40px" }}>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "14px 2px" }}>
          <Chip active={activeCat === "all"} onClick={() => setActiveCat("all")} label="Tout" icon="🛍️" />
          {CATEGORIES.map((c) => <Chip key={c.id} active={activeCat === c.id} onClick={() => setActiveCat(c.id)} label={c.label.split(" &")[0]} icon={c.icon} />)}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <Select value={city} onChange={setCity} options={cities.map((c) => ({ v: c, l: c === "all" ? "Toutes les villes" : c }))} />
          <Select value={sort} onChange={setSort} options={[{ v: "recent", l: "Plus récent" }, { v: "asc", l: "Prix croissant" }, { v: "desc", l: "Prix décroissant" }]} />
        </div>
        <div style={{ fontSize: 12.5, color: SLATE, marginBottom: 10 }}>{list.length} annonce{list.length > 1 ? "s" : ""}{activeCat !== "all" ? ` · ${catLabel(activeCat)}` : ""}</div>
        {list.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: SLATE }}><div style={{ fontSize: 44 }}>🔍</div><p>Aucune annonce ne correspond à votre recherche.</p></div>
        ) : (
          <div style={{ gap: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
            {list.map((ad, i) => <AdCard key={ad.id} ad={ad} i={i} onOpen={open} />)}
          </div>
        )}
        <p style={{ textAlign: "center", color: SLATE, fontSize: 11.5, marginTop: 30 }}>MAKITY — Rapidité · Efficacité · Facilité</p>
      </main>
      {selected && <AdDetail ad={selected} onClose={close} onReport={onReport} />}
    </div>
  );
}
function Chip({ active, onClick, label, icon }) {
  return (
    <button onClick={onClick} style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 999, cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", border: `1.5px solid ${active ? INK : LINE}`, background: active ? INK : CARD, color: active ? PAPER : INK, transition: "all .15s ease" }}>
      <span style={{ fontSize: 14 }}>{icon}</span>{label}
    </button>
  );
}
function Select({ value, onChange, options }) {
  return (
    <div style={{ flex: 1, position: "relative" }}>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 12, fontSize: 13.5, border: `1.5px solid ${LINE}`, background: CARD, color: INK, fontFamily: "inherit", fontWeight: 600, appearance: "none", cursor: "pointer" }}>
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
      <span style={{ position: "absolute", right: 12, top: 11, pointerEvents: "none", color: SLATE }}>▾</span>
    </div>
  );
}

// ===== APP SHELL =====
export default function MakityApp() {
  const initialPath = (typeof window !== "undefined" ? window.location.pathname : "/");
  const initialMatch = initialPath.match(/^\/a\/(.+)$/);
  const initialAdId = initialMatch ? initialMatch[1] : null;
  const [screen, setScreen] = useState(initialAdId ? "catalogue" : "entry");
  const [ads, setAds] = useState(ADS_SEED);
  const [session, setSession] = useState(null);
  const [myAds, setMyAds] = useState([]);
  const [loadingMine, setLoadingMine] = useState(false);
  const go = (s) => setScreen(s);

  const refreshCatalogue = () => {
    fetchAnnonces().then((rows) => { if (rows && rows.length) setAds(rows); }).catch(() => {});
  };
  const loadMyAds = (uid) => {
    setLoadingMine(true);
    fetchMyAnnonces(uid)
      .then((rows) => setMyAds((rows || []).map((a) => ({
        id: a.id, title: a.title, cat: a.category_slug, price: a.price, city: a.city,
        views: a.views, status: a.status,
        photos: (a.photos || []).sort((x, y) => x.position - y.position).map((p) => p.url),
      }))))
      .catch(() => setMyAds([]))
      .finally(() => setLoadingMine(false));
  };

  // Démarrage : catalogue + restauration de session
  useEffect(() => {
    refreshCatalogue();
    getSessionUser().then((u) => {
      if (u) getProfile(u.id).then((p) => { if (p) setSession(mapProfile(p)); }).catch(() => {});
    }).catch(() => {});
  }, []);

  // Charger mes annonces en entrant dans le tableau de bord
  useEffect(() => {
    if (screen === "dashboard" && session) loadMyAds(session.id);
  }, [screen, session]);

  const onAuthed = (s) => { setSession(s); go("dashboard"); };

  const publish = async (annonce, files) => {
    await insertAnnonce({ ...annonce, annonceur_id: session.id, phone: session.phone }, files);
    refreshCatalogue();
    loadMyAds(session.id);
    go("dashboard");
  };
  const removeAd = async (id) => {
    try { await deleteAnnonce(id); } catch (_) {}
    loadMyAds(session.id); refreshCatalogue();
  };
  const changeAvatar = async (file) => {
    const url = await uploadAvatar(session.id, file);
    await saveProfile({ id: session.id, shop_name: session.shop, city: session.city, phone: session.phone, avatar_url: url });
    setSession((s) => ({ ...s, avatar: url }));
  };
  const logout = async () => { try { await signOut(); } catch (_) {} setSession(null); setMyAds([]); go("entry"); };
  const removeAccount = async () => {
    try { await dbDeleteAccount(session.id); await signOut(); } catch (_) {}
    setSession(null); setMyAds([]); refreshCatalogue(); go("entry");
  };
  const report = (id) => reportAnnonce(id, "Signalé depuis l'application");

  const goAnnonceur = () => go(session ? "dashboard" : "auth");

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      {screen === "entry" && <Entry onClient={() => go("catalogue")} onAnnonceur={goAnnonceur} />}
      {screen === "catalogue" && <Catalogue ads={ads} onHome={() => go("entry")} onReport={report} initialAdId={initialAdId} />}
      {screen === "auth" && <AuthHome onHome={() => go("entry")} onLogin={() => go("login")} onRegister={() => go("register")} />}
      {screen === "register" && <Register onBack={() => go("auth")} onAuthed={onAuthed} />}
      {screen === "login" && <Login onBack={() => go("auth")} onAuthed={onAuthed} onRegister={() => go("register")} />}
      {screen === "dashboard" && session && <Dashboard session={session} myAds={myAds} loading={loadingMine} onHome={() => go("entry")} onPublish={() => go("publish")} onSub={() => go("subscription")} onAccount={() => go("account")} onDelete={removeAd} />}
      {screen === "publish" && session && <PublishAd session={session} onBack={() => go("dashboard")} onPublish={publish} />}
      {screen === "subscription" && <Subscription onBack={() => go("dashboard")} />}
      {screen === "account" && session && <Account session={session} onBack={() => go("dashboard")} onLogout={logout} onDeleteAccount={removeAccount} onAvatarChange={changeAvatar} />}
    </>
  );
}
