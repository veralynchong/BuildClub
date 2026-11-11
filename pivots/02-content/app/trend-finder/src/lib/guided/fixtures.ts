import { GUIDED_IDS as ids, GUIDED_CANVAS_IDS as c } from './contracts.ts'
import { inLang, t, type Lang } from '../i18n.ts'
import { tofuCase } from '../demo/tofuCase.ts'
import type { Client, Format, SavedIdea, Shot, Video } from '../../types.ts'
import type { CanvasState, GenModel, Generation } from '../canvas/types.ts'
import type { EditProject, SourceInfo } from '../editor/types.ts'
import type { CutState } from '../cut.ts'

export const preparedAssets = tofuCase.assets
export const preparedAt = 1793912400000
export const preparedCacheFetchedAt = 1793579309700
const cachedSearchItems = [
  {
    "id": "3965228470707584451",
    "url": "https://www.instagram.com/p/DcHUkkRyn3D/",
    "likes": 876112,
    "comments": 3578,
    "shares": 210472,
    "saves": null,
    "duration": 67.150658,
    "author": "asanebo_restaurant",
    "music": "Tofu Time! · asanebo_restaurant",
    "musicOriginal": true,
    "hashtags": [],
    "text": "Cached 2 Nov 2026 · My Secret Tasty Tofu Recipe…🤫\nCached Instagram search reference, not a live result. Metrics are from the 2 Nov 2026 snapshot. Local analysis and transcript are unavailable for this result.",
    "createTime": null,
    "plays": 22929796,
    "followers": 2383953,
    "medianViews": 104446.0,
    "cover": "/demo-assets/search-results/instagram-3965228470707584451.jpg"
  },
  {
    "id": "3967092331747788579",
    "url": "https://www.instagram.com/p/DcN8XUJAMcj/",
    "likes": 193277,
    "comments": 1282,
    "shares": 66174,
    "saves": null,
    "duration": 86.466667,
    "author": "erinphamvn2uk",
    "music": "Original audio · erinphamvn2uk",
    "musicOriginal": true,
    "hashtags": [
      "erinphamvn2uk",
      "crispytofu",
      "friedtofu",
      "panfriedtofu",
      "tofurecipe"
    ],
    "text": "Cached 2 Nov 2026 · Crispy tofu without the oil splatter? 👀\nCached Instagram search reference, not a live result. Metrics are from the 2 Nov 2026 snapshot. Local analysis and transcript are unavailable for this result.",
    "createTime": null,
    "plays": 5952997,
    "followers": 208257,
    "medianViews": 45053.0,
    "cover": "/demo-assets/search-results/instagram-3967092331747788579.jpg"
  },
  {
    "id": "3977423352452053149",
    "url": "https://www.instagram.com/p/DcypXc8P3id/",
    "likes": 54760,
    "comments": 2677,
    "shares": 22313,
    "saves": null,
    "duration": 62.135147,
    "author": "sarahsvegankitchen_",
    "music": "Original audio · sarahsvegankitchen_",
    "musicOriginal": true,
    "hashtags": [
      "veganrecipes",
      "homemadetakeout",
      "tofurecipes",
      "tofu"
    ],
    "text": "Cached 2 Nov 2026 · Sesame Tofu made at home for less 🥡 comment “tofu” to have this recipe sent to your inbox! 📥 It’s also on SarahsVeganKitchen.com (linked in bio) 💕\nCached Instagram search reference, not a live result. Metrics are from the 2 Nov 2026 snapshot. Local analysis and transcript are unavailable for this result.",
    "createTime": null,
    "plays": 1491557,
    "followers": 293968,
    "medianViews": 35102.0,
    "cover": "/demo-assets/search-results/instagram-3977423352452053149.jpg"
  },
  {
    "id": "3984140265618652354",
    "url": "https://www.instagram.com/p/DdKgnZzh7zC/",
    "likes": 7064,
    "comments": 1211,
    "shares": 2022,
    "saves": null,
    "duration": 39.077732,
    "author": "consciouschris",
    "music": "Sweetness · Max Holm",
    "musicOriginal": false,
    "hashtags": [
      "vegan",
      "tofu",
      "maple",
      "easyrecipe"
    ],
    "text": "Cached 2 Nov 2026 · CRISPY MAPLE GLAZED TOFU 🍁 comment RECIPE and I’ll send you the details! If you want to make a tofu recipe that your friends and family won’t stop raving about, this is it! The best part is it’s super simple to make and comes together in no time! @sweetsimplevegan and I make this on the regular and it never disappoints!\nCached Instagram search reference, not a live result. Metrics are from the 2 Nov 2026 snapshot. Local analysis and transcript are unavailable for this result.",
    "createTime": null,
    "plays": 174757,
    "followers": 514128,
    "medianViews": 45896,
    "cover": "/demo-assets/search-results/instagram-3984140265618652354.jpg"
  },
  {
    "id": "3989438398069123761",
    "url": "https://www.instagram.com/p/DddVRYKNqqx/",
    "likes": 7218,
    "comments": 34,
    "shares": 2941,
    "saves": null,
    "duration": 17.266666,
    "author": "_cookwithm_",
    "music": "Training Season (Live from the Royal Albert Hall) · Dua Lipa",
    "musicOriginal": false,
    "hashtags": [
      "tofu",
      "protein",
      "comfortfood",
      "easyrecipes",
      "explore"
    ],
    "text": "Cached 2 Nov 2026 · Crispy Soy Sesame Tofu 🍢\nCached Instagram search reference, not a live result. Metrics are from the 2 Nov 2026 snapshot. Local analysis and transcript are unavailable for this result.",
    "createTime": null,
    "plays": 343086,
    "followers": 21249,
    "medianViews": 13726.0,
    "cover": "/demo-assets/search-results/instagram-3989438398069123761.jpg"
  },
  {
    "id": "3987396006155819614",
    "url": "https://www.instagram.com/p/DdWE4qduppe/",
    "likes": 422499,
    "comments": 715,
    "shares": 34411,
    "saves": null,
    "duration": 174.753372,
    "author": "xiaomei.china",
    "music": "Original audio · xiaomei.china",
    "musicOriginal": true,
    "hashtags": [
      "ChineseFood",
      "FermentedTofu",
      "TraditionalFood",
      "ChineseCulture",
      "Viral"
    ],
    "text": "Cached 2 Nov 2026 · Fermented tofu, a bold taste of traditional China 🧈✨ A simple village food with a rich, savory flavor—one bite of authentic Chinese food culture. 🇨🇳\nCached Instagram search reference, not a live result. Metrics are from the 2 Nov 2026 snapshot. Local analysis and transcript are unavailable for this result.",
    "createTime": null,
    "plays": 20592075,
    "followers": 92419,
    "medianViews": 46164.5,
    "cover": "/demo-assets/search-results/instagram-3987396006155819614.jpg"
  },
  {
    "id": "3966801412116726269",
    "url": "https://www.instagram.com/p/DcM6N4HvEH9/",
    "likes": 454492,
    "comments": 2626,
    "shares": 100096,
    "saves": null,
    "duration": 74.070206,
    "author": "thaotamto",
    "music": "Original audio · thaotamto",
    "musicOriginal": true,
    "hashtags": [],
    "text": "Cached 2 Nov 2026 · Boil your tofu! Why?\nCached Instagram search reference, not a live result. Metrics are from the 2 Nov 2026 snapshot. Local analysis and transcript are unavailable for this result.",
    "createTime": null,
    "plays": 6602687,
    "followers": 589932,
    "medianViews": 48744,
    "cover": "/demo-assets/search-results/instagram-3966801412116726269.jpg"
  },
  {
    "id": "4015077580985586337",
    "url": "https://www.instagram.com/p/De4a8mAR9Kh/",
    "likes": 7222,
    "comments": 2716,
    "shares": 2529,
    "saves": null,
    "duration": 19.666666,
    "author": "vegan_high_protein",
    "music": "",
    "musicOriginal": false,
    "hashtags": [
      "veganhighprotein",
      "proteinreich",
      "vegandeutschland",
      "veganerezepte",
      "tofu"
    ],
    "text": "Cached 2 Nov 2026 · Kommentiere “Tofu” und ich schicke dir das Rezept per DM zu 🫶\nCached Instagram search reference, not a live result. Metrics are from the 2 Nov 2026 snapshot. Local analysis and transcript are unavailable for this result.",
    "createTime": null,
    "plays": 656288,
    "followers": 508668,
    "medianViews": 33349.0,
    "cover": "/demo-assets/search-results/instagram-4015077580985586337.jpg"
  },
  {
    "id": "4009438326035664179",
    "url": "https://www.instagram.com/p/DekYuokMU0z/",
    "likes": 0,
    "comments": 15,
    "shares": 438,
    "saves": null,
    "duration": 106.602814,
    "author": "linyue_xiaoxi",
    "music": "Original audio · linyue_xiaoxi",
    "musicOriginal": true,
    "hashtags": [
      "intangibleculturalheritage",
      "myrurallife",
      "moldytofu",
      "traditionalculture"
    ],
    "text": "Cached 2 Nov 2026 · ⛰️🍭🍉✨️Moldy tofu... it's fragrant with a hint of numbing spice, and that numbing feeling brings out the heat! Seriously, it's fragrant, numbing, AND spicy all at once. 😋 | Part 2❤️ |\nCached Instagram search reference, not a live result. Metrics are from the 2 Nov 2026 snapshot. Local analysis and transcript are unavailable for this result.",
    "createTime": null,
    "plays": 227366,
    "followers": 204750,
    "medianViews": 99197.0,
    "cover": "/demo-assets/search-results/instagram-4009438326035664179.jpg"
  },
  {
    "id": "3972350465685289944",
    "url": "https://www.instagram.com/p/Dcgn7O-h3vY/",
    "likes": 649,
    "comments": 87,
    "shares": 72,
    "saves": null,
    "duration": 19.24789,
    "author": "naturallieplantbased",
    "music": "Original audio · naturallieplantbased",
    "musicOriginal": true,
    "hashtags": [
      "plantbased",
      "healthyrecipes"
    ],
    "text": "Cached 2 Nov 2026 · Why I used to hate tofu:\nCached Instagram search reference, not a live result. Metrics are from the 2 Nov 2026 snapshot. Local analysis and transcript are unavailable for this result.",
    "createTime": null,
    "plays": 127280,
    "followers": 372838,
    "medianViews": 29548.5,
    "cover": "/demo-assets/search-results/instagram-3972350465685289944.jpg"
  },
  {
    "id": "4019712954486887122",
    "url": "https://www.instagram.com/p/DfI46J_OhLS/",
    "likes": 3112,
    "comments": 785,
    "shares": 1065,
    "saves": null,
    "duration": 28.768072,
    "author": "vegscratchkitchen",
    "music": "Original audio · vegscratchkitchen",
    "musicOriginal": true,
    "hashtags": [
      "veganrecipes",
      "pumpkin",
      "plantbased"
    ],
    "text": "Cached 2 Nov 2026 · comment “PUMPKIN” to have this free recipe sent to your inbox - PUMPKIN-GOCHUJANG TOFU 🎃🌶️\nCached Instagram search reference, not a live result. Metrics are from the 2 Nov 2026 snapshot. Local analysis and transcript are unavailable for this result.",
    "createTime": null,
    "plays": 109281,
    "followers": 589846,
    "medianViews": 109421.5,
    "cover": "/demo-assets/search-results/instagram-4019712954486887122.jpg"
  }
].map((item) => ({ ...item, sourceFetchedAt: preparedCacheFetchedAt }))
export const preparedSearchResult = {
  query: 'tofu', platform: 'instagram', fetchedAt: preparedCacheFetchedAt, prepared: true, cached: true, mediansPending: false,
  videos: [{ id: 'DVp3xOdFaHL', sourceFetchedAt: preparedAt, text: `${tofuCase.title}\nPrepared reference sample. Popularity data unavailable.`, url: tofuCase.sourceUrl, createTime: null, plays: null, likes: 0, comments: 0, shares: 0, saves: null, duration: 10.5, cover: preparedAssets[0].relativePath, author: 'Ever Green reference', followers: null, medianViews: null, music: '', musicOriginal: false, hashtags: [] as string[] }, ...cachedSearchItems],
}
export const preparedTikTokSearchResult = {
  query: 'tofu', platform: 'tiktok', fetchedAt: 1793072997591, prepared: true, cached: true, mediansPending: false,
  videos: [
  {
    "id": "7671729723533217038",
    "url": "https://www.tiktok.com/@superbenito3/video/7671729723533217038",
    "likes": 1700000,
    "comments": 8037,
    "shares": 98800,
    "saves": 69214,
    "duration": 111,
    "author": "superbenito3",
    "music": "original sound · benny",
    "musicOriginal": true,
    "hashtags": [
      "tofu"
    ],
    "createTime": "2026-08-08T18:29:51.000Z",
    "plays": 18100000,
    "followers": 115700,
    "medianViews": 349950.0,
    "text": "Cached 27 Oct 2026 · Eating tofu, 6 ways ib: @alexkhosieyo #tofu\nCached TikTok search reference, not a live result. Metrics are from the 27 Oct 2026 snapshot. Local analysis and transcript are unavailable for this result.",
    "cover": "/demo-assets/search-results/tiktok-7671729723533217038.jpg",
    "sourceFetchedAt": 1793072997591
  },
  {
    "id": "7674920740885630221",
    "url": "https://www.tiktok.com/@superbenito3/video/7674920740885630221",
    "likes": 580600,
    "comments": 3644,
    "shares": 28000,
    "saves": 27119,
    "duration": 149,
    "author": "superbenito3",
    "music": "original sound - benny · benny",
    "musicOriginal": false,
    "hashtags": [
      "tofu",
      "sequel"
    ],
    "createTime": "2026-08-17T18:14:00.000Z",
    "plays": 6700000,
    "followers": 115700,
    "medianViews": 349950.0,
    "text": "Cached 27 Oct 2026 · Another tofu, 6 ways!! ib: @alexkhosieyo #tofu #sequel\nCached TikTok search reference, not a live result. Metrics are from the 27 Oct 2026 snapshot. Local analysis and transcript are unavailable for this result.",
    "cover": "/demo-assets/search-results/tiktok-7674920740885630221.jpg",
    "sourceFetchedAt": 1793072997591
  },
  {
    "id": "7417826857640332577",
    "url": "https://www.tiktok.com/@siiielle/video/7417826857640332577",
    "likes": 627,
    "comments": 9,
    "shares": 32,
    "saves": 172,
    "duration": 31,
    "author": "siiielle",
    "music": "snooze sped up · astrycuh",
    "musicOriginal": true,
    "hashtags": [
      "tofu",
      "tofurecipe",
      "leckererezepte",
      "mamsoftiktok",
      "fürdich",
      "ernährung",
      "dm",
      "dmbio"
    ],
    "createTime": "2024-09-23T13:16:54.000Z",
    "plays": 84400,
    "followers": 2730,
    "medianViews": 491.5,
    "text": "Cached 27 Oct 2026 · Welcher Tofu schmeckt euch am besten? 🥰der hier vom @dm-drogerie markt war wirklich lecker!! #tofu #tofurecipe #leckererezepte #mamsoftiktok #fürdich #ernährung  #dm #dmbio\nCached TikTok search reference, not a live result. Metrics are from the 27 Oct 2026 snapshot. Local analysis and transcript are unavailable for this result.",
    "cover": "/demo-assets/search-results/tiktok-7417826857640332577.jpg",
    "sourceFetchedAt": 1793072997591
  },
  {
    "id": "7629936914358963487",
    "url": "https://www.tiktok.com/@chinesefood0805/video/7629936914358963487",
    "likes": 19700,
    "comments": 54,
    "shares": 4595,
    "saves": 20937,
    "duration": 25,
    "author": "chinesefood0805",
    "music": "Early in the Morning · Peder B. Helland",
    "musicOriginal": false,
    "hashtags": [
      "chinesecuisine",
      "cooking",
      "tofu",
      "easyrecipe"
    ],
    "createTime": "2026-04-18T03:32:20.000Z",
    "plays": 1000000,
    "followers": 101000,
    "medianViews": 17500.0,
    "text": "Cached 27 Oct 2026 · 5-minute tofu egg recipe. Super smooth & delicious #chinesecuisine #cooking #tofu #easyrecipe\nCached TikTok search reference, not a live result. Metrics are from the 27 Oct 2026 snapshot. Local analysis and transcript are unavailable for this result.",
    "cover": "/demo-assets/search-results/tiktok-7629936914358963487.jpg",
    "sourceFetchedAt": 1793072997591
  },
  {
    "id": "7528819470459014431",
    "url": "https://www.tiktok.com/@itshelenmelon/video/7528819470459014431",
    "likes": 71900,
    "comments": 281,
    "shares": 5275,
    "saves": 38441,
    "duration": 21,
    "author": "itshelenmelon",
    "music": "While drinking strong green tea · KCNX",
    "musicOriginal": false,
    "hashtags": [
      "easyrecipe",
      "koreanfood",
      "koreancooking",
      "tofu",
      "vegetarian",
      "lunchideas",
      "silkentofu"
    ],
    "createTime": "2025-07-19T15:45:16.000Z",
    "plays": 2200000,
    "followers": 257100,
    "medianViews": 14150.0,
    "text": "Cached 27 Oct 2026 · Korean silken tofu is a A TRUE 5-minute recipe!! It’s super delicious, beginner friendly and perfectly low effort.\nCached TikTok search reference, not a live result. Metrics are from the 27 Oct 2026 snapshot. Local analysis and transcript are unavailable for this result.",
    "cover": "/demo-assets/search-results/tiktok-7528819470459014431.jpg",
    "sourceFetchedAt": 1793072997591
  },
  {
    "id": "7214945726772595974",
    "url": "https://www.tiktok.com/@fitgreenmind/video/7214945726772595974",
    "likes": 657100,
    "comments": 2546,
    "shares": 65000,
    "saves": 459391,
    "duration": 43,
    "author": "fitgreenmind",
    "music": "Originalton · Maya Leinenbach",
    "musicOriginal": true,
    "hashtags": [
      "veganrecipes",
      "easyrecipe",
      "easyveganrecipes",
      "tofu",
      "tofubites"
    ],
    "createTime": "2023-03-26T19:54:20.000Z",
    "plays": 11900000,
    "followers": 1800000,
    "medianViews": 22950.0,
    "text": "Cached 27 Oct 2026 · Slightly addicted to these 🤭 #veganrecipes #easyrecipe #easyveganrecipes #tofu #tofubites\nCached TikTok search reference, not a live result. Metrics are from the 27 Oct 2026 snapshot. Local analysis and transcript are unavailable for this result.",
    "cover": "/demo-assets/search-results/tiktok-7214945726772595974.jpg",
    "sourceFetchedAt": 1793072997591
  },
  {
    "id": "7643846116865281288",
    "url": "https://www.tiktok.com/@_cookim_/video/7643846116865281288",
    "likes": 1100000,
    "comments": 4606,
    "shares": 31200,
    "saves": 99190,
    "duration": 90,
    "author": "_cookim_",
    "music": "original sound - Cookim · Cookim",
    "musicOriginal": true,
    "hashtags": [],
    "createTime": "2026-05-25T15:06:57.000Z",
    "plays": 14600000,
    "followers": 3000000,
    "medianViews": 43250.0,
    "text": "Cached 27 Oct 2026 · Soy Beans Ep.2 Tofu\nCached TikTok search reference, not a live result. Metrics are from the 27 Oct 2026 snapshot. Local analysis and transcript are unavailable for this result.",
    "cover": "/demo-assets/search-results/tiktok-7643846116865281288.jpg",
    "sourceFetchedAt": 1793072997591
  },
  {
    "id": "7672439031489170708",
    "url": "https://www.tiktok.com/@itsvegansis/video/7672439031489170708",
    "likes": 179100,
    "comments": 1223,
    "shares": 18900,
    "saves": 84016,
    "duration": 67,
    "author": "itsvegansis",
    "music": "Lonely Table for Two · Jake the Diver",
    "musicOriginal": false,
    "hashtags": [
      "tofu",
      "chickentenders",
      "highproteinrecipes",
      "veganrecipes",
      "honeybbq"
    ],
    "createTime": "2026-08-10T16:22:04.000Z",
    "plays": 1700000,
    "followers": 474100,
    "medianViews": 267150.0,
    "text": "Cached 27 Oct 2026 · chickenless honey bbq tofu tenders 🍗\nCached TikTok search reference, not a live result. Metrics are from the 27 Oct 2026 snapshot. Local analysis and transcript are unavailable for this result.",
    "cover": "/demo-assets/search-results/tiktok-7672439031489170708.jpg",
    "sourceFetchedAt": 1793072997591
  },
  {
    "id": "7631286703877049622",
    "url": "https://www.tiktok.com/@dr.vegan/video/7631286703877049622",
    "likes": 133400,
    "comments": 577,
    "shares": 21200,
    "saves": 91778,
    "duration": 15,
    "author": "dr.vegan",
    "music": "original sound · dr.vegan",
    "musicOriginal": true,
    "hashtags": [
      "healthyrecipe",
      "healthy",
      "easyrecipe"
    ],
    "createTime": "2026-04-21T18:50:01.000Z",
    "plays": 2900000,
    "followers": 988700,
    "medianViews": null,
    "text": "Cached 27 Oct 2026 · Tofu Shawarma\nCached TikTok search reference, not a live result. Metrics are from the 27 Oct 2026 snapshot. Local analysis and transcript are unavailable for this result.",
    "cover": "/demo-assets/search-results/tiktok-7631286703877049622.jpg",
    "sourceFetchedAt": 1793072997591
  },
  {
    "id": "7699830643466784032",
    "url": "https://www.tiktok.com/@leticia.marleen/video/7699830643466784032",
    "likes": 10700,
    "comments": 32,
    "shares": 634,
    "saves": 5598,
    "duration": 60,
    "author": "leticia.marleen",
    "music": "Originalton · leticia.marleen",
    "musicOriginal": true,
    "hashtags": [
      "butterchicken",
      "vegetarisch",
      "rezept",
      "tofu",
      "foryoupage❤️❤️"
    ],
    "createTime": "2026-10-23T11:55:29.000Z",
    "plays": 108900,
    "followers": 62000,
    "medianViews": null,
    "text": "Cached 27 Oct 2026 · es war unnormal lecker😍🤭 #butterchicken #vegetarisch #rezept #tofu #foryoupage❤️❤️\nCached TikTok search reference, not a live result. Metrics are from the 27 Oct 2026 snapshot. Local analysis and transcript are unavailable for this result.",
    "cover": "/demo-assets/search-results/tiktok-7699830643466784032.jpg",
    "sourceFetchedAt": 1793072997591
  },
  {
    "id": "7600098462264200470",
    "url": "https://www.tiktok.com/@fitgreenmind/video/7600098462264200470",
    "likes": 217100,
    "comments": 868,
    "shares": 12300,
    "saves": 68797,
    "duration": 51,
    "author": "fitgreenmind",
    "music": "Originalton · Maya Leinenbach",
    "musicOriginal": true,
    "hashtags": [],
    "createTime": "2026-01-27T17:43:42.000Z",
    "plays": 2000000,
    "followers": 1800000,
    "medianViews": 22950.0,
    "text": "Cached 27 Oct 2026 · Tofu 101 🤓\nCached TikTok search reference, not a live result. Metrics are from the 27 Oct 2026 snapshot. Local analysis and transcript are unavailable for this result.",
    "cover": "/demo-assets/search-results/tiktok-7600098462264200470.jpg",
    "sourceFetchedAt": 1793072997591
  },
  {
    "id": "7418859793261120801",
    "url": "https://www.tiktok.com/@veganewunder/video/7418859793261120801",
    "likes": 25200,
    "comments": 397,
    "shares": 772,
    "saves": 8347,
    "duration": 36,
    "author": "veganewunder",
    "music": "Originalton · Chris Washington",
    "musicOriginal": true,
    "hashtags": [
      "tofu"
    ],
    "createTime": "2024-09-26T08:05:39.000Z",
    "plays": 598100,
    "followers": 787000,
    "medianViews": null,
    "text": "Cached 27 Oct 2026 · Leider können sich viele Leute immer noch nicht mit #tofu anfreunden, dabei ist er eine tolle Proteinquelle 💪🏽, die man ganz einfach zu seinen Gerichten hinzufügen kann. Hier ist eine einfache Art, Tofu schmackhafter in deine Lieblingsgerichte 🤤 zu integrieren.\nCached TikTok search reference, not a live result. Metrics are from the 27 Oct 2026 snapshot. Local analysis and transcript are unavailable for this result.",
    "cover": "/demo-assets/search-results/tiktok-7418859793261120801.jpg",
    "sourceFetchedAt": 1793072997591
  },
  {
    "id": "7696263661588942112",
    "url": "https://www.tiktok.com/@fabiundphil/video/7696263661588942112",
    "likes": 36500,
    "comments": 191,
    "shares": 3244,
    "saves": 19556,
    "duration": 34,
    "author": "fabiundphil",
    "music": "Mayonaka no Door 〜 Stay with Me · Miki Matsubara",
    "musicOriginal": false,
    "hashtags": [
      "udon",
      "ramen",
      "tofu",
      "einfacherezepte",
      "schnellerezepte"
    ],
    "createTime": "2026-10-13T21:13:46.000Z",
    "plays": 546800,
    "followers": 1100000,
    "medianViews": null,
    "text": "Cached 27 Oct 2026 · Das sind die einfachsten und cremigsten Udon Ramen mit Crispy Tofu🍜😍 und das beste, sie brauchen euch nur 10 Minuten✨\nCached TikTok search reference, not a live result. Metrics are from the 27 Oct 2026 snapshot. Local analysis and transcript are unavailable for this result.",
    "cover": "/demo-assets/search-results/tiktok-7696263661588942112.jpg",
    "sourceFetchedAt": 1793072997591
  },
  {
    "id": "7684972541043084576",
    "url": "https://www.tiktok.com/@veganewunder/video/7684972541043084576",
    "likes": 29400,
    "comments": 97,
    "shares": 2510,
    "saves": 22315,
    "duration": 47,
    "author": "veganewunder",
    "music": "Originalton · Chris Washington",
    "musicOriginal": true,
    "hashtags": [],
    "createTime": "2026-09-13T10:58:26.000Z",
    "plays": 377500,
    "followers": 787000,
    "medianViews": null,
    "text": "Cached 27 Oct 2026 · Wenn du bisher dachtest, Tofu wäre langweilig, dann musst du dieses Rezept probieren – 🍚 Crispy Sesame Tofu mit Reis und Brokkoli\nCached TikTok search reference, not a live result. Metrics are from the 27 Oct 2026 snapshot. Local analysis and transcript are unavailable for this result.",
    "cover": "/demo-assets/search-results/tiktok-7684972541043084576.jpg",
    "sourceFetchedAt": 1793072997591
  },
  {
    "id": "7633855134228876576",
    "url": "https://www.tiktok.com/@schmaleschulter/video/7633855134228876576",
    "likes": 11500,
    "comments": 122,
    "shares": 2135,
    "saves": 10956,
    "duration": 41,
    "author": "schmaleschulter",
    "music": "Originalton · Kay",
    "musicOriginal": true,
    "hashtags": [
      "gesundeküche",
      "gesunderezepte",
      "muskelaufbau"
    ],
    "createTime": "2026-04-28T16:56:50.000Z",
    "plays": 223900,
    "followers": 623500,
    "medianViews": null,
    "text": "Cached 27 Oct 2026 · Tofu kann manchmal das bessere Hähnchen sein, oder? 🤔\nCached TikTok search reference, not a live result. Metrics are from the 27 Oct 2026 snapshot. Local analysis and transcript are unavailable for this result.",
    "cover": "/demo-assets/search-results/tiktok-7633855134228876576.jpg",
    "sourceFetchedAt": 1793072997591
  },
  {
    "id": "7156991784663452934",
    "url": "https://www.tiktok.com/@veggilaine/video/7156991784663452934",
    "likes": 2670,
    "comments": 35,
    "shares": 166,
    "saves": 1739,
    "duration": 80,
    "author": "veggilaine",
    "music": "origineel geluid · Veggilaine | Ghislaine",
    "musicOriginal": true,
    "hashtags": [
      "tofu",
      "tofurecept",
      "kokenoptiktok",
      "voorjou"
    ],
    "createTime": "2022-10-21T15:43:28.000Z",
    "plays": 70700,
    "followers": 335000,
    "medianViews": null,
    "text": "Cached 27 Oct 2026 · Als je deze tips opvolgt zal tofu nooit meer hetzelfde zijn en gaat er een nieuwe wereld voor je open. Zo lekker. 🤤 Echt! #tofu #tofurecept #kokenoptiktok #voorjou\nCached TikTok search reference, not a live result. Metrics are from the 27 Oct 2026 snapshot. Local analysis and transcript are unavailable for this result.",
    "cover": "/demo-assets/search-results/tiktok-7156991784663452934.jpg",
    "sourceFetchedAt": 1793072997591
  },
  {
    "id": "7627202732696276257",
    "url": "https://www.tiktok.com/@fitgreenmind/video/7627202732696276257",
    "likes": 15700,
    "comments": 62,
    "shares": 976,
    "saves": 10224,
    "duration": 21,
    "author": "fitgreenmind",
    "music": "Originalton · Maya Leinenbach",
    "musicOriginal": true,
    "hashtags": [],
    "createTime": "2026-04-10T18:42:06.000Z",
    "plays": 324200,
    "followers": 1800000,
    "medianViews": 22950.0,
    "text": "Cached 27 Oct 2026 · The BEST and EASIEST way to eat a block of tofu (and eat enough protein)!😉💪\nCached TikTok search reference, not a live result. Metrics are from the 27 Oct 2026 snapshot. Local analysis and transcript are unavailable for this result.",
    "cover": "/demo-assets/search-results/tiktok-7627202732696276257.jpg",
    "sourceFetchedAt": 1793072997591
  }
],
}
export const preparedSearchResults = { instagram: preparedSearchResult, tiktok: preparedTikTokSearchResult }
const preparedS19Script = tofuCase.script.find((line) => line.groupId === 'finished')!.onScreenText
export const preparedTutorialPrompt = `${tofuCase.shots[18].action} Adapted on-screen copy: ${preparedS19Script} Prepared camera alternative: high-angle, source-referenced AI concept (not filmed footage).`
export const preparedModels: GenModel[] = ['image', 'video'].map((kind) => ({
  id: `prepared-${kind}`, label: `Prepared ${kind} playback (no provider)`, kind: kind as 'image' | 'video',
  provider: 'prepared', endpoint: 'local-only', tier: 'prepared', price: { per: 'playback', usd: 0 },
  priceCheckedAt: '2026-11-06', available: true, inputs: { text: 'required' }, aspects: ['9:16'],
  resolutions: ['1K'], maxCount: 1, typicalSeconds: 1, ...(kind === 'video' ? { durations: [6] } : {}),
}))
preparedModels.push({ ...preparedModels[1], id: 'prepared-i2v', label: 'Prepared I2V playback (existing S19 concept)', inputs: { text: 'required', startFrame: 'required' } })
export function preparedFixtures() {
  let time = 0
  const shots: Shot[] = tofuCase.shots.map((s, i) => {
    const start = time; time = Math.round((time + s.durationSeconds) * 100) / 100
    return { id: s.id, time: `${start}-${time}s`, shot: s.action, line: '', text: '', purpose: i === 0 ? 'hook' : i === 20 ? 'cta' : 'body', tip: 'Prepared reference breakdown; no spoken narration.' }
  })
  const client: Client = { id: ids.clientId, name: 'Ever Green · Prepared sample', niche: 'Silken tofu', audience: 'Home cooks', monthlyTarget: 1, examples: ['Tofu Recipe'], cannot: [], brand: { font: 'Noto Sans TC', color: null }, kit: { items: [] } }
  const video = preparedSearchVideo(preparedSearchResult.videos[0])
  const format: Format = { id: ids.formatId, name: tofuCase.title, short: 'Tofu okonomiyaki', tags: [], audiences: ['Home cooks'], summary: `Prepared analysis: ${tofuCase.analysis.summary}`, why: { hook: 'Immediate tofu reveal.', first3s: 'Fast preparation cuts.', length: tofuCase.analysis.pacing, format: 'Visual recipe and product reveal.', sound: tofuCase.analysis.audioNote, hookType: 'visual' }, shotList: shots, props: ['Silken tofu', 'Bowl', 'Frying pan'], needs: [], needsKnown: true, lines: [
    { time: '0-6.13s', role: 'hook', text: 'Quoted source on-screen text (not spoken): "Turn tofu into..."' },
    { time: '6.13-9.03s', role: 'payoff', text: 'Quoted source on-screen text (not spoken; nutrition claim unverified): "Healthy & high protein okonomiyaki"' },
    { time: '9.03-10.27s', role: 'cta', text: 'Quoted source on-screen text (not spoken): "Want the full recipe? Comment "RECIPE" below!"' },
  ], effort: 'medium', editorNotes: 'Prepared reference-derived sample. Original on-screen text is quoted from the linked reference; there is no spoken cooking narration. The quoted nutrition claim is not independently verified. Adapted plan copy is labelled separately. No fresh AI or live generation.' }
  const ideas: SavedIdea[] = (['shoot', 'ai'] as const).map((route) => ({ id: ids.plans[route], clientId: ids.clientId, videoId: ids.videoId, status: 'approved', dueDate: '', stage: 'editing', approvedAt: preparedAt, updatedAt: preparedAt, notes: `Prepared ${route} sample; approved state is fixture data, not a new human decision. ${format.editorNotes}`, shots: structuredClone(shots), script: { lines: shots.map((_, i) => ({ say: '', onScreen: i === 0 ? 'Adapted copy: Turn silken tofu into something crispy.' : i === 18 ? `Adapted copy: ${preparedS19Script}` : '' })), basedOn: JSON.stringify(shots.map((s) => [s.shot, '', ''])), writtenAt: preparedAt } }))
  const canvases: Record<string, CanvasState> = {}
  const projects: Record<string, { version: number; project: EditProject }> = {}
  const sources: Record<string, SourceInfo[]> = {}
  const cuts: Record<string, CutState> = {}
  for (const route of ['shoot', 'ai'] as const) {
    const id = ids.plans[route]
    const nodes: CanvasState['doc']['nodes'] = shots.flatMap((s, i) => [
      { id: `n_shot_${s.id}`, type: 'shot', shotId: s.id, position: { x: (i % 5) * 700, y: Math.floor(i / 5) * 650 }, data: {} },
      { id: `n_sb_${s.id}`, type: 'storyboard', shotId: s.id, position: { x: (i % 5) * 700 + 300, y: Math.floor(i / 5) * 650 }, data: { primary: true, model: 'prepared-image', prompt: s.shot, selected: null } },
      { id: `n_video_${s.id}`, type: 'video', shotId: s.id, position: { x: (i % 5) * 700 + 300, y: Math.floor(i / 5) * 650 + 300 }, data: { model: 'prepared-video', prompt: s.shot, duration: 6, selected: null } },
    ])
    if (route === 'shoot') for (const angle of ['high-angle', 'low-macro']) for (const kind of ['image', 'video'] as const) {
      nodes.push({ id: `n_${angle}_${kind}`, type: kind === 'image' ? 'storyboard' : 'video', shotId: 's19', position: { x: angle === 'high-angle' ? 3200 : 3600, y: kind === 'image' ? 2600 : 3000 }, data: { model: `prepared-${kind}`, prompt: `Prepared S19 ${angle} alternative`, duration: kind === 'video' ? 6 : undefined, selected: null } })
    }
    if (route === 'ai') for (const kind of ['image','video'] as const) nodes.push({ id: kind === 'image' ? c.nodes.image : c.nodes.video, type: kind === 'image' ? 'storyboard' : 'video', shotId: 's19', position: { x: 3200, y: kind === 'image' ? 2600 : 3000 }, data: {} })
    nodes.push({ id: c.nodes.prompt, type: 'prompt', shotId: 's19', position: { x: 2800, y: 2600 }, data: { text: preparedTutorialPrompt } })
    if (route === 'shoot') nodes.push({ id: c.nodes.footage, type: 'footage', shotId: 's19', position: { x: 4000, y: 2600 }, data: { media: 'video', selected: 'shoot-high-angle-video' } })
    for (const n of nodes) if (n.id === c.nodes.image || n.id === c.nodes.video) n.data = { model: n.id === c.nodes.image ? 'prepared-image' : 'prepared-i2v', ...(n.id === c.nodes.video ? { duration: 6, selected: route === 'ai' ? 'shoot-high-angle-video' : null } : { selected: null }) }
    const edges = [
      { id: c.edges.promptImage, source: c.nodes.prompt, sourceHandle: 'out', target: c.nodes.image, targetHandle: 'in:text' },
      { id: c.edges.promptVideo, source: c.nodes.prompt, sourceHandle: 'out', target: c.nodes.video, targetHandle: 'in:text' },
      { id: c.edges.imageVideo, source: c.nodes.image, sourceHandle: 'out', target: c.nodes.video, targetHandle: 'in:start' },
    ]
    canvases[id] = { version: 1, doc: { nodes, edges, viewport: { x: 0, y: 0, zoom: 0.5 } }, generations: [], takes: [] }
    const sourceAssets = route === 'ai' ? preparedAssets.filter((a) => a.id === 'prepared-source-derived-cut' || a.kind === 'video' && a.routes.includes('shoot')) : preparedAssets.filter((a) => a.kind === 'video' && a.routes.includes('shoot'))
    sourceAssets.sort((a,b) => Number(b.id === 'prepared-source-derived-cut') - Number(a.id === 'prepared-source-derived-cut'))
    sources[id] = sourceAssets.map((a) => ({ key: `generation:${a.id}`, kind: 'generation', id: a.id, url: a.relativePath, duration: a.id === 'prepared-source-derived-cut' ? 10.517 : 5.875, hasAudio: a.id === 'prepared-source-derived-cut', width: a.id === 'prepared-source-derived-cut' ? 1080 : 768, height: a.id === 'prepared-source-derived-cut' ? 1920 : 1364, ...(a.id !== 'prepared-source-derived-cut' ? { shotId: 's19', nodeId: route === 'ai' ? c.nodes.video : c.nodes.footage } : {}) }))
    // Register existing files as imports so the native resolver can verify their identity.
    canvases[id].generations = sourceAssets.map((asset, index): Generation => ({ id: asset.id, ideaId: id, nodeId: sources[id][index].nodeId ?? 'prepared-imported-fullcut', kind: 'video', model: 'imported', inputs: { prompt: `Prepared import: ${asset.label}`, sentPrompt: asset.label, duration: sources[id][index].duration }, status: 'done', estUsd: 0, actualUsd: 0, url: asset.relativePath, error: null, createdAt: preparedAt, finishedAt: preparedAt }))
    let cursor = 0
    const clips = route === 'ai' ? shots.map((s, i) => { const start = cursor; cursor = Math.round((cursor + tofuCase.shots[i].durationSeconds) * 100) / 100; return { id: `prepared-clip-${s.id}`, source: { kind: 'generation' as const, id: sourceAssets[0].id, shotId: s.id }, in: start, out: cursor, volume: 0, muted: true } }) : [{ id: 'prepared-clip-s19', source: { kind: 'generation' as const, id: sourceAssets[0].id, shotId: 's19', nodeId: c.nodes.footage }, in: 0, out: 5.875, volume: 0, muted: true }]
    projects[id] = { version: 1, project: { fps: 30, width: 1080, height: 1920, clips, texts: [], captions: { enabled: false }, music: null, voiceover: [], primaries: {}, showLogo: false, logoSize: 'medium', logoCorner: 'top-right' } }
    cuts[id] = { status: 'done', progress: 1, step: 'Prepared playback · existing file', speed: 1, stale: false, music: null, output: { url: sourceAssets[0].relativePath, size: route === 'ai' ? 6567831 : 870464, durationSec: sources[id][0].duration }, review: { status: 'waiting', sentAt: preparedAt }, source: 'editor' }
  }
  return { clients: [client], library: { videos: [video, ...cachedSearchItems.map((item) => preparedSearchVideo(item)), ...preparedTikTokSearchResult.videos.map((item) => preparedSearchVideo(item,'tiktok'))], formats: [format, ...preparedSupplementFormats('en')] }, ideas, rev: 1, canvases, projects, sources, cuts, jobs: [] as { fingerprint: string; assetId: string; generation: Generation; started: number }[], analyzeStarted: null as number | null, analyzeId: null as string | null, sequence: 0 }
}

function preparedSearchVideo(item: typeof preparedSearchResult.videos[number] | typeof preparedTikTokSearchResult.videos[number], platform: 'instagram' | 'tiktok' = 'instagram'): Video {
  const first = item.text.split('\n').map((line) => line.replace(/#\S+/g,'').trim()).find(Boolean)!
  const hook = Array.from(first).length > 90 ? `${Array.from(first).slice(0,87).join('')}…` : first
  return { id: `${platform === 'instagram' ? 'ig' : 'tt'}-${item.id}`, platform, handle: `@${item.author}`, hook, views: item.plays ?? 0, followers: item.followers ?? 0, medianViews: item.medianViews ?? null, daysAgo: item.createTime ? Math.max(0,Math.round((item.sourceFetchedAt - Date.parse(item.createTime)) / 86400000)) : 999, lengthSec: Math.round(item.duration), shares: item.shares, saves: item.saves, formatId: `live-${item.id}`, keywords: ['tofu'], live: true, url: item.url, thumbnail: item.cover, caption: item.text, music: item.music, hashtags: item.hashtags, likes: item.likes, commentCount: item.comments, fetchedAt: item.sourceFetchedAt, fromCache: true }
}
// Only allowlisted cached references have native placeholder formats; no transcript is invented.
export function preparedSupplementFormats(lang: Lang): Format[] {
  return inLang(lang, () => Object.entries(preparedSearchResults).flatMap(([platform,batch]) => batch.videos.filter((item) => item.id !== 'DVp3xOdFaHL').map((item) => {
    const v = preparedSearchVideo(item,platform as 'instagram' | 'tiktok'), tags = item.hashtags.slice(0,5).map((h) => `#${h}`)
    return { id: v.formatId, name: v.hook, short: v.hook, tags: [], audiences: [], summary: item.text, why: { hook: t('find.live.captionOpens',{hook:v.hook}), first3s: t('find.live.first3s'), length: t('find.live.lengthSec',{n:v.lengthSec}), format: tags.length ? t('find.live.tagged',{tags:tags.join(' ')}) : t('find.live.noTags'), sound: item.music ? t(item.musicOriginal ? 'find.live.originalSound' : 'find.live.usesSound',{music:item.music}) : t('find.live.unknownSound') }, shotList: [], props: [], needs: [], effort: 'medium', editorNotes: `Match the pacing and edit style of the reference: ${item.url}` }
  })))
}
