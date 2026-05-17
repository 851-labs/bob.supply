import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type { AvailabilityManifest, ManifestEntry } from "@bob-avatars/core";
import { bobAvatarUrl } from "@bob-supply/sdk";
import availabilityManifest from "../../../../generated/batch-001/available.json";

export const Route = createFileRoute("/")({
  loader: () => getGeneratedAvatars(),
  component: HomePage,
});

const availability = availabilityManifest as AvailabilityManifest;

const getGeneratedAvatars = createServerFn({ method: "GET" }).handler(async () => {
  return availability.entries.filter((entry): entry is ManifestEntry => entry.variant === 1);
});

function HomePage() {
  const avatars = Route.useLoaderData();

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-2 border-b border-neutral-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">Bob Avatars</h1>
            <p className="mt-2 text-sm text-neutral-600">
              Batch 001, first generated image for each completed animal.
            </p>
          </div>
          <p className="text-sm font-medium text-neutral-500">{avatars.length} avatars</p>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {avatars.map((avatar) => (
            <AvatarCard key={avatar.animalSlug} entry={avatar} />
          ))}
        </div>
      </section>
    </main>
  );
}

function AvatarCard({ entry }: { readonly entry: ManifestEntry }) {
  return (
    <article className="aspect-square overflow-hidden rounded-full bg-neutral-100">
      <img
        src={bobAvatarUrl(entry.animalSlug)}
        alt={`${entry.animal} avatar`}
        className="h-full w-full object-cover"
        loading="lazy"
        decoding="async"
        width="1024"
        height="1024"
      />
    </article>
  );
}
