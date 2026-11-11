export type DemoRoute = 'shoot' | 'ai'

export type DemoAsset = {
  id: string
  kind: 'image' | 'video'
  relativePath: string
  sha256: string
  provenance: 'source' | 'source-derived' | 'ai-concept' | 'fresh-ai'
  batchId: string
  // Verified in the public delivery; the integrator must copy before serving.
  available: boolean
  label: string
  routes: readonly DemoRoute[]
  shotId?: string
}

export type DemoShot = {
  id: string
  action: string
  durationSeconds: number
  groupId: string
}

export type DemoCase = {
  id: string
  title: string
  sourceUrl: string
  analysis: {
    summary: string
    spokenNarration: string | null
    audioNote: string
    pacing: string
    evidence: readonly string[]
  }
  script: readonly {
    groupId: string
    onScreenText: string
    direction: string
    spokenText: string
  }[]
  shots: readonly DemoShot[]
  groups: readonly { id: string; title: string }[]
  assets: readonly DemoAsset[]
}

const shotDirections: [string, number, string][] = [
  ["Hand lifts the plastic mould off a block of silken tofu in a white bowl.", 0.53, "preparation"],
  ["Tofu mashed into crumbs with a fork.", 1.07, "preparation"],
  ["Egg cracked onto the mashed tofu.", 0.33, "preparation"],
  ["Spoon pours soy sauce onto the mix.", 0.27, "mixing"],
  ["More soy sauce poured from the spoon.", 0.33, "mixing"],
  ["Spoon pours oil into the bowl.", 0.34, "mixing"],
  ["Spoonful of flour added to the bowl.", 0.36, "mixing"],
  ["Batter stirred with a spoon.", 0.67, "mixing"],
  ["Hand drops shredded cabbage on the batter.", 0.4, "mixing"],
  ["Hand sprinkles chopped spring onions on top.", 0.4, "mixing"],
  ["Everything stirred together in the bowl.", 0.43, "mixing"],
  ["Batter scooped into an oiled frying pan on a gas stove.", 0.47, "frying"],
  ["Batter spread into a round with a wooden spatula.", 0.53, "frying"],
  ["Golden, crispy pancake sizzling in the pan.", 0.5, "frying"],
  ["Okonomiyaki sauce drizzled in lines over the pancake on a white plate.", 0.84, "finished"],
  ["Mayo bottle starts drizzling.", 0.5, "finished"],
  ["Mayo zigzagged across the pancake.", 0.5, "finished"],
  ["Hand sprinkles bonito flakes on top.", 0.56, "finished"],
  ["Low close shot of the finished okonomiyaki with toppings.", 0.74, "finished"],
  ["Hands hold the silken tofu pack up against a sunny balcony background.", 0.5, "product-cta"],
  ["Back to the tofu mould being lifted over the bowl, looping to the start.", 0.23, "product-cta"],
]

const imageHashes = [
  "beb29d20035691bf8fb146fd03a8fd356a4c9a61566df5a20907f64065fd0d36",
  "50c3d4e52bc8fe42ca0527c03a57a188550eba4663b88990b33234bb2448a19c",
  "b50e4858bb93b84a5e21af6a2710506115b26b477d73f8526d695575deeaea71",
  "fc09cb4fc0c70eccd911d09f12bef6a95c5b1266c7550153dbce192d274d6f40",
  "c12255ff30cecac17910ed4eee85a3f0090e31e1bef353b1841789d244e93da0",
  "793e49be19b8e8909fbe8ad8c158a1398e4091f5d26ebe440827072e1e39a564",
  "adbb730e9576ef10ec746ea9c3739c31f941dc3ff303002f36db85d3ac01f7e2",
  "9d59bdd626248a3700a69397137a9a68a34f513b729ade6f6eb42b2d67672785",
  "1ca38b7aa67519aae4dcb6687df7e14a695d33441847b090b5a0de728748c247",
  "c89ef324ffb261230816e70b56a3b8953ce106a5f85938dd60e6e0c644bcc40c",
  "f59dd679a589dd337cf08df89bc91c03462551da022bb9ed6e576c7b3717ace3",
  "afcc97f4392e044f7ed124b58780d731b52c255f84dfdc02caeaf33ca952af7e",
  "d146b1eb16f2ff6ee17f627ab0a076dfc80764d2af885d180a8de3eff01348f2",
  "212f25b114f1079d1b3214034d292d73d2505b44cf6027d85b8835e952b2bdf0",
  "1648de52bce23be37c93c1463836fca8c081b111cde2ebb2d776d13d6ea7b95d",
  "eba8b4e71d74c6ba6deb11ffa9925937320fcbb17924d1563ce76094e781cd89",
  "fc758519ac10d0b53c7a2696182b1c057adee4663c79dde8b3c6c6ec4776c576",
  "2bfd65cd4e52a6712d2612de92635bbcbd80db44343def8130966f6a22821766",
  "bb771e7ffc90c0d0b5a57f82c85e2f7a5b8f425f39d59be197fbab04dbbfdc03",
  "2a0f91296b9cc4df9e30eef263950a317b5cccb6c753ced5601ecf32de75b262",
  "6fbcb2837f9aa4a5615620ed8f8d4490d10da536bdb0f1e27ab0debcbc50a27b",
]

// Verified public delivery only; these images derive from the original frames.
const images: DemoAsset[] = imageHashes.map((sha256, index) => ({
  id: `image-s${index + 1}`,
  kind: 'image',
  relativePath: `/demo-assets/batch-20261106/images/S${String(index + 1).padStart(2, '0')}.jpg`,
  sha256,
  provenance: 'source-derived',
  batchId: 'batch-20261106',
  available: true,
  label: 'Prepared reference-derived image (not fresh AI)',
  routes: ['ai'],
  shotId: `s${index + 1}`,
}))

const otherAssets: DemoAsset[] = [
  {"id": "shoot-high-angle-image", "kind": "image", "relativePath": "/demo-assets/batch-20261106/photographer/high-angle.jpg", "sha256": "0931917b5bc51a7fcfa13f11f36d451c965fe50f64a71bf372742e52e1098622", "provenance": "ai-concept", "batchId": "batch-20261106", "available": true, "label": "AI alternative angle: high-angle (source-referenced concept, not filmed footage)", "routes": ["shoot"], "shotId": "s19"},
  {"id": "shoot-low-macro-image", "kind": "image", "relativePath": "/demo-assets/batch-20261106/photographer/low-macro.jpg", "sha256": "58ca8e26c792c141fc7874b3cedef1144fca3838d232319b6cad0f441b894d87", "provenance": "ai-concept", "batchId": "batch-20261106", "available": true, "label": "AI alternative angle: low-macro (source-referenced concept, not filmed footage)", "routes": ["shoot"], "shotId": "s19"},
  {"id": "shoot-high-angle-video", "kind": "video", "relativePath": "/demo-assets/batch-20261106/photographer/high-angle.mp4", "sha256": "7edc04e4570b1c24e02ce70f9d4e26346e8654da9e39167d53568b4b067b9536", "provenance": "ai-concept", "batchId": "batch-20261106", "available": true, "label": "AI alternative angle: high-angle (source-referenced concept, not filmed footage)", "routes": ["shoot"], "shotId": "s19"},
  {"id": "shoot-low-macro-video", "kind": "video", "relativePath": "/demo-assets/batch-20261106/photographer/low-macro.mp4", "sha256": "12c7db9c1ed980478a09353b1dafed3c128c1d807422c7cc77be6a9104121a1a", "provenance": "ai-concept", "batchId": "batch-20261106", "available": true, "label": "AI alternative angle: low-macro (source-referenced concept, not filmed footage)", "routes": ["shoot"], "shotId": "s19"},
  {"id": "prepared-source-derived-cut", "kind": "video", "relativePath": "/demo-assets/batch-20261106/ever-green-ai-recreation.mp4", "sha256": "450da4c90858146eec6dff1499c8efb70dfec509098d0d5409e337ea43f70546", "provenance": "source-derived", "batchId": "batch-20261106", "available": true, "label": "Prepared source-derived recreation; silent review cut, not a fresh AI advert", "routes": ["ai"]},
]

// No fresh-AI batch or provider is consulted.
export const tofuCase: DemoCase = {
  "id": "ever-green-tofu",
  "title": "Ever Green — Silken Tofu Okonomiyaki",
  "sourceUrl": "https://www.instagram.com/reel/DVp3xOdFaHL/",
  "analysis": {
    "summary": "A 21-shot visual cooking advert turns silken tofu into okonomiyaki, finishes with toppings and a product reveal, then loops to the opening.",
    "spokenNarration": null,
    "audioNote": "No spoken cooking narration. Song lyrics are not a recipe transcript. The prepared review cut is silent and excludes the original soundtrack.",
    "pacing": "10.5 seconds, fast straight cuts; the last tofu reveal loops to the first.",
    "evidence": [
      "batch-20261106/source-script.txt",
      "batch-20261106/deliverables/source-script.txt",
      "batch-20261106/deliverables/image-manifest.json",
      "batch-20261106/deliverables/photographer-brief.json",
      "batch-20261106/deliverables/photographer/image-manifest.json",
      "batch-20261106/deliverables/photographer/video-manifest.json"
    ]
  },
  "script": [
    {
      "groupId": "preparation",
      "onScreenText": "Turn silken tofu into something crispy.",
      "direction": "Reveal the tofu, mash it, then add an egg. Keep the bowl and hands easy to follow.",
      "spokenText": ""
    },
    {
      "groupId": "mixing",
      "onScreenText": "Mix. Fold. Make it yours.",
      "direction": "Cut through seasoning, flour, cabbage and spring onions; finish on the combined batter.",
      "spokenText": ""
    },
    {
      "groupId": "frying",
      "onScreenText": "Golden at the edges.",
      "direction": "Scoop into the pan, shape the round and reveal the crisp surface.",
      "spokenText": ""
    },
    {
      "groupId": "finished",
      "onScreenText": "Tofu okonomiyaki, ready to share.",
      "direction": "Layer sauce, mayonnaise and bonito flakes; hold the low hero angle for the finished dish.",
      "spokenText": ""
    },
    {
      "groupId": "product-cta",
      "onScreenText": "Want the full recipe? Comment \"RECIPE\" below!",
      "direction": "Show Ever Green SILKEN TOFU (SOFT) 300g, then return to the tofu reveal for a loop. Verify packaging text before using this as final advertising.",
      "spokenText": ""
    }
  ],
  "groups": [
    {
      "id": "preparation",
      "title": "Preparation"
    },
    {
      "id": "mixing",
      "title": "Mixing"
    },
    {
      "id": "frying",
      "title": "Frying"
    },
    {
      "id": "finished",
      "title": "Finished dish"
    },
    {
      "id": "product-cta",
      "title": "Product & recipe CTA"
    }
  ],
  "shots": shotDirections.map(([action, durationSeconds, groupId], index) => ({
    id: `s${index + 1}`, action, durationSeconds, groupId,
  })),
  "assets": [...images, ...otherAssets],
}
