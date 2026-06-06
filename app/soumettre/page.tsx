"use client";

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, ImagePlus, ShieldCheck, Sparkles, UploadCloud } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

const R2_UPLOAD_ENDPOINT = "https://dedicalivres-r2-upload.dedicalivres.workers.dev/";
const R2_PUBLIC_BASE_URL = "https://pub-45a59368068e48578d3b1a1bb519c543.r2.dev";

type SubmitState = "idle" | "uploading" | "submitting" | "success" | "error";

function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uploadImageToR2(file: File, title: string) {
  const extension = file.name.split(".").pop() || "jpg";
  const fileName = `event-images/v2-submissions/${Date.now()}-${slugify(title || file.name)}.${extension}`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("key", fileName);
  formData.append("folder", "event-images/v2-submissions");

  const response = await fetch(R2_UPLOAD_ENDPOINT, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("L’image n’a pas pu être envoyée vers R2.");
  }

  const result = await response.json().catch(() => null);

  return (
    result?.url ||
    result?.publicUrl ||
    result?.imageUrl ||
    `${R2_PUBLIC_BASE_URL}/${fileName}`
  );
}

function buildSubmissionPayload(form: HTMLFormElement, imageUrl: string) {
  const data = new FormData(form);

  const title = String(data.get("title") || "").trim();
  const type = String(data.get("type") || "").trim();
  const city = String(data.get("city") || "").trim();
  const region = String(data.get("region") || "").trim();
  const startDate = String(data.get("start_date") || "").trim();
  const endDate = String(data.get("end_date") || "").trim();
  const website = String(data.get("website") || "").trim();
  const organizer = String(data.get("organizer") || "").trim();
  const email = String(data.get("email") || "").trim();
  const description = String(data.get("description") || "").trim();

  return {
    title,
    type,
    city,
    region,
    start_date: startDate || null,
    end_date: endDate || null,
    website: website || null,
    organizer: organizer || null,
    contact_email: email || null,
    description: description || null,
    image_url: imageUrl || null,
    status: "pending",
    is_validated: false,
    validated: false,
    source_label: "Soumission V2",
  };
}

function compactPayload(payload: Record<string, unknown>, keys: string[]) {
  const compact: Record<string, unknown> = {};

  keys.forEach((key) => {
    if (payload[key] !== undefined) {
      compact[key] = payload[key];
    }
  });

  return compact;
}

async function insertSubmission(payload: Record<string, unknown>) {
  const supabase = createSupabaseClient();

  if (!supabase) {
    throw new Error("Connexion Supabase non configurée.");
  }

  const attempts = [
    payload,
    compactPayload(payload, [
      "title",
      "type",
      "city",
      "region",
      "start_date",
      "end_date",
      "website",
      "organizer",
      "description",
      "image_url",
      "status",
      "source_label",
    ]),
    compactPayload(payload, [
      "title",
      "city",
      "region",
      "start_date",
      "description",
      "image_url",
      "website",
    ]),
    compactPayload(payload, [
      "title",
      "city",
      "region",
      "date",
      "description",
      "image_url",
    ]),
  ];

  let lastError = "";

  for (const attempt of attempts) {
    const { error } = await supabase.from("events").insert(attempt);

    if (!error) return;

    lastError = error.message;
  }

  throw new Error(lastError || "La soumission n’a pas pu être enregistrée.");
}

export default function SubmitEventPage() {
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");

  const isBusy = state === "uploading" || state === "submitting";

  const statusLabel = useMemo(() => {
    if (state === "uploading") return "Envoi de l’image...";
    if (state === "submitting") return "Enregistrement...";
    if (state === "success") return "Soumission envoyée";
    if (state === "error") return "Action requise";
    return "Formulaire public";
  }, [state]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") || "").trim();
    const city = String(data.get("city") || "").trim();
    const region = String(data.get("region") || "").trim();

    if (!title || !city || !region) {
      setState("error");
      setMessage("Merci de renseigner au minimum le titre, la ville et la région.");
      return;
    }

    try {
      setMessage("");
      setState("uploading");

      const file = data.get("image") as File | null;
      let imageUrl = "";

      if (file && file.size > 0) {
        imageUrl = await uploadImageToR2(file, title);
      }

      setState("submitting");
      const payload = buildSubmissionPayload(form, imageUrl);

      await insertSubmission(payload);

      setState("success");
      setMessage("Merci. L’événement a été transmis et devra être validé avant publication.");
      form.reset();
      setImagePreview("");
      setSelectedFileName("");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Erreur inconnue pendant la soumission.");
    }
  }

  return (
    <main className="submit-page-shell">
      <div className="menu-page-ambient menu-page-ambient-one" />
      <div className="menu-page-ambient menu-page-ambient-two" />

      <section className="submit-page-card">
        <div className="menu-page-topbar">
          <Link href="/" className="event-back-link">
            <ArrowLeft size={17} />
            Retour accueil
          </Link>
          <span className="event-status-pill">{statusLabel}</span>
        </div>

        <div className="submit-page-grid">
          <div className="submit-page-intro">
            <p className="kicker">Soumission sécurisée</p>
            <h1>Proposer un événement</h1>
            <p>
              Partagez une rencontre, un salon, une dédicace ou un festival littéraire.
              Les informations sont envoyées en modération avant publication.
            </p>

            <div className="submit-security-stack">
              <div>
                <ShieldCheck size={18} />
                <strong>RLS Supabase</strong>
                <span>Le public soumet, seuls les admins valident.</span>
              </div>
              <div>
                <UploadCloud size={18} />
                <strong>Images R2</strong>
                <span>Upload vers le stockage public configuré pour Dédicalivres.</span>
              </div>
              <div>
                <Sparkles size={18} />
                <strong>V2 indépendante</strong>
                <span>La V1 et l’admin V1 ne sont pas modifiés.</span>
              </div>
            </div>
          </div>

          <form className="submit-event-form" onSubmit={handleSubmit}>
            <div className="submit-form-section">
              <span>01</span>
              <h2>Informations principales</h2>
            </div>

            <label>
              Titre de l’événement *
              <input name="title" required placeholder="Ex. Salon du livre de..." />
            </label>

            <div className="submit-form-row">
              <label>
                Type
                <select name="type" defaultValue="Dédicace">
                  <option>Dédicace</option>
                  <option>Rencontre</option>
                  <option>Salon</option>
                  <option>Festival</option>
                  <option>Conférence</option>
                  <option>Animation</option>
                  <option>Jeunesse</option>
                </select>
              </label>

              <label>
                Organisateur
                <input name="organizer" placeholder="Nom de la librairie, salon, structure..." />
              </label>
            </div>

            <div className="submit-form-row">
              <label>
                Ville *
                <input name="city" required placeholder="Ex. Brest" />
              </label>

              <label>
                Région *
                <input name="region" required placeholder="Ex. Bretagne" />
              </label>
            </div>

            <div className="submit-form-row">
              <label>
                Date de début
                <input name="start_date" type="date" />
              </label>

              <label>
                Date de fin
                <input name="end_date" type="date" />
              </label>
            </div>

            <label>
              Site officiel
              <input name="website" type="url" placeholder="https://..." />
            </label>

            <label>
              Email de contact
              <input name="email" type="email" placeholder="contact@..." />
            </label>

            <label>
              Description
              <textarea name="description" rows={6} placeholder="Présentez l’événement, les auteurs, les horaires, les modalités..." />
            </label>

            <label className="submit-image-field">
              <ImagePlus size={18} />
              <span>
                Image événement
                <em>{selectedFileName || "JPG, PNG, WEBP recommandé"}</em>
              </span>
              <input
                name="image"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  setSelectedFileName(file?.name || "");
                  setImagePreview(file ? URL.createObjectURL(file) : "");
                }}
              />
            </label>

            {imagePreview && (
              <div className="submit-image-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Aperçu image événement" />
              </div>
            )}

            {message && (
              <div className={`submit-message submit-message-${state}`}>
                {message}
              </div>
            )}

            <div className="submit-form-actions">
              <button className="event-main-action" disabled={isBusy} type="submit">
                {isBusy ? "Traitement..." : "Envoyer en modération"}
                <Sparkles size={16} />
              </button>
              <Link href="/evenements" className="event-secondary-action">
                Voir les événements
              </Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
