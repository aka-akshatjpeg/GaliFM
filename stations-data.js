/**
 * Gali FM — stations-data.js  v4
 *
 * Single source of truth for all station metadata and playlists.
 * Loaded by index.html, stations.html, and every station listening page.
 *
 * ── STATIONS OVERVIEW ─────────────────────────────────────────────
 * 0: Ishq Wali Gali    (Bollywood Romance 2010–2015)
 * 1: Bus Wale Bhaiya   (Highway & Dhaba Classics)
 * 2: Bhojpuri Bawaal   (Festive Bhojpuri Beats & Party Hits)
 * 3: Bartan Ka Samay   (Comforting Kitchen & Chores Melodies)
 * 4: Chandan Mistri    (Worksite Chai & Grounded Desi Classics)
 * 5: Chatpate Gaane    (Sensual, Flirtatious & Late-Night Bollywood)
 * 6: Haryanvi Bangers  (High-Energy Gaam & Tractor Anthems)
 * ─────────────────────────────────────────────────────────────────
 */

const STATIONS = [
  /* ─── 0: Ishq Wali Gali ─────────────────────────────────────── */
  {
    id: 0,
    slug: 'ishq-wali-gali',
    folder: 'deluxe-saloon',
    name: 'Ishq Wali Gali',
    nameHindi: 'इश्क़ वाली गली',
    icon: '🌹',
    mood: 'Nostalgic, intimate, dreamy, emotional, warm, and cinematic.',
    caption: 'A late-night lane of Bollywood romance, unforgettable melodies, heartfelt lyrics, and memories that never quite fade.',
    quote: 'Kuch toh hai tujhse raabta... kuch toh hai.',
    quoteAttr: '— overheard on a quiet balcony, 2013',
    image: 'assets/stations/ishq-wali-gali.jpg',
    bgPosition: 'center',
    tracks: [
      {
        title: 'Tumsa Koi Pyara',
        artist: 'Kumar Sanu, Alka Yagnik',
        url: 'music/deluxe-saloon/tumsa-koi-pyara.mp3',
        duration: 348,
      },
      {
        title: 'Mujhse Mohabbat Ka Izhaar',
        artist: 'Kumar Sanu, Alka Yagnik',
        url: 'music/deluxe-saloon/mujhse-mohabbat-ka.mp3',
        duration: 312,
      },
    ],
  },

  /* ─── 1: Bus Wale Bhaiya ─────────────────────────────────────── */
  {
    id: 1,
    slug: 'bus-wale-bhaiya',
    folder: 'bus-driver',
    name: 'Bus Wale Bhaiya',
    nameHindi: 'बस वाले भैया',
    icon: '🚌',
    mood: 'Nostalgic, energetic, road-trip-inspired, and unmistakably Indian.',
    caption: 'Highway ki raat, dhaba ki chai, and the songs that make every kilometre feel shorter.',
    quote: 'Agla stop Teen Tigamba. Jo utarna ho, ready raho.',
    quoteAttr: '— conductor, into the bus microphone',
    image: 'assets/stations/bus-wale-bhaiya.webp',
    bgPosition: 'center',
    tracks: [],
  },

  /* ─── 2: Bhojpuri Bawaal ───────────────────────────────────── */
  {
    id: 2,
    slug: 'bhojpuri-bawaal',
    folder: 'bhojpuri-bangers',
    name: 'Bhojpuri Bawaal',
    nameHindi: 'भोजपुरी बवाल',
    icon: '🎉',
    mood: 'Festive, vibrant, energetic, colourful, and celebratory.',
    caption: 'Bhojpuri beats, full-on energy, desi celebrations, and tracks that turn every gathering into a party.',
    quote: 'Naacho bhai, naacho — aaj sab kuch mast hai!',
    quoteAttr: '— DJ announcement, Patna, Saturday night',
    image: 'assets/stations/bhojpuri-bawaal.webp',
    bgPosition: 'center top',
    tracks: [],
  },

  /* ─── 3: Bartan Ka Samay ────────────────────────────────────── */
  {
    id: 3,
    slug: 'bartan-ka-samay',
    folder: 'bartan-time',
    name: 'Bartan Ka Samay',
    nameHindi: 'बर्तन का समय',
    icon: '🍽️',
    mood: 'Cosy, relatable, humorous, comforting, and homely.',
    caption: 'Sink full of dishes, chai on the counter, and your favourite songs making household chores feel lighter.',
    quote: 'Bartan kaun dhoyega? … Kal kar lena. Chai pehle.',
    quoteAttr: '— every kitchen, every night',
    image: 'assets/stations/bartan-ka-samay.webp',
    bgPosition: 'center',
    tracks: [],
  },

  /* ─── 4: Chandan Mistri ────────────────────────────────────── */
  {
    id: 4,
    slug: 'chandan-mistri',
    folder: 'raju-mistri',
    name: 'Chandan Mistri',
    nameHindi: 'चंदन मिस्त्री',
    icon: '🏗️',
    mood: 'Earthy, hardworking, authentic, warm, and grounded in everyday Indian life.',
    caption: 'Dust in the air, chai in a steel glass, and the desi favourites that keep the workday moving.',
    quote: 'Kaam kal karega — abhi chai ho jaye, yaar.',
    quoteAttr: '— Chandan Mistri, putting down the trowel',
    image: 'assets/stations/chandan-mistri.webp',
    bgPosition: 'center',
    tracks: [],
  },

  /* ─── 5: Chatpate Gaane ──────────────────────────────────────── */
  {
    id: 5,
    slug: 'chatpate-gaane',
    folder: 'papa-ke-gaane',
    name: 'Chatpate Gaane',
    nameHindi: 'चटपटे गाने',
    icon: '🌶️',
    mood: 'Intimate, mischievous, glamorous, late-night, and sophisticated.',
    caption: 'Flirty Bollywood favourites, seductive melodies, and late-night songs with a little extra spice.',
    quote: 'Thoda sa drama, thodi si shararat... aur ek chatpata gaana.',
    quoteAttr: '— late-night radio host',
    image: 'assets/stations/chatpate-gaane.png',
    bgPosition: 'center',
    tracks: [],
  },

  /* ─── 6: Haryanvi Bangers ──────────────────────────────────── */
  {
    id: 6,
    slug: 'haryanvi-bangers',
    folder: 'corporate-majdoor',
    name: 'Haryanvi Bangers',
    nameHindi: 'हरियाणवी बैंगर्स',
    icon: '🚜',
    mood: 'Bold, rustic, powerful, proudly Haryanvi, and energetic.',
    caption: 'Gaam ki vibe, tractor ki ride, desi beats, and high-energy Haryanvi tracks that hit different.',
    quote: 'Gaam ki vibe, tractor ki ride — full bass, no compromise!',
    quoteAttr: '— desi hook',
    image: 'assets/stations/haryanvi-bangers.png',
    bgPosition: 'center',
    tracks: [],
  },
];
