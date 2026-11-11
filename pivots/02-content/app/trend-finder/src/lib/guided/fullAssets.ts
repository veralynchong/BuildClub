export const FULL_AI_ASSETS = [
  {
    "id": "s1",
    "sourceId": "ai-s1",
    "originalShots": [
      1,
      2
    ],
    "startFrame": 0,
    "endFrame": 48,
    "duration": 1.6,
    "imageUrl": "/demo-assets/full-ai-six/ai-s1.png",
    "videoUrl": "/demo-assets/full-ai-six/ai-s1.mp4",
    "videoSha256": "572fe4a96f2ec88ccfcb4d084c72339db1f0aa42f89c984ee1ac6e50a768a175",
    "provenance": "Continuous frames 0\u201347 of the original 21-shot AI master; original shots [1, 2]. Existing baked-in captions and silent audio are preserved; no new generation."
  },
  {
    "id": "s2",
    "sourceId": "ai-s2",
    "originalShots": [
      3,
      4,
      5,
      6,
      7
    ],
    "startFrame": 48,
    "endFrame": 97,
    "duration": 1.6333333333333333,
    "imageUrl": "/demo-assets/full-ai-six/ai-s2.png",
    "videoUrl": "/demo-assets/full-ai-six/ai-s2.mp4",
    "videoSha256": "20c72d8f38f3d02690677750400f8e64fc85d7b36ca8b16f29689314c1857296",
    "provenance": "Continuous frames 48\u201396 of the original 21-shot AI master; original shots [3, 4, 5, 6, 7]. Existing baked-in captions and silent audio are preserved; no new generation."
  },
  {
    "id": "s3",
    "sourceId": "ai-s3",
    "originalShots": [
      8,
      9,
      10,
      11
    ],
    "startFrame": 97,
    "endFrame": 154,
    "duration": 1.9,
    "imageUrl": "/demo-assets/full-ai-six/ai-s3.png",
    "videoUrl": "/demo-assets/full-ai-six/ai-s3.mp4",
    "videoSha256": "6ec2aa0c228c991271e374f0cad8a503ee7e2adc9df9461d6d000a7b0187d220",
    "provenance": "Continuous frames 97\u2013153 of the original 21-shot AI master; original shots [8, 9, 10, 11]. Existing baked-in captions and silent audio are preserved; no new generation."
  },
  {
    "id": "s4",
    "sourceId": "ai-s4",
    "originalShots": [
      12,
      13,
      14
    ],
    "startFrame": 154,
    "endFrame": 199,
    "duration": 1.5,
    "imageUrl": "/demo-assets/full-ai-six/ai-s4.png",
    "videoUrl": "/demo-assets/full-ai-six/ai-s4.mp4",
    "videoSha256": "8dfab3c86d3045c57679cd8b64f002c9ccc8cc98fec5df0cde0d0e349f4f0195",
    "provenance": "Continuous frames 154\u2013198 of the original 21-shot AI master; original shots [12, 13, 14]. Existing baked-in captions and silent audio are preserved; no new generation."
  },
  {
    "id": "s5",
    "sourceId": "ai-s5",
    "originalShots": [
      15,
      16,
      17,
      18,
      19
    ],
    "startFrame": 199,
    "endFrame": 293,
    "duration": 3.1333333333333333,
    "imageUrl": "/demo-assets/full-ai-six/ai-s5.png",
    "videoUrl": "/demo-assets/full-ai-six/ai-s5.mp4",
    "videoSha256": "435ea04dd26d9d32b27a88542814847e69c2f9dd82d8137bdccb81381ec025eb",
    "provenance": "Continuous frames 199\u2013292 of the original 21-shot AI master; original shots [15, 16, 17, 18, 19]. Existing baked-in captions and silent audio are preserved; no new generation."
  },
  {
    "id": "s6",
    "sourceId": "ai-s6",
    "originalShots": [
      20,
      21
    ],
    "startFrame": 293,
    "endFrame": 315,
    "duration": 0.7333333333333333,
    "imageUrl": "/demo-assets/full-ai-six/ai-s6.png",
    "videoUrl": "/demo-assets/full-ai-six/ai-s6.mp4",
    "videoSha256": "5074125aa565cadc1b2fb77f119e9ed9a21837ddffc102dd82c819f921d8453d",
    "provenance": "Continuous frames 293\u2013314 of the original 21-shot AI master; original shots [20, 21]. Existing baked-in captions and silent audio are preserved; no new generation."
  }
] as const

export const fullCutMode = (): boolean => typeof window !== 'undefined' && new URLSearchParams(window.location?.search).get('cut') === 'full21'
