export const PromptTemplate =
  "create a pfp for a {animal} in cartoon bobs burgers style with solid background";

export const BatchId = "batch-001";
export const VariantsPerAnimal = 4;

export const Animals = [
  "siberian cat",
  "orange tabby cat",
  "maine coon cat",
  "persian cat",
  "black cat",
  "golden retriever",
  "corgi",
  "french bulldog",
  "shiba inu",
  "dachshund",
  "border collie",
  "pug",
  "rabbit",
  "hamster",
  "guinea pig",
  "ferret",
  "hedgehog",
  "chinchilla",
  "red fox",
  "arctic fox",
  "raccoon",
  "squirrel",
  "chipmunk",
  "beaver",
  "otter",
  "skunk",
  "deer",
  "moose",
  "brown bear",
  "polar bear",
  "panda",
  "koala",
  "wombat",
  "kangaroo",
  "quokka",
  "capybara",
  "sloth",
  "lemur",
  "meerkat",
  "red panda",
  "tiger",
  "lion",
  "cheetah",
  "leopard",
  "jaguar",
  "elephant",
  "giraffe",
  "zebra",
  "hippopotamus",
  "rhinoceros",
  "gorilla",
  "chimpanzee",
  "orangutan",
  "mandrill",
  "llama",
  "alpaca",
  "goat",
  "sheep",
  "cow",
  "pig",
  "horse",
  "donkey",
  "chicken",
  "rooster",
  "duck",
  "goose",
  "turkey",
  "owl",
  "barn owl",
  "penguin",
  "puffin",
  "flamingo",
  "toucan",
  "parrot",
  "cockatoo",
  "peacock",
  "hummingbird",
  "frog",
  "tree frog",
  "toad",
  "axolotl",
  "turtle",
  "tortoise",
  "gecko",
  "iguana",
  "chameleon",
  "alligator",
  "crocodile",
  "snake",
  "seal",
  "sea lion",
  "walrus",
  "dolphin",
  "orca",
  "beluga whale",
  "octopus",
  "squid",
  "seahorse",
  "crab",
  "lobster",
] as const;

export type Animal = (typeof Animals)[number];

export type ManifestEntry = {
  readonly batchId: string;
  readonly animal: Animal;
  readonly animalSlug: string;
  readonly variant: number;
  readonly prompt: string;
  readonly path: string;
};

export type Manifest = {
  readonly batchId: string;
  readonly promptTemplate: string;
  readonly animals: number;
  readonly variantsPerAnimal: number;
  readonly totalImages: number;
  readonly entries: readonly ManifestEntry[];
};

export type AvailabilityManifest = {
  readonly batchId: string;
  readonly totalImages: number;
  readonly entries: readonly ManifestEntry[];
};

export function promptForAnimal(animal: string): string {
  return PromptTemplate.replace("{animal}", animal);
}

export function animalSlug(animal: string): string {
  return animal
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function variantFileName(variant: number): string {
  return `${String(variant).padStart(2, "0")}.png`;
}

export function avatarObjectKey(batchId: string, entry: ManifestEntry): string {
  return `${batchId}/${entry.path}`;
}

export function availabilityManifestKey(batchId: string): string {
  return `${batchId}/available.json`;
}

export function createAvailabilityManifest(
  manifest: Manifest,
  availablePaths: ReadonlySet<string>,
): AvailabilityManifest {
  const entries = manifest.entries
    .filter((entry) => availablePaths.has(entry.path))
    .sort((left, right) => left.path.localeCompare(right.path));

  return {
    batchId: manifest.batchId,
    totalImages: entries.length,
    entries,
  };
}

export async function selectAvatarForSeed(
  seed: string,
  availability: AvailabilityManifest,
): Promise<ManifestEntry | undefined> {
  if (availability.entries.length === 0) return undefined;

  const hash = await sha256(seed);
  const index = Number(firstEightBytes(hash) % BigInt(availability.entries.length));
  return availability.entries[index];
}

export function createManifest(
  options: {
    readonly batchId?: string;
    readonly animals?: readonly Animal[];
    readonly variantsPerAnimal?: number;
  } = {},
): Manifest {
  const batchId = options.batchId ?? BatchId;
  const animals = options.animals ?? Animals;
  const variantsPerAnimal = options.variantsPerAnimal ?? VariantsPerAnimal;
  const entries = animals.flatMap((animal) => {
    const slug = animalSlug(animal);
    return Array.from({ length: variantsPerAnimal }, (_, index): ManifestEntry => {
      const variant = index + 1;
      return {
        batchId,
        animal,
        animalSlug: slug,
        variant,
        prompt: promptForAnimal(animal),
        path: `${slug}/${variantFileName(variant)}`,
      };
    });
  });

  return {
    batchId,
    promptTemplate: PromptTemplate,
    animals: animals.length,
    variantsPerAnimal,
    totalImages: entries.length,
    entries,
  };
}

async function sha256(value: string): Promise<Uint8Array> {
  const encoded = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", encoded);
  return new Uint8Array(digest);
}

function firstEightBytes(bytes: Uint8Array): bigint {
  let value = 0n;
  for (const byte of bytes.slice(0, 8)) {
    value = (value << 8n) + BigInt(byte);
  }
  return value;
}
