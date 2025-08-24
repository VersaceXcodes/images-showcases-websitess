import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

/* ---------- ZOD SCHEMAS (matching backend) ---------- */
const gallerySchema = z.object({
  gallery_id: z.string(),
  user_id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  template_name: z.string(),
  visibility: z.string(),
  is_published: z.boolean(),
  view_count: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
type Gallery = z.infer<typeof gallerySchema>;

const imageSchema = z.object({
  image_id: z.string(),
  gallery_id: z.string(),
  file_url: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  alt_text: z.string(),
  tags: z.array(z.string()).nullable(),
  order_index: z.number(),
  created_at: z.string(),
});
type Image = z.infer<typeof imageSchema>;

/* ---------- API CLIENT ---------- */
const API_BASE = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/api`;

/* ---------- VIEW COMPONENT ---------- */
const UV_GalleryView: React.FC = () => {
  const { gallery_id } = useParams<{ gallery_id: string }>();
  const navigate = useNavigate();

  /* --------- Query: fetch gallery metadata --------- */
  const {
    data: gallery,
    isLoading: galleryLoading,
    isError: galleryError,
  } = useQuery<Gallery, Error>(
    ["gallery", gallery_id],
    async () => {
      if (!gallery_id) throw new Error("Gallery ID is missing");
      const resp = await axios.get(`${API_BASE}/galleries/${gallery_id}`);
      return gallerySchema.parse(resp.data);
    },
    {
      staleTime: 60000,
      retry: 1,
      refetchOnWindowFocus: false,
    }
  );

  /* --------- Query: fetch images (once gallery is available) --------- */
  const {
    data: images,
    isLoading: imagesLoading,
    isError: imagesError,
  } = useQuery<Image[], Error>(
    ["galleryImages", gallery_id],
    async () => {
      const resp = await axios.get(`${API_BASE}/galleries/${gallery_id}/images`);
      return resp.data.map((img: unknown) => imageSchema.parse(img));
    },
    {
      enabled: !!gallery_id, // run after gallery_id is defined
      staleTime: 60000,
      retry: 1,
      refetchOnWindowFocus: false,
    }
  );

  /* --------- Mutation: record view --------- */
  const recordViewMut = useMutation(
    async () => {
      const payload = {
        view_id: uuidv4(),
        gallery_id: gallery_id!,
        ip_address: "unknown", // client cannot determine IP
      };
      await axios.post(`${API_BASE}/analytics/view`, payload);
    },
    { retry: 1 }
  );

  /* --------- Side effect: after gallery is fetched --------- */
  useEffect(() => {
    if (gallery) {
      // Redirect if gallery is private
      if (gallery.visibility === "private") {
        navigate("/403", { replace: true });
      } else {
        recordViewMut.mutate();
      }
    }
  }, [gallery, navigate, recordViewMut]);

  /* --------- Modal state --------- */
  const [modalImage, setModalImage] = useState<Image | null>(null);

  /* --------- Helper: current page URL --------- */
  const publicURL = useMemo(() => {
    if (!gallery_id) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/gallery/${gallery_id}`;
  }, [gallery_id]);

  /* --------- Render --------- */
  return (
    <>
      {/* Header }}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <h1 className="text-xl font-semibold text-gray-900">{gallery?.title ?? "Gallery"}</h1>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-4 lg:px-8">
        {/* Loading & error handling */}
        {(galleryLoading || imagesLoading) && (
          <div className="text-center py-16">
            <svg className="animate-spin h-8 w-8 mx-auto text-gray-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="mt-4 text-gray-500">Loading gallery...</p>
          </div>
        )}
        {(galleryError || imagesError) && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md" role="alert">
            <p className="font-medium">Error loading gallery.</p>
            <p className="mt-2">{(galleryError ?? imagesError)?.message}</p>
          </div>
        )}

        {/* Gallery details */}
        {gallery && images && (
          <>
            {/* Gallery description */}
            {gallery.description && (
              <p className="text-gray-700 mt-4">{gallery.description}</p>
            )}

            {/* Share buttons */}
            <div className="flex flex-wrap items-center gap-4 mt-6">
              <button
                onClick={() => navigator.clipboard.writeText(publicURL)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
              >
                Copy URL
              </button>

              <button
                onClick={() =>
                  navigator.clipboard.writeText(
                    `<iframe src="${publicURL}" width="600" height="400" frameborder="0"></iframe>`
                  )
                }
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
              >
                Copy Embed
              </button>

              {/* Simple QR placeholder */}
              <Link
                to={`/qr?url=${encodeURIComponent(publicURL)}`}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition"
              >
                QR Code
              </Link>
            </div>

            {/* Image grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8">
              {images
                .sort((a, b) => a.order_index - b.order_index)
                .map((img) => (
                  <figure key={img.image_id} className="bg-white rounded-md shadow-sm overflow-hidden">
                    <img
                      src={img.file_url}
                      alt={img.alt_text}
                      className="w-full h-48 object-cover cursor-pointer"
                      onClick={() => setModalImage(img)}
                    />
                    <figcaption className="p-4">
                      <h3 className="font-semibold text-sm">{img.title}</h3>
                      <p className="text-xs text-gray-500">{img.alt_text}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(img.tags ?? []).map((tag) => (
                          <Link
                            key={tag}
                            to={`/search?tag=${encodeURIComponent(tag)}`}
                            className="text-xs bg-blue-100 text-blue-800 rounded px-2 py-0.5 hover:bg-blue-200"
                          >
                            #{tag}
                          </Link>
                        ))}
                      </div>
                    </figcaption>
                  </figure>
                ))}
            </div>

            {/* Modal for enlarged image */}
            {modalImage && (
              <div
                className="fixed inset-0 bg-black/75 flex items-center justify-center z-50"
                onClick={() => setModalImage(null)}
                role="dialog"
                aria-modal="true"
              >
                <div className="relative max-w-full max-h-full">
                  <img src={modalImage.file_url} alt={modalImage.alt_text} className="border rounded" />
                  <button
                    onClick={() => setModalImage(null)}
                    className="absolute top-2 right-2 bg-white rounded-full p-1 text-gray-700 hover:text-gray-900"
                    aria-label="Close modal"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
};

export default UV_GalleryView;