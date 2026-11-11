# Apify scrape results: most-viewed videos of AI video tool brands (run 2026-10-30 AEDT)

Method: clockworks~tiktok-scraper, profiles with profileSorting=popular, resultsPerPage=12, plus searchQueries ['ai video editing','viral video ai remix'] (searchSection /video, 12 each). apify~instagram-reel-scraper, resultsLimit=12 per account (latest 12 reels, NOT sorted by popularity — so IG lists are 'top of last 12 reels'). Re-ranked locally by playCount (TikTok) / videoPlayCount (IG). Cost ~US$0.45 TikTok + ~US$0.22 IG (measured from Apify monthly usage, may lag). Raw JSON kept in scratchpad, not in repo.

Observations by coordinator: (1) TikTok 'popular' sort returned old videos (2022-2024) for Captions/Submagic/CapCut — popular = all-time, so it shows each brand's historic hits. (2) IG reel-scraper returns collab posts whose owner is a partner creator (e.g. @mr.k.videography for Submagic 50k, @dreomar 162k for Captions, @russestudiosv 993k for MakeUGC/AI UGC, @creator.abe 483k) — these creator-collab reels often outperform the brand's own reels; evidence that these brands grow via paid/affiliate creators with 'Comment X for the link' CTAs. (3) Higgsfield IG dominates (2.57M, 1.14M plays in Oct 2026); Higgsfield TikTok @higgsfield.ai returned no videos (error row). (4) IG @virloai not found. (5) Brand own-accounts mostly low (MakeUGC TikTok <1.2k, Virlo TikTok max 16k, Creatify <17k), while office-humor skits (Munch 56k, Creatify) beat product demos. (6) Keyword search 'ai video editing' surfaces AI-generated content (1.5M, 1.2M CapCut AI dunk template tutorial), not editing-tool content — keyword search returns AI-made videos, so queries must target tool/tutorial intent (e.g. 'capcut template tutorial', brand names, 'comment for the link').

```
TT-ERR {"authorMeta": {"id": "7476217441062028343", "name": "higgsfield.ai", "profileUrl": "https://www.tiktok.com/@higgsfield.ai", "nickName": "Higgsfield AI", "verified": false, "signature": "The ultimate 
IG-ERR {"url": "https://www.instagram.com/virloai", "username": "virloai", "error": "not_found", "errorDescription": "Profile does not exist"}

## TT @makeugc n=12 fans=141
      1,146 plays       98 likes 2024-09-15 @makeugc https://www.tiktok.com/@makeugc/video/7414839776576032033 | 'This is why they are flopping 👀#ai #dropshipping '
        957 plays       96 likes 2024-09-29 @makeugc https://www.tiktok.com/@makeugc/video/7420047375395310881 | 'Stop editing your ads like this… #ai #shopify #dropshipping '
        932 plays       94 likes 2024-09-22 @makeugc https://www.tiktok.com/@makeugc/video/7417564004408642848 | 'How to make great engaging ads #ai #shopify #dropshipping '
        928 plays      117 likes 2024-09-16 @makeugc https://www.tiktok.com/@makeugc/video/7415194825751809313 | 'Do this instead… #ai #dropshipping #fyp '
        920 plays      111 likes 2024-09-05 @makeugc https://www.tiktok.com/@makeugc/video/7411164400540749088 | 'Stop scrolling… #ai #fyp #ugc #dropshipping '

## TT @munchstudio_com n=12 fans=1221
     56,200 plays    1,729 likes 2026-03-04 @munchstudio_com https://www.tiktok.com/@munchstudio_com/video/7613433962114845972 | '“Not so helpful” 😭\n\n#worklife #fyp #corporatehumor #genz #millenial'
     23,700 plays      440 likes 2025-10-30 @munchstudio_com https://www.tiktok.com/@munchstudio_com/video/7567039275783490837 | 'Age gap who?? \n\n#fyp #relatable #worklife #officehumor #officelife '
     11,900 plays      556 likes 2025-10-15 @munchstudio_com https://www.tiktok.com/@munchstudio_com/video/7561462281234681095 | 'can someone please tell me what they’re doing??\n\nthank god for munch studio thou'
      9,417 plays      105 likes 2023-08-03 @munchstudio_com https://www.tiktok.com/@munchstudio_com/video/7263117062388698386 | '@Joe Rogan Clips \n\nSober October: Reclaim Your Dream Sleep! #alcohol #brain #rem'
      8,998 plays      328 likes 2025-08-21 @munchstudio_com https://www.tiktok.com/@munchstudio_com/video/7541051262620454162 | 'Pov: you’re a small business owner and there’s no greater motivation than yourse'

## TT Q:ai video editing n=12 fans=19900
  1,500,000 plays   58,100 likes 2026-10-28 @alexytyba5e https://www.tiktok.com/@alexytyba5e/video/7701764174967360781 | '#AIGenerated #AIContent #AIVideo #MadeWithAI #FYP #ForYou #Viral #Trending #TikT'
  1,200,000 plays   22,300 likes 2026-10-27 @zhufei312 https://www.tiktok.com/@zhufei312/video/7701199439033027871 | '#capcut #capcutpioneer 🔥🏀 How to make this trending Ja Morant & Wemby dunk AI vi'
  1,100,000 plays   74,200 likes 2026-10-27 @.ai.world.create https://www.tiktok.com/@.ai.world.create/video/7701292655078018310 | 'ဝက်သားအတု ( part 1 )\n#aivideo #aitrend #aiconnect #ai #fyp '
    285,700 plays    6,423 likes 2026-10-27 @tanya.ho.ai https://www.tiktok.com/@tanya.ho.ai/video/7701215951278198037 | 'THANKS FIR DINNER!🤍\n\nAI mini movie • AI filmmaking • AI storytelling • AI short '
    186,200 plays   19,500 likes 2026-10-29 @tkabokinrakumi https://www.tiktok.com/@tkabokinrakumi/video/7702052249031200006 | '#hausatiktok #arewa_tiktok\n#aivideoediting #hausavideo #animal'

## TT @captionsapp n=12 fans=14100
    303,300 plays      788 likes 2022-08-15 @captionsapp https://www.tiktok.com/@captionsapp/video/7132199937311247662 | 'check it out!'
    284,500 plays      789 likes 2022-08-13 @captionsapp https://www.tiktok.com/@captionsapp/video/7131472995222162731 | ''
    111,500 plays    1,368 likes 2024-01-10 @captionsapp https://www.tiktok.com/@captionsapp/video/7322511832093117738 | 'Instantly remove background noise and echoes to enhance your audio, using AI Den'
     87,900 plays    1,774 likes 2023-04-28 @captionsapp https://www.tiktok.com/@captionsapp/video/7227132255691361579 | 'Read from a script but appear as if you’re looking right at the camera ✌️\n\n#aicr'
     83,300 plays      322 likes 2022-08-02 @captionsapp https://www.tiktok.com/@captionsapp/video/7127317878331772206 | 'check out these new features!'

## TT @heygen.com n=12 fans=2907
    429,300 plays      938 likes 2025-12-22 @heygen.com https://www.tiktok.com/@heygen.com/video/7586706345479376141 | 'Santa finally learned how to use the internet.\n\nThis year, skip the line at the '
     98,200 plays      122 likes 2026-06-03 @heygen.com https://www.tiktok.com/@heygen.com/video/7647271350054309134 | 'When a video flops at $4,500, you spiral. When a video flops at $29, you just ma'
     75,400 plays      367 likes 2025-01-01 @heygen.com https://www.tiktok.com/@heygen.com/video/7455095753237613870 | 'How does AI see you 👀 find out by downloading HeyGen on the App Store today! #he'
     13,500 plays      235 likes 2025-06-24 @heygen.com https://www.tiktok.com/@heygen.com/video/7519317654444756238 | 'How to create UGC product ads with AI! \n\n#aiproductvideos #ai #aivideos #futureo'
     11,400 plays      121 likes 2025-03-20 @heygen.com https://www.tiktok.com/@heygen.com/video/7483677078219558190 | 'Would you be influenced by AI? \n👀\U0001fae2\n\n#greenscreen #influencers #aiinfluencer #ait'

## TT @virloapp n=12 fans=149
     16,400 plays    1,063 likes 2025-07-14 @virloapp https://www.tiktok.com/@virloapp/video/7527019453729623309 | 'Life savings going down on the first hand.😤\n\nThis viral trend was found using Vi'
      7,117 plays      135 likes 2025-07-19 @virloapp https://www.tiktok.com/@virloapp/video/7528854224516467982 | 'Tastes like promotion!\n\nViral trends like this one can be found all over Virlo. '
      6,298 plays      449 likes 2025-12-18 @virloapp https://www.tiktok.com/@virloapp/video/7585290456997678349 | 'Easily save to collection by adding Virlo app to favorite and just hitting ✨ sha'
      5,436 plays      300 likes 2025-09-04 @virloapp https://www.tiktok.com/@virloapp/video/7546261761486343438 | 'Ngl we cooked here 🙇🥀🥀checkout Virlo today https://virlo.ai'
      4,753 plays      117 likes 2025-08-17 @virloapp https://www.tiktok.com/@virloapp/video/7539639698042408247 | 'The numbers Mason, what do they mean?\n\nThis viral trend was discovered within mi'

## TT @capcut n=12 fans=26900000
 84,800,000 plays 1,800,000 likes 2024-04-24 @capcut https://www.tiktok.com/@capcut/video/7361508219904265480 | 'See your world in #cinematic by using iur cinematic #templates on #CapCut 🎥\n\n#cc'
 50,900,000 plays 2,900,000 likes 2022-11-23 @capcut https://www.tiktok.com/@capcut/video/7169288221812067586 | 'Happy Thanksgiving Day! Never forget to thank yourself❤️ Tag someone u wanna say'
 23,400,000 plays 2,200,000 likes 2022-07-13 @capcut https://www.tiktok.com/@capcut/video/7119891336831962370 | '❤️#CapCut #fyp #viral #videoedit #tutorial #cccreator'
 14,000,000 plays 1,700,000 likes 2021-11-24 @capcut https://www.tiktok.com/@capcut/video/7034098222389824769 | 'Put on headphones #capcut #viral #fyp #videoedit'
 14,000,000 plays 1,000,000 likes 2022-01-19 @capcut https://www.tiktok.com/@capcut/video/7054859278703791362 | '🕶️ #capcut #viral #fyp #videoedit #tutorial'

## TT Q:viral video ai remix n=12 fans=72900
  3,200,000 plays   78,100 likes 2026-01-28 @elsdigitalfreedomai https://www.tiktok.com/@elsdigitalfreedomai/video/7600553954950335775 | 'INNA bar dance challenge ai baby dance effect filter ,Original remix created by '
    611,000 plays    4,919 likes 2026-09-19 @jake.s661 https://www.tiktok.com/@jake.s661/video/7687222180597271828 | 'hotel lobby ai\nhotel lobby quavo trend\nhotel lobby template\nhow to make hotel lo'
     27,700 plays      529 likes 2026-05-21 @trendtoklive https://www.tiktok.com/@trendtoklive/video/7642299834501762327 | '❤️ 🧡 🥰 FULL AI REMIX - LET ME BE #CapCut #ai #viral #music #deepvibes @TikTok @T'
     22,700 plays    1,179 likes 2026-10-19 @krishtina700 https://www.tiktok.com/@krishtina700/video/7698355266886077716 | 'Ai Dj remix.tiktok trending effect \n#trendingsong \n#djremix \n#aieffect \n#musiclo'
     19,000 plays      300 likes 2026-09-12 @papoiremix7 https://www.tiktok.com/@papoiremix7/video/7684781581961039134 | 'Papoi y Tung Tung soltaron el remix más pegajoso 😂🍟🔥\n#Papoi #TungTungSahur #Papa'

## TT @submagic.co n=12 fans=7101
    561,000 plays   49,600 likes 2023-06-07 @submagic.co https://www.tiktok.com/@submagic.co/video/7241966959707884827 | "N'utilise PAS ces outils 🚫 INFOS en description 👀\n\nAbonne toi pour plus d'astuce"
    343,000 plays   14,500 likes 2023-05-01 @submagic.co https://www.tiktok.com/@submagic.co/video/7228077897775385883 | 'Meilleures sous titre avec l’IA 🔥\n\n#soustitre #businessdigitale #ia '
    283,500 plays    3,154 likes 2023-05-12 @submagic.co https://www.tiktok.com/@submagic.co/video/7232349756951989530 | 'Des sous-titres de dingues pour exploser tes TikTok 🚀🔥\n#IA #soustitre #oussamaam'
     92,800 plays      605 likes 2023-05-27 @submagic.co https://www.tiktok.com/@submagic.co/video/7237901619701026074 | 'Cet outil va te faire exploser tes videos 😱 #IA #submagic #saas #videoshorts #so'
     55,700 plays    2,604 likes 2023-05-14 @submagic.co https://www.tiktok.com/@submagic.co/video/7232969333863877915 | 'Des sous-titres de ouf pour faire décoller tes TikTok 🚀🔥\n\n##yomidenzel##IA##sous'

## TT @creatifyai n=12 fans=1542
     16,800 plays      550 likes 2025-05-29 @creatifyai https://www.tiktok.com/@creatifyai/video/7510014113959922987 | 'Send it to that coworker #Creatify #office #corporatelife #ai #startup #corporat'
     15,900 plays      542 likes 2026-05-18 @creatifyai https://www.tiktok.com/@creatifyai/video/7641320163966602510 | 'AI ad makers generate. Creatify Agent orchestrates.\nEvery other tool: one prompt'
      9,846 plays      724 likes 2025-09-23 @creatifyai https://www.tiktok.com/@creatifyai/video/7553388878317489463 | '#Creatify #ai #startup #corporatehumor #officehumor '
      7,591 plays      528 likes 2025-08-04 @creatifyai https://www.tiktok.com/@creatifyai/video/7534877071403683086 | 'Oh no 🙌🏻 #Creatify #ai #startup #office #corporatelife #corporatetiktok #corpora'
      6,635 plays      364 likes 2025-07-01 @creatifyai https://www.tiktok.com/@creatifyai/video/7522237830895111437 | 'Is it just me?? #Creatify #ai #startup #office #corporatelife #corporatetiktok #'

## IG @munchstudio_com n=12 fans=
      4,902 plays       74 likes 2026-09-30 https://www.instagram.com/p/Dd6iu6gOPFe/ | 'don’t worry, we made Munch Studio for marketing budgets like this 😂😭\n\n#smallbusi'
      3,366 plays       72 likes 2026-10-20 https://www.instagram.com/p/DeuHIKaOTd4/ | 'I’d like to thank everyone for their voluntary participation 🤣😭\n\n#workhumor #off'
      3,306 plays       88 likes 2026-09-28 https://www.instagram.com/p/Dd1aejquV7s/ | 'well that was strange.. \n\n#ceo #genz #officehumor #officelife #funny'
      2,730 plays       48 likes 2026-10-06 https://www.instagram.com/p/DeJ-bUZOR1C/ | 'emphasis on FUNNIEST\n\n#joke #workhumor #officehumor #genz #trending'
      2,483 plays       48 likes 2026-10-22 https://www.instagram.com/p/DezPUb7OxyX/ | 'When people tell you that running your own business gives you a special glow…\n\nT'

## IG @heygen_official n=11 fans=
      8,925 plays       89 likes 2026-10-15 https://www.instagram.com/p/DeiFxneCTEv/ | 'Most people use avatars to save time. \n\nJan Hotovec uses his to tell his life st'
      7,442 plays       81 likes 2026-10-12 https://www.instagram.com/p/DeZs6pThB4_/ | 'In June 2024, a fire flooded Craig’s home. His family lost 60% of what they owne'
      6,694 plays       78 likes 2026-10-19 https://www.instagram.com/p/DesEdcCkc2E/ | 'No client has ever understood that the music is the edit.  Swap the song and eve'
      5,816 plays       31 likes 2026-10-15 https://www.instagram.com/p/DehlNs5DzMt/ | 'Your agent plans the trip in Gullivr. \n\nHeyGen MCP makes the trailer that gets e'
      5,816 plays       56 likes 2026-10-20 https://www.instagram.com/p/DeuaGHiEb9G/ | 'Professional Voice Clone on HeyGen sounds exactly like you.\n\nUpload 30 min to 2 '

## IG @heyjoshuaxu n=1 fans=
     10,050 plays      193 likes 2026-10-21 https://www.instagram.com/p/DexRW9DBMwV/ | 'This video was made and edited through Claude, using HeyGen for the A-roll and H'

## IG @getcaptionsapp n=12 fans=
     29,603 plays       -1 likes 2026-08-17 https://www.instagram.com/p/DcJdgQvKI3S/ | '@sevynthestylist is a pro at creating engaging videos that connect with her audi'
     29,155 plays       -1 likes 2026-07-31 https://www.instagram.com/p/DbdbBecipmD/ | 'Comment “TWIN” to get the link to try 🔗\n\nMirage Avatar X is the most expressive '
     25,619 plays       -1 likes 2026-08-12 https://www.instagram.com/p/Db83tcPic91/ | 'Comment “TWIN” to get the link to create your Twin in just 10 seconds.\n\nThis vid'
     24,980 plays       -1 likes 2026-08-04 https://www.instagram.com/p/Dbn8TkTi6vF/ | 'You can now create the perfect avatar for any video with Mirage Avatar X, our la'
     17,478 plays       -1 likes 2026-08-19 https://www.instagram.com/p/DcOk3eFCCHe/ | 'Introducing Clips.\n\nAny long-form video → ready-to-post clips, instantly edited '

## IG @creatify_ai_official n=12 fans=
      1,966 plays       22 likes 2026-10-27 https://www.instagram.com/p/DfAqse1jiPU/ | 'Kling 4.0 vs Seedance 2.5 👀\nSame prompt. Two different takes.\nWhich one gets you'
        770 plays       15 likes 2026-10-21 https://www.instagram.com/p/Dew6hykEtps/ | 'Trends don’t wait. Neither should your ads. 🚀\n\nDrop in a trending video + your p'
        690 plays       13 likes 2026-10-27 https://www.instagram.com/p/DfAPKxlAaeN/ | 'Big-budget energy. Meet Kling 4.0 🔥\nNow live in Creatify:\n🎬 30-second videos\n🖼️ '
        677 plays       13 likes 2026-10-21 https://www.instagram.com/p/DexALQOjodo/ | 'Make video ads without leaving Claude. ✦\nCreatify × Claude is live.\n\nTry it:http'
        666 plays       11 likes 2026-10-22 https://www.instagram.com/p/DezgVx9D5Kz/ | 'Meet your next Meta ad sidekick. ✨\nOne product URL. A whole lineup of Meta ads.\n'

## IG @higgsfield.ai n=12 fans=
  2,574,718 plays   44,501 likes 2026-10-05 https://www.instagram.com/p/DeHZl65CI2G/ | 'Officially, every viral AI influencer was made on Higgsfield 🧩\n\nMake one with yo'
  1,140,999 plays   24,070 likes 2026-10-08 https://www.instagram.com/p/DePxEsZKKJ8/ | 'Introducing Higgsfield Katana, powered by Claude Motion.\n\nOur most powerful AI v'
    426,234 plays    7,638 likes 2026-10-10 https://www.instagram.com/p/DeU1iZdizUI/ | 'Shortlist now live for the $1,000,000 Higgsfield Global Film Festival.\n\nCongratu'
    265,291 plays    3,313 likes 2026-10-28 https://www.instagram.com/p/DfC6d-FCbKW/ | 'We’re starting Higgsfield Selected, our pick of the best work made on Higgsfield'
    221,481 plays    1,591 likes 2026-10-28 https://www.instagram.com/p/DfDNY7Cio6e/ | 'Mobile game ads never look like the real game.\n\nNow you can turn a viral ad into'

## IG @russestudiosv n=1 fans=
    992,730 plays    2,388 likes 2026-04-28 https://www.instagram.com/p/DXr_a_zkdrw/ | 'This is AI. \n\nFollow me & comment “UGC” for the free prompt and the link.\n\nFirst'

## IG @makeugc.ai n=9 fans=
      6,214 plays       49 likes 2025-11-24 https://www.instagram.com/p/DRcZK6_DfgO/ | 'Comment “agent” to get the set-up\n\n#ai #aitools #ugc'
      5,878 plays       33 likes 2025-08-25 https://www.instagram.com/p/DNyIf9sUAd2/ | 'Can you guess the price?\n\n#ai #aitools #ugc'
      4,005 plays       39 likes 2025-08-14 https://www.instagram.com/p/DNWAN1Pt1Po/ | 'Guess in the comments before the video ends!\n\n#aitools #aitools #ugc'
      3,926 plays       20 likes 2025-08-19 https://www.instagram.com/p/DNiHvCFtCur/ | '£40K??? #Ai #aiugc #aitools'
      3,251 plays       20 likes 2025-08-17 https://www.instagram.com/p/DNdDCOeNYP1/ | 'Which one is AI generated?\n\n#ai #aitools #ugc'

## IG @creator.abe n=1 fans=
    482,729 plays    1,991 likes 2026-01-13 https://www.instagram.com/p/DTdKPFVkfXl/ | 'Comment “AI” for the full guide \n\n#entrepreneurship'

## IG @astonbakerr n=1 fans=
     36,817 plays      208 likes 2026-02-10 https://www.instagram.com/p/DUlA8HtAg_O/ | 'With MakeUGC, you can create polished AI-driven video ads in minutes, not days, '

## IG @charlotte.arsenault n=1 fans=
     23,758 plays      496 likes 2026-10-06 https://www.instagram.com/p/DeJ53ibSfKj/ | 'I am always captivated by a video when the captions are fun to watch!! Anyone el'

## IG @jennasharp.edits n=1 fans=
     20,771 plays      641 likes 2026-09-08 https://www.instagram.com/p/DdB7Zp8xXbS/ | 'Captions are so important to keep your audience engaged butttttt they can take H'

## IG @ciggmedia n=1 fans=
      7,907 plays      214 likes 2026-08-26 https://www.instagram.com/p/DcgEYX-P1Dw/ | 'editing used to eat up hours of my day. cutting clips, syncing captions, fixing '

## IG @shogentle n=2 fans=
     23,346 plays      407 likes 2026-08-17 https://www.instagram.com/p/DcJDJjVJGy6/ | 'Every cuisine on Earth agrees on one thing. The dish is made in the prep, not on'
      6,735 plays       68 likes 2026-09-23 https://www.instagram.com/p/DdoSek2ofiC/ | 'How to speed up boring editing.\n\nHonest answer: you don’t get faster at it. You '

## IG @mr.k.videography n=2 fans=
     50,473 plays    3,395 likes 2026-08-01 https://www.instagram.com/p/DbfJECFTVdm/ | 'Comment ‘captions’ and I’ll send you the link to Submagic ⚡️\n\n@submagic.co \n\n#vi'
     19,265 plays    1,338 likes 2026-08-31 https://www.instagram.com/p/DcsKZSkTqe7/ | 'Comment ‘captions’ and I’ll send you the link to Submagic ⚡️\n\nI’ve always though'

## IG @doddsfilms n=1 fans=
      3,347 plays       57 likes 2026-08-11 https://www.instagram.com/p/Db4RpScyueZ/ | 'Don’t be this guy and get some work done! \n\nWorking smarter not harder with @sub'

## IG @creatingwithjerry n=1 fans=
     10,472 plays      132 likes 2026-07-03 https://www.instagram.com/p/DaWHRIdTMRj/ | "this has to be the best update yet, i've integrated @submagic.co into my workflo"

## IG @likfoon n=1 fans=
      3,156 plays       64 likes 2026-09-30 https://www.instagram.com/p/Dd6u0K4q3Jv/ | 'You don’t a consistency problem. You have a system problem.\n\nHaving a complete c'

## IG @samgyuy n=1 fans=
      8,079 plays      391 likes 2026-08-24 https://www.instagram.com/p/DcbSNYLK6WO/ | 'Make your post content workflow quicker \n\nComment “magic” and I’ll send you a li'

## IG @dreomar n=1 fans=
    161,982 plays    6,814 likes 2026-08-13 https://www.instagram.com/p/Db_SMR_Rz-1/ | 'Comenta "Captions" y te envío el link de esta herramienta 🔥🤯\n\nCuando comencé a e'
```
