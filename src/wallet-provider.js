import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet, sepolia } from 'viem/chains';
import './buffer-polyfill.js'; // Import the buffer polyfill
// Use our custom polyfill instead of the problematic browser-passworder
import passworder from './browser-passworder-polyfill.js';

// Simple replacements to avoid bip39 Buffer dependency for now
const MNEMONIC_ENTROPY_BYTES = 16; // For a 12-word phrase (128 bits)
const ENGLISH_WORDLIST = [
  "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract", "absurd", "abuse", "access", "accident", "account", "accuse", "achieve", "acid", "acoustic", "acquire", "across", "act", "action", "actor", "actress", "actual", "adapt", "add", "addict", "address", "adjust", "admit", "adult", "advance", "advice", "aerobic", "affair", "afford", "afraid", "again", "age", "agent", "agree", "ahead", "aim", "air", "airport", "aisle", "alarm", "album", "alcohol", "alert", "alien", "all", "alley", "allow", "almost", "alone", "alpha", "already", "also", "alter", "always", "amateur", "amazing", "among", "amount", "amused", "analyst", "anchor", "ancient", "anger", "angle", "angry", "animal", "ankle", "announce", "annual", "another", "answer", "antenna", "antique", "anxiety", "any", "apart", "apology", "appear", "apple", "approve", "april", "arch", "arctic", "area", "arena", "argue", "arm", "armed", "armor", "army", "around", "arrange", "arrest", "arrive", "arrow", "art", "artefact", "artist", "artwork", "ask", "aspect", "assault", "asset", "assist", "assume", "asthma", "athlete", "atom", "attack", "attend", "attitude", "attract", "auction", "audit", "august", "aunt", "author", "auto", "autumn", "average", "avocado", "avoid", "awake", "aware", "away", "awesome", "awful", "awkward", "axis", "baby", "bachelor", "bacon", "badge", "bag", "balance", "balcony", "ball", "bamboo", "banana", "banner", "bar", "barely", "bargain", "barrel", "base", "basic", "basket", "battle", "beach", "bean", "beauty", "because", "become", "beef", "before", "begin", "behave", "behind", "believe", "below", "belt", "bench", "benefit", "best", "betray", "better", "between", "beyond", "bicycle", "bid", "bike", "bind", "biology", "bird", "birth", "bitter", "black", "blade", "blame", "blanket", "blast", "bleak", "bless", "blind", "blood", "blossom", "blouse", "blue", "blur", "blush", "board", "boat", "body", "boil", "bomb", "bone", "bonus", "book", "boost", "border", "boring", "borrow", "boss", "bottom", "bounce", "box", "boy", "bracket", "brain", "brand", "brass", "brave", "bread", "breeze", "brick", "bridge", "brief", "bright", "bring", "brisk", "broccoli", "broken", "bronze", "broom", "brother", "brown", "brush", "bubble", "buddy", "budget", "buffalo", "build", "bulb", "bulk", "bullet", "bundle", "bunker", "burden", "burger", "burst", "bus", "business", "busy", "butter", "buyer", "buzz", "cabbage", "cabin", "cable", "cactus", "cage", "cake", "call", "calm", "camera", "camp", "can", "canal", "cancel", "candy", "cannon", "canoe", "canvas", "canyon", "capable", "capital", "captain", "car", "carbon", "card", "cargo", "carpet", "carry", "cart", "case", "cash", "casino", "castle", "casual", "cat", "catalog", "catch", "category", "cattle", "caught", "cause", "caution", "cave", "ceiling", "celery", "cement", "census", "century", "cereal", "certain", "chair", "chalk", "champion", "change", "chaos", "chapter", "charge", "chase", "chat", "cheap", "check", "cheese", "chef", "cherry", "chest", "chicken", "chief", "child", "chimney", "choice", "choose", "chronic", "chuckle", "chunk", "churn", "cigar", "cinnamon", "circle", "citizen", "city", "civil", "claim", "clap", "clarify", "claw", "clay", "clean", "clerk", "clever", "click", "client", "cliff", "climb", "clinic", "clip", "clock", "clog", "close", "cloth", "cloud", "clown", "club", "clump", "cluster", "clutch", "coach", "coast", "coconut", "code", "coffee", "coil", "coin", "collect", "color", "column", "combine", "come", "comfort", "comic", "common", "company", "concert", "conduct", "confirm", "congress", "connect", "consider", "control", "convince", "cook", "cool", "copper", "copy", "coral", "core", "corn", "correct", "cost", "cotton", "couch", "country", "couple", "course", "cousin", "cover", "coyote", "crack", "cradle", "craft", "cram", "crane", "crash", "crater", "crawl", "crazy", "cream", "credit", "creek", "crew", "cricket", "crime", "crisp", "critic", "crop", "cross", "crouch", "crowd", "crucial", "cruel", "cruise", "crumble", "crunch", "crush", "cry", "crystal", "cube", "culture", "cup", "cupboard", "curious", "current", "curtain", "curve", "cushion", "custom", "cute", "cycle", "dad", "damage", "damp", "dance", "danger", "daring", "dash", "daughter", "dawn", "day", "deal", "debate", "debris", "decade", "december", "decide", "decline", "decorate", "decrease", "deer", "defense", "define", "defy", "degree", "delay", "deliver", "demand", "demise", "denial", "dentist", "deny", "depart", "depend", "deposit", "depth", "deputy", "derive", "describe", "desert", "design", "desk", "despair", "destroy", "detail", "detect", "develop", "device", "devote", "diagram", "dial", "diamond", "diary", "dice", "diesel", "diet", "differ", "digital", "dignity", "dilemma", "dinner", "dinosaur", "direct", "dirt", "disagree", "discover", "disease", "dish", "dismiss", "disorder", "display", "distance", "divert", "divide", "divorce", "dizzy", "doctor", "document", "dog", "doll", "dolphin", "domain", "donate", "donkey", "donor", "door", "dose", "double", "dove", "draft", "dragon", "drama", "drastic", "draw", "dream", "dress", "drift", "drill", "drink", "drip", "drive", "drop", "drum", "dry", "duck", "dumb", "dune", "during", "dust", "dutch", "duty", "dwarf", "dynamic", "eager", "eagle", "early", "earn", "earth", "easily", "east", "easy", "echo", "ecology", "economy", "edge", "edit", "educate", "effort", "egg", "eight", "either", "elbow", "elder", "electric", "elegant", "element", "elephant", "elevator", "elite", "else", "embark", "embody", "embrace", "emerge", "emotion", "employ", "empower", "empty", "enable", "enact", "end", "endless", "endorse", "enemy", "energy", "enforce", "engage", "engine", "enhance", "enjoy", "enlist", "enough", "enrich", "enroll", "ensure", "enter", "entire", "entry", "envelope", "episode", "equal", "equip", "era", "erase", "erode", "erosion", "error", "erupt", "escape", "essay", "essence", "estate", "eternal", "ethics", "evidence", "evil", "evoke", "evolve", "exact", "example", "excess", "exchange", "excite", "exclude", "excuse", "execute", "exercise", "exhaust", "exhibit", "exile", "exist", "exit", "exotic", "expand", "expect", "expire", "explain", "expose", "express", "extend", "extra", "eye", "eyebrow", "fabric", "face", "faculty", "fade", "faint", "faith", "fall", "false", "fame", "family", "famous", "fan", "fancy", "fantasy", "farm", "fashion", "fat", "fatal", "father", "fatigue", "fault", "favorite", "feature", "february", "federal", "fee", "feed", "feel", "female", "fence", "festival", "fetch", "fever", "few", "fiber", "fiction", "field", "figure", "file", "film", "filter", "final", "find", "fine", "finger", "finish", "fire", "firm", "first", "fiscal", "fish", "fit", "fitness", "fix", "flag", "flame", "flash", "flat", "flavor", "flee", "flight", "flip", "float", "flock", "floor", "flower", "fluid", "flush", "fly", "foam", "focus", "fog", "foil", "fold", "follow", "food", "foot", "force", "forest", "forget", "fork", "fortune", "forum", "forward", "fossil", "foster", "found", "fox", "fragile", "frame", "frequent", "fresh", "friend", "fringe", "frog", "front", "frost", "frown", "frozen", "fruit", "fuel", "fun", "funny", "furnace", "fury", "future", "gadget", "gain", "galaxy", "gallery", "game", "gap", "garage", "garbage", "garden", "garlic", "garment", "gas", "gasp", "gate", "gather", "gauge", "gaze", "general", "genius", "genre", "gentle", "genuine", "gesture", "ghost", "giant", "gift", "giggle", "ginger", "giraffe", "girl", "give", "glad", "glance", "glare", "glass", "glide", "glimpse", "globe", "gloom", "glory", "glove", "glow", "glue", "goat", "goddess", "gold", "good", "goose", "gorilla", "gospel", "gossip", "govern", "gown", "grab", "grace", "grain", "grant", "grape", "grass", "gravity", "great", "green", "grid", "grief", "grit", "grocery", "group", "grow", "grunt", "guard", "guess", "guide", "guilt", "guitar", "gun", "gym", "habit", "hair", "half", "hammer", "hamster", "hand", "happy", "harbor", "hard", "harsh", "harvest", "hat", "have", "hawk", "hazard", "head", "health", "heart", "heavy", "hedgehog", "height", "hello", "helmet", "help", "hen", "hero", "hidden", "high", "hill", "hint", "hip", "hire", "history", "hobby", "hockey", "hold", "hole", "holiday", "hollow", "home", "honey", "hood", "hope", "horn", "horror", "horse", "hospital", "host", "hotel", "hour", "hover", "hub", "huge", "human", "humble", "humor", "hundred", "hungry", "hunt", "hurdle", "hurry", "hurt", "husband", "hybrid", "ice", "icon", "idea", "identify", "idle", "ignore", "ill", "illegal", "illness", "image", "imitate", "immense", "immune", "impact", "impose", "improve", "impulse", "inch", "include", "income", "increase", "index", "indicate", "indoor", "industry", "infant", "inflict", "inform", "inhale", "inherit", "initial", "inject", "injury", "inmate", "inner", "innocent", "input", "inquiry", "insane", "insect", "inside", "inspire", "install", "intact", "interest", "into", "invest", "invite", "involve", "iron", "island", "isolate", "issue", "item", "ivory", "jacket", "jaguar", "jar", "jazz", "jealous", "jeans", "jelly", "jewel", "job", "join", "joke", "journey", "joy", "judge", "juice", "jump", "jungle", "junior", "junk", "just", "kangaroo", "keen", "keep", "ketchup", "key", "kick", "kid", "kidney", "kind", "kingdom", "kiss", "kit", "kitchen", "kite", "kitten", "kiwi", "knee", "knife", "knock", "know", "lab", "label", "labor", "ladder", "lady", "lake", "lamp", "language", "laptop", "large", "later", "latin", "laugh", "laundry", "lava", "law", "lawn", "lawsuit", "layer", "lazy", "leader", "leaf", "learn", "leave", "lecture", "left", "leg", "legal", "legend", "leisure", "lemon", "lend", "length", "lens", "leopard", "lesson", "letter", "level", "liar", "liberty", "library", "license", "life", "lift", "light", "like", "limb", "limit", "link", "lion", "liquid", "list", "little", "live", "lizard", "load", "loan", "lobster", "local", "lock", "logic", "lonely", "long", "loop", "lottery", "loud", "lounge", "love", "loyal", "lucky", "luggage", "lumber", "lunar", "lunch", "luxury", "lyrics", "machine", "mad", "magic", "magnet", "maid", "mail", "main", "major", "make", "mammal", "man", "manage", "mandate", "mango", "mansion", "manual", "maple", "marble", "march", "margin", "marine", "market", "marriage", "mask", "mass", "master", "match", "material", "math", "matrix", "matter", "maximum", "maze", "meadow", "mean", "measure", "meat", "mechanic", "medal", "media", "melody", "melt", "member", "memory", "mention", "menu", "mercy", "merge", "merit", "merry", "mesh", "message", "metal", "method", "middle", "midnight", "milk", "million", "mimic", "mind", "minimum", "minor", "minute", "miracle", "mirror", "misery", "miss", "mistake", "mix", "mixed", "mixture", "mobile", "model", "modify", "mom", "moment", "monitor", "monkey", "monster", "month", "moon", "moral", "more", "morning", "mosquito", "mother", "motion", "motor", "mountain", "mouse", "move", "movie", "much", "muffin", "mule", "multiply", "muscle", "museum", "mushroom", "music", "must", "mutual", "myself", "mystery", "myth", "naive", "name", "napkin", "narrow", "nasty", "nation", "nature", "near", "neck", "need", "negative", "neglect", "neither", "nephew", "nerve", "nest", "net", "network", "neutral", "never", "news", "next", "nice", "night", "noble", "noise", "nominee", "noodle", "normal", "north", "nose", "notable", "note", "nothing", "notice", "novel", "now", "nuclear", "number", "nurse", "nut", "oak", "obey", "object", "oblige", "obscure", "observe", "obtain", "obvious", "occur", "ocean", "october", "odor", "off", "offer", "office", "often", "oil", "okay", "old", "olive", "olympic", "omit", "once", "one", "onion", "online", "only", "open", "opera", "opinion", "oppose", "option", "orange", "orbit", "orchard", "order", "ordinary", "organ", "orient", "original", "orphan", "ostrich", "other", "outdoor", "outer", "output", "outside", "oval", "oven", "over", "own", "owner", "oxygen", "oyster", "ozone", "pact", "paddle", "page", "pair", "palace", "palm", "panda", "panel", "panic", "panther", "paper", "parade", "parent", "park", "parrot", "party", "pass", "patch", "path", "patient", "patrol", "pattern", "pause", "pave", "payment", "peace", "peanut", "pear", "peasant", "pelican", "pen", "penalty", "pencil", "people", "pepper", "perfect", "permit", "person", "pet", "phone", "photo", "phrase", "physical", "piano", "picnic", "picture", "piece", "pig", "pigeon", "pill", "pilot", "pink", "pioneer", "pipe", "pistol", "pitch", "pizza", "place", "planet", "plastic", "plate", "play", "please", "pledge", "pluck", "plug", "plunge", "poem", "poet", "point", "polar", "pole", "police", "pond", "pony", "pool", "popular", "portion", "position", "possible", "post", "potato", "pottery", "poverty", "powder", "power", "practice", "praise", "predict", "prefer", "prepare", "present", "pretty", "prevent", "price", "pride", "primary", "print", "priority", "prison", "private", "prize", "problem", "process", "produce", "profit", "program", "project", "promote", "proof", "property", "prosper", "protect", "proud", "provide", "public", "pudding", "pull", "pulp", "pulse", "pumpkin", "punch", "pupil", "puppy", "purchase", "purity", "purpose", "purse", "push", "put", "puzzle", "pyramid", "quality", "quantum", "quarter", "question", "quick", "quit", "quiz", "quote", "rabbit", "raccoon", "race", "rack", "radar", "radio", "rail", "rain", "raise", "rally", "ramp", "ranch", "random", "range", "rapid", "rare", "rate", "rather", "raven", "raw", "razor", "ready", "real", "reason", "rebel", "rebuild", "recall", "receive", "recipe", "record", "recycle", "reduce", "reflect", "reform", "refuse", "region", "regret", "regular", "reject", "relax", "release", "relief", "rely", "remain", "remember", "remind", "remove", "render", "renew", "rent", "reopen", "repair", "repeat", "replace", "report", "require", "rescue", "resemble", "resist", "resource", "response", "result", "retire", "retreat", "return", "reunion", "reveal", "review", "reward", "rhythm", "rib", "ribbon", "rice", "rich", "ride", "ridge", "rifle", "right", "rigid", "ring", "riot", "ripple", "risk", "ritual", "rival", "river", "road", "roast", "robot", "robust", "rocket", "romance", "roof", "rookie", "room", "rose", "rotate", "rough", "round", "route", "royal", "rubber", "rude", "rug", "rule", "run", "runway", "rural", "sad", "saddle", "sadness", "safe", "sail", "salad", "salmon", "salon", "salt", "salute", "same", "sample", "sand", "satisfy", "satoshi", "sauce", "sausage", "save", "say", "scale", "scan", "scare", "scatter", "scene", "scheme", "school", "science", "scissors", "scorpion", "scout", "scrap", "screen", "script", "scrub", "sea", "search", "season", "seat", "second", "secret", "section", "security", "seed", "seek", "segment", "select", "sell", "seminar", "senior", "sense", "sentence", "series", "service", "session", "settle", "setup", "seven", "shadow", "shaft", "shallow", "share", "shed", "shell", "sheriff", "shield", "shift", "shine", "ship", "shiver", "shock", "shoe", "shoot", "shop", "short", "shoulder", "shove", "shrimp", "shrug", "shuffle", "shy", "sibling", "sick", "side", "siege", "sight", "sign", "silent", "silk", "silly", "silver", "similar", "simple", "since", "sing", "siren", "sister", "situate", "six", "size", "skate", "sketch", "ski", "skill", "skin", "skirt", "skull", "slab", "slam", "sleep", "slender", "slice", "slide", "slight", "slim", "slogan", "slot", "slow", "slush", "small", "smart", "smile", "smoke", "smooth", "snack", "snake", "snap", "sniff", "snow", "soap", "soccer", "social", "sock", "soda", "soft", "solar", "soldier", "solid", "solution", "solve", "someone", "song", "soon", "sorry", "sort", "soul", "sound", "soup", "source", "south", "space", "spare", "spatial", "spawn", "speak", "special", "speed", "spell", "spend", "sphere", "spice", "spider", "spike", "spin", "spirit", "split", "spoil", "sponsor", "spoon", "sport", "spot", "spray", "spread", "spring", "spy", "square", "squeeze", "squirrel", "stable", "stadium", "staff", "stage", "stairs", "stamp", "stand", "start", "state", "stay", "steak", "steel", "stem", "step", "stereo", "stick", "still", "sting", "stock", "stomach", "stone", "stool", "story", "stove", "strategy", "street", "strike", "strong", "struggle", "student", "stuff", "stumble", "style", "subject", "submit", "subway", "success", "such", "sudden", "suffer", "sugar", "suggest", "suit", "summer", "sun", "sunny", "sunset", "super", "supply", "supreme", "sure", "surface", "surge", "surprise", "surround", "survey", "suspect", "sustain", "swallow", "swamp", "swap", "swarm", "swear", "sweet", "swift", "swim", "swing", "switch", "sword", "symbol", "symptom", "syrup", "system", "table", "tackle", "tag", "tail", "talent", "talk", "tank", "tape", "target", "task", "taste", "tattoo", "taxi", "teach", "team", "tell", "ten", "tenant", "tennis", "tent", "term", "test", "text", "thank", "that", "theme", "then", "theory", "there", "they", "thing", "this", "thought", "three", "thrive", "throw", "thumb", "thunder", "ticket", "tide", "tiger", "tilt", "timber", "time", "tiny", "tip", "tired", "tissue", "title", "toast", "tobacco", "today", "toddler", "toe", "together", "toilet", "token", "tomato", "tomorrow", "tone", "tongue", "tonight", "tool", "tooth", "top", "topic", "topple", "torch", "tornado", "tortoise", "toss", "total", "tourist", "toward", "tower", "town", "toy", "track", "trade", "traffic", "tragic", "train", "transfer", "trap", "trash", "travel", "tray", "treat", "tree", "trend", "trial", "tribe", "trick", "trigger", "trim", "trip", "trophy", "trouble", "truck", "true", "truly", "trumpet", "trust", "truth", "try", "tube", "tuition", "tumble", "tuna", "tunnel", "turkey", "turn", "turtle", "twelve", "twenty", "twice", "twin", "twist", "two", "type", "typical", "ugly", "umbrella", "unable", "unaware", "uncle", "uncover", "under", "undo", "unfair", "unfold", "unhappy", "uniform", "unique", "unit", "universe", "unknown", "unlock", "until", "unusual", "unveil", "update", "upgrade", "uphold", "upon", "upper", "upset", "urban", "urge", "usage", "use", "used", "useful", "useless", "usual", "utility", "vacant", "vacuum", "vague", "valid", "valley", "valve", "van", "vanish", "vapor", "various", "vast", "vault", "vehicle", "velvet", "vendor", "venture", "venue", "verb", "verify", "version", "very", "vessel", "veteran", "viable", "vibrant", "vicious", "victory", "video", "view", "village", "vintage", "violin", "virtual", "virus", "visa", "visit", "visual", "vital", "vivid", "vocal", "voice", "void", "volcano", "volume", "vote", "voyage", "wage", "wagon", "wait", "walk", "wall", "walnut", "want", "warfare", "warm", "warrior", "wash", "wasp", "waste", "water", "wave", "way", "wealth", "weapon", "wear", "weasel", "weather", "web", "wedding", "weekend", "weird", "welcome", "west", "wet", "whale", "what", "wheat", "wheel", "when", "where", "whip", "whisper", "wide", "width", "wife", "wild", "will", "win", "window", "wine", "wing", "wink", "winner", "winter", "wire", "wisdom", "wise", "wish", "witness", "wolf", "woman", "wonder", "wood", "wool", "word", "work", "world", "worry", "worth", "wrap", "wreck", "wrestle", "wrist", "write", "wrong", "yard", "year", "yellow", "you", "young", "youth", "zebra", "zero", "zone", "zoo"
];

// Available chains - will be extended with user-added chains
const chains = {
  '0x1': mainnet,
  '0xaa36a7': sepolia // Sepolia chainId
};

// Default to Sepolia for testing
const DEFAULT_CHAIN_ID = '0xaa36a7';

// HD Wallet derivation path for Ethereum (BIP-44)
const HD_PATH = "m/44'/60'/0'/0/";

// Default account name prefix
const DEFAULT_ACCOUNT_NAME = "Account";

// Storage key for wallet state
const WALLET_STORAGE_KEY = 'walletState';

// Storage key for active account
const ACTIVE_ACCOUNT_KEY = 'activeAccount';

// Storage structure for wallet encryption status
const WALLET_ENCRYPTION_STATUS_KEY = 'walletEncryptionStatus';

// Get all chains from storage
async function getSavedChains() {
  try {
    const { userChains } = await browser.storage.local.get('userChains');
    return userChains || {};
  } catch (error) {
    console.error('Error getting user chains:', error);
    return {};
  }
}

// Load all chains (built-in + user-added)
async function loadAllChains() {
  const userChains = await getSavedChains();
  return { ...chains, ...userChains };
}

// Get the current chain from storage or use default
async function getCurrentChain() {
  try {
    const { chainId } = await browser.storage.local.get('chainId');
    const allChains = await loadAllChains();
    return allChains[chainId || DEFAULT_CHAIN_ID] || sepolia;
  } catch (error) {
    console.error('Error getting chain:', error);
    return sepolia;
  }
}

// Set the current chain
async function setCurrentChain(chainId) {
  const allChains = await loadAllChains();
  if (allChains[chainId]) {
    await browser.storage.local.set({ chainId });
    return allChains[chainId];
  }
  throw new Error(`Unsupported chain ID: ${chainId}`);
}

// Generate random bytes for entropy
function getRandomBytes(n) {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return bytes;
}

// Calculate checksum from entropy
function calculateChecksum(entropy) {
  // For BIP39, the checksum is the first n bits of the SHA-256 hash of the entropy
  // where n is entropy.length * 8 / 32
  const entropyBits = entropy.length * 8;
  const checksumBits = entropyBits / 32;
  
  // Hash the entropy
  const entropyArray = Array.from(entropy);
  const entropyHex = entropyArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Simple SHA-256 approximation for demo purposes (in production use a proper SHA-256 implementation)
  // This is just to avoid dependencies, in real code use an actual crypto library
  const hashHex = entropyHex.split('').reduce((a, b) => {
    const code = a.charCodeAt(0) ^ b.charCodeAt(0);
    return String.fromCharCode(code);
  }, '\0').repeat(32);
  
  // Convert the first byte of our simplified hash to a number for the checksum
  const checksumByte = hashHex.charCodeAt(0);
  
  return checksumByte >> (8 - checksumBits);
}

// Convert entropy to mnemonic
function entropyToMnemonic(entropy) {
  const entropyBits = entropy.length * 8;
  const checksumBits = entropyBits / 32;
  const totalBits = entropyBits + checksumBits;
  const wordCount = totalBits / 11;
  
  // Calculate checksum
  const checksum = calculateChecksum(entropy);
  
  // Convert entropy bytes to bits and add checksum
  let bits = '';
  for (let i = 0; i < entropy.length; i++) {
    bits += entropy[i].toString(2).padStart(8, '0');
  }
  bits += checksum.toString(2).padStart(checksumBits, '0');
  
  // Split into 11-bit chunks and convert to words
  const words = [];
  for (let i = 0; i < wordCount; i++) {
    const startBit = i * 11;
    const wordBits = bits.substring(startBit, startBit + 11);
    const wordIndex = parseInt(wordBits, 2);
    words.push(ENGLISH_WORDLIST[wordIndex]);
  }
  
  return words.join(' ');
}

// Generate a secure random mnemonic (12 words by default)
function generateMnemonic() {
  const entropy = getRandomBytes(MNEMONIC_ENTROPY_BYTES);
  return entropyToMnemonic(entropy);
}

// Generate a secure random private key
function generatePrivateKey() {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return '0x' + Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Validate a mnemonic
function validateMnemonic(mnemonic) {
  // Basic validation - check if all words are in wordlist
  const words = mnemonic.trim().split(/\s+/);
  return words.length >= 12 && words.length <= 24 && 
         words.length % 3 === 0 && 
         words.every(word => ENGLISH_WORDLIST.includes(word));
}

// Derive private key from mnemonic and index - simple implementation for demo
// In a real wallet, use proper BIP39/32/44 libraries
function derivePrivateKey(mnemonic, index = 0) {
  // Verify the mnemonic is valid before proceeding
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic phrase');
  }
  
  // For demonstration, we'll generate a deterministic private key from the mnemonic and index
  // This is NOT a proper BIP39/44 implementation, just a placeholder
  const words = mnemonic.trim().split(/\s+/);
  
  // Create a deterministic seed by concatenating words with the index
  const seedStr = words.join('') + index.toString();
  
  // Convert to byte array and generate a private key
  const seed = new TextEncoder().encode(seedStr);
  
  // Use a hash-like function to get 32 bytes
  const privateKeyBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    // Simple hash algorithm for demo purposes (not secure)
    privateKeyBytes[i] = seed[i % seed.length] ^ seed[(i * 7) % seed.length] ^ seed[(i * 13) % seed.length];
  }
  
  return '0x' + Array.from(privateKeyBytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Check if wallet is initialized
async function isWalletInitialized() {
  try {
    const { walletEncryptionStatus } = await browser.storage.local.get(WALLET_ENCRYPTION_STATUS_KEY);
    return !!walletEncryptionStatus;
  } catch (error) {
    console.error('Error checking wallet status:', error);
    return false;
  }
}

// Check if wallet is locked
async function isWalletLocked() {
  try {
    const { walletEncryptionStatus } = await browser.storage.local.get(WALLET_ENCRYPTION_STATUS_KEY);
    return walletEncryptionStatus === 'locked';
  } catch (error) {
    console.error('Error checking wallet lock status:', error);
    return true; // Default to locked if error
  }
}

// Delete wallet data (for reset or recovery)
async function deleteWalletData() {
  try {
    // Remove all wallet-related data from storage
    await browser.storage.local.remove([
      WALLET_STORAGE_KEY,
      ACTIVE_ACCOUNT_KEY,
      WALLET_ENCRYPTION_STATUS_KEY
    ]);
    
    console.log('Wallet data deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting wallet data:', error);
    throw new Error(`Failed to delete wallet data: ${error.message}`);
  }
}

// Initialize wallet with password
async function initializeWallet(password, mnemonic = null, forceReset = false) {
  try {
    console.log('Initializing wallet with' + (mnemonic ? ' provided' : ' generated') + ' mnemonic');
    
    // If forceReset is true, delete existing wallet data first
    if (forceReset) {
      console.log('Force reset requested, deleting existing wallet data');
      await deleteWalletData();
    } else {
      // Check if wallet already exists
      const isInitialized = await isWalletInitialized();
      if (isInitialized) {
        console.warn('Wallet is already initialized');
        throw new Error('Wallet is already initialized. Use forceReset to override.');
      }
    }
    
    // Generate mnemonic if not provided
    if (!mnemonic) {
      mnemonic = generateMnemonic();
      console.log('Generated new mnemonic');
    } else {
      console.log('Using provided mnemonic');
    }
    
    // Derive first account
    const privateKey = derivePrivateKey(mnemonic, 0);
    console.log('Derived private key for first account');
    
    const account = privateKeyToAccount(privateKey);
    console.log('Created account from private key:', account.address);
    
    // Initial wallet state
    const walletState = {
      mnemonic,
      accounts: [{
        address: account.address,
        index: 0,
        name: `${DEFAULT_ACCOUNT_NAME} 1`,
        balance: '0',
        tokens: []
      }],
      accountCount: 1,
      customAccounts: [], // For imported private keys
      lastBackup: null
    };
    
    console.log('Created initial wallet state with 1 account');
    
    // Encrypt wallet state with password
    console.log('Encrypting wallet with password');
    const encryptedWallet = await passworder.encrypt(password, walletState);
    
    // Save encrypted wallet
    console.log('Saving encrypted wallet and setting active account to 0');
    await browser.storage.local.set({ 
      [WALLET_STORAGE_KEY]: encryptedWallet,
      [ACTIVE_ACCOUNT_KEY]: 0, // First account is active by default
      [WALLET_ENCRYPTION_STATUS_KEY]: 'unlocked'
    });
    
    // Return the initialized wallet state
    console.log('Wallet initialization complete');
    
    // Emit an event to notify that accounts have changed
    await emitEvent('accountsChanged', [account.address]);
    
    return walletState;
  } catch (error) {
    console.error('Error initializing wallet:', error);
    throw new Error(`Failed to initialize wallet: ${error.message}`);
  }
}

// Lock the wallet
async function lockWallet() {
  try {
    await browser.storage.local.set({ [WALLET_ENCRYPTION_STATUS_KEY]: 'locked' });
    return true;
  } catch (error) {
    console.error('Error locking wallet:', error);
    throw new Error(`Failed to lock wallet: ${error.message}`);
  }
}

// Unlock wallet with password
async function unlockWallet(password) {
  try {
    const { [WALLET_STORAGE_KEY]: encryptedWallet } = await browser.storage.local.get(WALLET_STORAGE_KEY);
    
    if (!encryptedWallet) {
      throw new Error('Wallet not found. Initialize wallet first.');
    }
    
    // Try to decrypt the wallet state
    try {
      const walletState = await passworder.decrypt(password, encryptedWallet);
      
      // If decryption succeeds, set wallet to unlocked
      await browser.storage.local.set({ [WALLET_ENCRYPTION_STATUS_KEY]: 'unlocked' });
      
      // Get the accounts to emit in the accountsChanged event
      let accounts = [];
      if (walletState.accounts && walletState.accounts.length > 0) {
        accounts = walletState.accounts.map(acc => acc.address);
      }
      
      // Emit accountsChanged event to notify dApps about available accounts
      await emitEvent('accountsChanged', accounts);
      
      return walletState;
    } catch (e) {
      throw new Error('Incorrect password');
    }
  } catch (error) {
    console.error('Error unlocking wallet:', error);
    throw new Error(`Failed to unlock wallet: ${error.message}`);
  }
}

// Get the wallet state (requires wallet to be unlocked)
async function getWalletState() {
  try {
    // Check if wallet is locked
    const isLocked = await isWalletLocked();
    if (isLocked) {
      throw new Error('Wallet is locked. Unlock with password first.');
    }
    
    // Get encrypted wallet state
    const { [WALLET_STORAGE_KEY]: encryptedWallet } = await browser.storage.local.get(WALLET_STORAGE_KEY);
    
    if (!encryptedWallet) {
      throw new Error('Wallet not initialized');
    }
    
    // We don't need to decrypt since we know it's unlocked
    // We'll pass the encrypted value through and let other functions handle decryption
    return encryptedWallet;
  } catch (error) {
    console.error('Error getting wallet state:', error);
    throw new Error(`Failed to access wallet: ${error.message}`);
  }
}

// Save wallet state (requires wallet to be unlocked)
async function saveWalletState(walletState, password) {
  try {
    // Check if wallet is locked
    const isLocked = await isWalletLocked();
    if (isLocked) {
      throw new Error('Wallet is locked. Unlock with password first.');
    }
    
    // Encrypt the updated wallet state
    const encryptedWallet = await passworder.encrypt(password, walletState);
    
    // Save encrypted wallet
    await browser.storage.local.set({ [WALLET_STORAGE_KEY]: encryptedWallet });
    
    return true;
  } catch (error) {
    console.error('Error saving wallet state:', error);
    throw new Error(`Failed to save wallet state: ${error.message}`);
  }
}

// Get the active account index
async function getActiveAccountIndex() {
  try {
    const { [ACTIVE_ACCOUNT_KEY]: activeIndex } = await browser.storage.local.get(ACTIVE_ACCOUNT_KEY);
    return activeIndex !== undefined ? activeIndex : 0;
  } catch (error) {
    console.error('Error getting active account index:', error);
    return 0; // Default to first account
  }
}

// Set the active account index
async function setActiveAccountIndex(index) {
  try {
    await browser.storage.local.set({ [ACTIVE_ACCOUNT_KEY]: index });
    await emitEvent('accountsChanged', null); // Will trigger a refresh of accounts
    return true;
  } catch (error) {
    console.error('Error setting active account index:', error);
    throw new Error(`Failed to set active account: ${error.message}`);
  }
}

// Add a new account from seed (requires wallet to be unlocked)
async function addAccountFromSeed(password, name = null) {
  try {
    // Check if wallet is locked
    const isLocked = await isWalletLocked();
    if (isLocked) {
      throw new Error('Wallet is locked. Unlock with password first.');
    }
    
    // Get encrypted wallet
    const encryptedWallet = await getWalletState();
    console.log('Got encrypted wallet state for adding account');
    
    // Decrypt wallet
    let walletState;
    try {
      walletState = await passworder.decrypt(password, encryptedWallet);
      console.log('Successfully decrypted wallet for adding account');
    } catch (decryptError) {
      console.error('Failed to decrypt wallet for adding account:', decryptError);
      throw new Error('Failed to decrypt wallet: ' + decryptError.message);
    }
    
    // Validate wallet state
    if (!walletState || typeof walletState !== 'object') {
      throw new Error('Invalid wallet state structure');
    }
    
    if (!walletState.mnemonic) {
      throw new Error('Wallet data corruption: missing mnemonic');
    }
    
    if (!walletState.accounts || !Array.isArray(walletState.accounts)) {
      console.warn('Wallet missing accounts array, initializing');
      walletState.accounts = [];
    }
    
    // Get new account index
    const newIndex = walletState.accountCount || walletState.accounts.length;
    console.log('Creating new account with index:', newIndex);
    
    // Derive new private key
    try {
      const privateKey = derivePrivateKey(walletState.mnemonic, newIndex);
      console.log('Derived new private key for account');
      
      const account = privateKeyToAccount(privateKey);
      console.log('Created account from private key:', account.address);
      
      // Add new account to wallet
      walletState.accounts.push({
        address: account.address,
        index: newIndex,
        name: name || `${DEFAULT_ACCOUNT_NAME} ${newIndex + 1}`,
        balance: '0',
        tokens: []
      });
      
      // Update account count
      walletState.accountCount = newIndex + 1;
      
      // Save updated wallet state
      await saveWalletState(walletState, password);
      console.log('Saved updated wallet state with new account');
      
      // Return the new account
      return {
        address: account.address,
        index: newIndex,
        name: name || `${DEFAULT_ACCOUNT_NAME} ${newIndex + 1}`
      };
    } catch (derivationError) {
      console.error('Error deriving new account:', derivationError);
      throw new Error('Failed to create new account: ' + derivationError.message);
    }
  } catch (error) {
    console.error('Error adding account from seed:', error);
    throw new Error(`Failed to add account: ${error.message}`);
  }
}

// Import account from private key (requires wallet to be unlocked)
async function importPrivateKey(privateKey, name, password) {
  try {
    // Check if wallet is locked
    const isLocked = await isWalletLocked();
    if (isLocked) {
      throw new Error('Wallet is locked. Unlock with password first.');
    }
    
    // Validate the private key format
    if (!privateKey.startsWith('0x')) {
      privateKey = '0x' + privateKey;
    }
    
    // Ensure it's the correct length
    if (privateKey.length !== 66) { // 0x + 64 hex chars
      throw new Error('Invalid private key length');
    }
    
    // Check that it's a valid hex string
    if (!/^0x[0-9a-f]{64}$/i.test(privateKey)) {
      throw new Error('Invalid private key format');
    }
    
    // Create account from private key
    const account = privateKeyToAccount(privateKey);
    
    // Get encrypted wallet
    const encryptedWallet = await getWalletState();
    
    // Decrypt wallet
    const walletState = await passworder.decrypt(password, encryptedWallet);
    
    // Check if account already exists
    const existingAccount = [...walletState.accounts, ...walletState.customAccounts].find(
      acc => acc.address.toLowerCase() === account.address.toLowerCase()
    );
    
    if (existingAccount) {
      throw new Error('Account already exists in wallet');
    }
    
    // Add to custom accounts
    const customIndex = walletState.customAccounts.length;
    
    walletState.customAccounts.push({
      address: account.address,
      index: customIndex,
      name: name || `Imported ${customIndex + 1}`,
      privateKey, // Store the private key for imported accounts
      balance: '0',
      tokens: []
    });
    
    // Save updated wallet state
    await saveWalletState(walletState, password);
    
    // Return the imported account info
    return {
      address: account.address,
      index: customIndex,
      name: name || `Imported ${customIndex + 1}`,
      type: 'imported'
    };
  } catch (error) {
    console.error('Error importing private key:', error);
    throw new Error(`Failed to import account: ${error.message}`);
  }
}

// Get accounts list (requires wallet to be unlocked)
async function getAccounts(password = null) {
  try {
    console.log('getAccounts called with password:', password ? 'provided' : 'not provided');
    
    // Check if wallet is locked and no password provided
    const isLocked = await isWalletLocked();
    console.log('Wallet locked status:', isLocked);
    
    if (isLocked && !password) {
      console.warn('Wallet is locked and no password provided');
      throw new Error('Wallet is locked. Unlock with password first.');
    }
    
    // Get encrypted wallet
    const { [WALLET_STORAGE_KEY]: encryptedWallet } = await browser.storage.local.get(WALLET_STORAGE_KEY);
    
    if (!encryptedWallet) {
      console.error('Wallet not initialized in getAccounts');
      throw new Error('Wallet not initialized');
    }
    
    // Decrypt wallet if password provided or already unlocked
    let walletState;
    try {
      if (password) {
        console.log('Decrypting wallet with provided password');
        walletState = await passworder.decrypt(password, encryptedWallet);
        console.log('Wallet decryption successful, setting status to unlocked');
        // If we successfully decrypted with provided password, set wallet as unlocked
        await browser.storage.local.set({ [WALLET_ENCRYPTION_STATUS_KEY]: 'unlocked' });
      } else {
        console.log('Decrypting already unlocked wallet');
        // Must be unlocked already
        walletState = await passworder.decrypt(null, encryptedWallet);
        console.log('Wallet decryption successful for unlocked wallet');
      }
    } catch (e) {
      console.error('Error decrypting wallet in getAccounts:', e);
      if (password) {
        throw new Error('Incorrect password');
      } else {
        throw new Error('Error decrypting wallet data');
      }
    }
    
    // Validate wallet state
    if (!walletState || typeof walletState !== 'object') {
      console.error('Invalid wallet state in getAccounts:', walletState);
      throw new Error('Invalid wallet data structure');
    }
    
    // Ensure accounts array exists
    if (!walletState.accounts || !Array.isArray(walletState.accounts)) {
      console.warn('Wallet missing accounts array, initializing empty array');
      walletState.accounts = [];
      
      // If we have a mnemonic but no accounts, try to create the first account
      if (walletState.mnemonic && password) {
        console.log('Found mnemonic but no accounts, creating first account');
        try {
          // Derive first account
          const privateKey = derivePrivateKey(walletState.mnemonic, 0);
          const account = privateKeyToAccount(privateKey);
          
          // Add first account
          walletState.accounts.push({
            address: account.address,
            index: 0,
            name: `${DEFAULT_ACCOUNT_NAME} 1`,
            balance: '0',
            tokens: []
          });
          
          walletState.accountCount = 1;
          console.log('First account created and added to wallet');
        } catch (accountError) {
          console.error('Error creating first account from mnemonic:', accountError);
        }
      }
      
      // Try to save the fixed wallet state if possible
      try {
        if (password) {
          console.log('Saving fixed wallet state with accounts array');
          const encryptedFixed = await passworder.encrypt(password, walletState);
          await browser.storage.local.set({ [WALLET_STORAGE_KEY]: encryptedFixed });
        }
      } catch (saveError) {
        console.error('Failed to save fixed wallet state:', saveError);
        // Continue anyway
      }
    } else {
      console.log(`Found ${walletState.accounts.length} accounts in wallet`);
    }
    
    // Ensure customAccounts array exists
    if (!walletState.customAccounts || !Array.isArray(walletState.customAccounts)) {
      console.warn('Wallet missing customAccounts array, initializing empty array');
      walletState.customAccounts = [];
      
      // Try to save the fixed wallet state if possible
      try {
        if (password) {
          console.log('Saving fixed wallet state with customAccounts array');
          const encryptedFixed = await passworder.encrypt(password, walletState);
          await browser.storage.local.set({ [WALLET_STORAGE_KEY]: encryptedFixed });
        }
      } catch (saveError) {
        console.error('Failed to save fixed wallet state:', saveError);
        // Continue anyway
      }
    } else {
      console.log(`Found ${walletState.customAccounts.length} imported accounts in wallet`);
    }
    
    // Combine all accounts (seed-derived and imported)
    const allAccounts = [
      ...(walletState.accounts || []).map(acc => ({
        ...acc,
        type: 'seed'
      })),
      ...(walletState.customAccounts || []).map(acc => ({
        ...acc,
        type: 'imported',
        privateKey: undefined // Don't expose private keys
      }))
    ];
    
    console.log(`Returning ${allAccounts.length} total accounts`);
    
    return allAccounts;
  } catch (error) {
    console.error('Error getting accounts:', error);
    throw new Error(`Failed to get accounts: ${error.message}`);
  }
}

// Get active account details
async function getActiveAccount() {
  try {
    // Check if wallet is initialized
    const initialized = await isWalletInitialized();
    if (!initialized) {
      throw new Error('Wallet not initialized');
    }
    
    // Check if wallet is locked
    const isLocked = await isWalletLocked();
    if (isLocked) {
      throw new Error('Wallet is locked');
    }
    
    // Get active account index
    const activeIndex = await getActiveAccountIndex();
    
    // Get encrypted wallet
    const encryptedWallet = await getWalletState();
    
    // Decrypt wallet
    let walletState;
    try {
      walletState = await passworder.decrypt(null, encryptedWallet);
    } catch (decryptError) {
      console.error('Error decrypting wallet state:', decryptError);
      throw new Error('Error decrypting wallet data. Try resetting your wallet if this persists.');
    }
    
    // Validate wallet state
    if (!walletState || typeof walletState !== 'object') {
      console.error('Invalid wallet state in getActiveAccount:', walletState);
      throw new Error('Invalid wallet data structure');
    }
    
    // Ensure accounts array exists
    if (!walletState.accounts || !Array.isArray(walletState.accounts)) {
      console.warn('Wallet missing accounts array in getActiveAccount, initializing empty array');
      walletState.accounts = [];
    }
    
    // Ensure customAccounts array exists
    if (!walletState.customAccounts || !Array.isArray(walletState.customAccounts)) {
      console.warn('Wallet missing customAccounts array in getActiveAccount, initializing empty array');
      walletState.customAccounts = [];
    }
    
    // If we have no accounts at all, return error
    if (walletState.accounts.length === 0 && walletState.customAccounts.length === 0) {
      throw new Error('No accounts found in wallet');
    }
    
    // Find account by index, checking both seed-derived and imported accounts
    if (walletState.accounts.length > 0 && activeIndex < walletState.accounts.length) {
      // It's a seed-derived account
      const account = walletState.accounts[activeIndex];
      return {
        ...account,
        type: 'seed'
      };
    } else if (walletState.customAccounts.length > 0) {
      // It's a custom imported account
      const customIndex = activeIndex - walletState.accounts.length;
      if (customIndex >= 0 && customIndex < walletState.customAccounts.length) {
        const account = walletState.customAccounts[customIndex];
        return {
          ...account,
          type: 'imported',
          privateKey: undefined // Don't expose private key
        };
      }
    }
    
    // If active index is invalid but we have accounts, return the first one
    if (walletState.accounts.length > 0) {
      console.warn(`Invalid active index ${activeIndex}, using first seed account instead`);
      await setActiveAccountIndex(0); // Auto-correct the active index
      return {
        ...walletState.accounts[0],
        type: 'seed'
      };
    } else if (walletState.customAccounts.length > 0) {
      console.warn(`Invalid active index ${activeIndex}, using first imported account instead`);
      await setActiveAccountIndex(walletState.accounts.length); // Auto-correct to first custom account
      return {
        ...walletState.customAccounts[0],
        type: 'imported',
        privateKey: undefined
      };
    }
    
    throw new Error('Active account not found');
  } catch (error) {
    console.error('Error getting active account:', error);
    throw error;
  }
}

// Get private key for active account (requires wallet to be unlocked)
async function getActivePrivateKey(password = null) {
  try {
    console.log('getActivePrivateKey called with password:', password ? 'provided' : 'not provided');
    
    // Check if wallet is locked and no password provided
    const isLocked = await isWalletLocked();
    console.log('Wallet locked status:', isLocked);
    
    if (isLocked && !password) {
      throw new Error('Wallet is locked. Unlock with password first.');
    }
    
    // Get active account index
    const activeIndex = await getActiveAccountIndex();
    console.log('Active account index:', activeIndex);
    
    // Get encrypted wallet
    const { [WALLET_STORAGE_KEY]: encryptedWallet } = await browser.storage.local.get(WALLET_STORAGE_KEY);
    
    if (!encryptedWallet) {
      throw new Error('Wallet not initialized');
    }
    
    // Decrypt wallet if password provided or already unlocked
    let walletState;
    try {
      if (password) {
        console.log('Attempting to decrypt wallet with provided password');
        walletState = await passworder.decrypt(password, encryptedWallet);
        console.log('Wallet decryption with password successful');
        // If we successfully decrypted with provided password, set wallet as unlocked
        await browser.storage.local.set({ [WALLET_ENCRYPTION_STATUS_KEY]: 'unlocked' });
      } else {
        console.log('Attempting to decrypt already unlocked wallet');
        // Must be unlocked already
        walletState = await passworder.decrypt(null, encryptedWallet);
        console.log('Wallet decryption successful for unlocked wallet');
      }
    } catch (e) {
      console.error('Error decrypting wallet:', e);
      if (password) {
        throw new Error('Incorrect password');
      } else {
        throw new Error('Error decrypting wallet data');
      }
    }
    
    // Validate wallet state
    if (!walletState || typeof walletState !== 'object') {
      console.error('Invalid wallet state:', walletState);
      throw new Error('Invalid wallet data structure');
    }
    
    // Ensure accounts array exists
    if (!walletState.accounts || !Array.isArray(walletState.accounts)) {
      console.warn('Wallet missing accounts array, initializing empty array');
      walletState.accounts = [];
    }
    
    // Ensure customAccounts array exists
    if (!walletState.customAccounts || !Array.isArray(walletState.customAccounts)) {
      console.warn('Wallet missing customAccounts array, initializing empty array');
      walletState.customAccounts = [];
    }
    
    console.log(`Wallet has ${walletState.accounts.length} seed accounts and ${walletState.customAccounts.length} custom accounts`);
    
    // Check if we have any accounts at all
    if (walletState.accounts.length === 0 && walletState.customAccounts.length === 0) {
      console.error('No accounts found in wallet');
      throw new Error('No accounts found in wallet');
    }
    
    // Find the private key based on account type
    if (walletState.accounts.length > 0 && activeIndex < walletState.accounts.length) {
      // It's a seed-derived account
      const account = walletState.accounts[activeIndex];
      console.log('Found seed-derived account:', account.address);
      
      // Check if we have a mnemonic to derive from
      if (!walletState.mnemonic) {
        console.error('Missing mnemonic in wallet state');
        throw new Error('Wallet data corruption: missing mnemonic for seed-derived accounts');
      }
      
      console.log('Deriving private key from mnemonic for account index:', account.index);
      return derivePrivateKey(walletState.mnemonic, account.index);
    } else if (walletState.customAccounts.length > 0) {
      // It's a custom imported account
      const customIndex = activeIndex - walletState.accounts.length;
      console.log('Checking custom account with index:', customIndex);
      
      if (customIndex >= 0 && customIndex < walletState.customAccounts.length) {
        const customAccount = walletState.customAccounts[customIndex];
        console.log('Found custom account:', customAccount.address);
        
        if (!customAccount.privateKey) {
          console.error('Missing private key for custom account');
          throw new Error('Wallet data corruption: missing private key for imported account');
        }
        
        console.log('Retrieved private key for custom account');
        return customAccount.privateKey;
      }
    }
    
    // If active index is invalid but we have accounts, auto-correct to first available account
    // This helps recover from incorrect active account index situations
    if (walletState.accounts.length > 0) {
      console.warn(`Invalid active index ${activeIndex}, auto-correcting to first seed account`);
      
      // Try to update the active account index for future requests
      try {
        await setActiveAccountIndex(0);
      } catch (error) {
        console.error('Failed to auto-correct active account index:', error);
        // Continue anyway to try and return a valid key
      }
      
      // Check if we have a mnemonic to derive from
      if (!walletState.mnemonic) {
        console.error('Missing mnemonic in wallet state');
        throw new Error('Wallet data corruption: missing mnemonic for seed-derived accounts');
      }
      
      console.log('Using first seed account as fallback');
      return derivePrivateKey(walletState.mnemonic, walletState.accounts[0].index);
    } else if (walletState.customAccounts.length > 0) {
      console.warn(`Invalid active index ${activeIndex}, auto-correcting to first imported account`);
      
      // Try to update the active account index for future requests
      try {
        await setActiveAccountIndex(walletState.accounts.length);
      } catch (error) {
        console.error('Failed to auto-correct active account index:', error);
        // Continue anyway to try and return a valid key
      }
      
      const customAccount = walletState.customAccounts[0];
      if (!customAccount.privateKey) {
        console.error('Missing private key for custom account');
        throw new Error('Wallet data corruption: missing private key for imported account');
      }
      
      console.log('Using first imported account as fallback');
      return customAccount.privateKey;
    }
    
    // If we get here, we couldn't find an account and auto-correction failed
    throw new Error('No accounts found in wallet or invalid account index');
  } catch (error) {
    console.error('Error getting active private key:', error);
    throw error;
  }
}

// Get the active account for signing
async function getActiveSigningAccount() {
  try {
    // Get the private key for active account
    console.log('Getting active signing account');
    const privateKey = await getActivePrivateKey();
    
    if (!privateKey) {
      console.error('Failed to retrieve private key');
      throw new Error('Failed to retrieve private key');
    }
    
    console.log('Successfully retrieved private key, creating account object');
    
    try {
      // Create account from private key
      const account = privateKeyToAccount(privateKey);
      console.log('Created signing account:', account.address);
      return account;
    } catch (accountError) {
      console.error('Error creating account from private key:', accountError);
      throw new Error('Failed to create account from private key: ' + accountError.message);
    }
  } catch (error) {
    console.error('Error getting signing account:', error);
    throw error;
  }
}

// Track consecutive getOrCreateAccount errors to detect patterns
let consecutiveGetAccountErrors = 0;
let lastGetAccountErrorTime = 0;
const ERROR_TRACKING_INTERVAL = 30000; // 30 seconds between error tracking resets

// Get account by index for transactions
async function getOrCreateAccount() {
  try {
    // Check if wallet is initialized
    const initialized = await isWalletInitialized();
    
    if (!initialized) {
      // Reset error counter for a different type of error
      consecutiveGetAccountErrors = 0;
      throw new Error('Wallet not initialized');
    }
    
    // Check if wallet is locked
    const isLocked = await isWalletLocked();
    if (isLocked) {
      // Track consecutive wallet locked errors
      const now = Date.now();
      
      // Reset counter if it's been a while since the last error
      if (now - lastGetAccountErrorTime > ERROR_TRACKING_INTERVAL) {
        consecutiveGetAccountErrors = 0;
      }
      
      consecutiveGetAccountErrors++;
      lastGetAccountErrorTime = now;
      
      // If we've seen many consecutive lock errors, there might be an issue with the lock state
      if (consecutiveGetAccountErrors > 10) {
        console.warn(`Detected ${consecutiveGetAccountErrors} consecutive wallet locked errors. Attempting to repair wallet state.`);
        
        // Try to correct wallet encryption status if it seems stuck
        try {
          // First, check if the wallet data exists but is marked as locked incorrectly
          const { [WALLET_STORAGE_KEY]: encryptedWallet } = await browser.storage.local.get(WALLET_STORAGE_KEY);
          
          if (encryptedWallet) {
            console.log('Wallet data exists. Attempting to correct locked state...');
            
            // If we can parse the wallet as JSON, it might be a decrypted wallet incorrectly marked as locked
            try {
              const walletData = JSON.parse(encryptedWallet);
              if (walletData.version === 'x-Eth-MPC-0.0.1' && walletData.data) {
                // This appears to be a wallet already in a decrypted state
                console.log('Found wallet data that appears to be in decrypted state');
                // Mark wallet as unlocked since the data is already accessible
                await browser.storage.local.set({ [WALLET_ENCRYPTION_STATUS_KEY]: 'unlocked' });
                console.log('Set wallet state to unlocked. Retrying account access...');
                // Try again now that we've reset the state
                return await getActiveSigningAccount();
              }
            } catch (parseError) {
              // Not JSON or other issue, do nothing
              console.log('Wallet data is not in plaintext format. Cannot auto-unlock.');
            }
          }
        } catch (repairError) {
          console.error('Error attempting to repair wallet state:', repairError);
        }
      }
      
      throw new Error('Wallet is locked');
    }
    
    // Reset error counter on success
    consecutiveGetAccountErrors = 0;
    
    try {
      return await getActiveSigningAccount();
    } catch (signingError) {
      console.error('Error getting active signing account:', signingError);
      
      // If wallet data is corrupted, suggest reset
      if (signingError.message.includes('missing') || 
          signingError.message.includes('undefined') ||
          signingError.message.includes('corruption')) {
        throw new Error('Wallet data appears to be corrupted. You may need to reset your wallet or restore from backup.');
      }
      
      throw signingError; // Re-throw the original error
    }
  } catch (error) {
    // Only log full errors occasionally to avoid console spam
    if (error.message !== 'Wallet is locked' || consecutiveGetAccountErrors <= 5 || 
        consecutiveGetAccountErrors % 10 === 0) { // Log every 10th error after the first 5
      console.error('Error accessing wallet:', error);
    }
    throw new Error('Failed to access wallet: ' + error.message);
  }
}

// Export wallet as encrypted JSON file
async function exportWallet(password) {
  try {
    // Check if wallet is initialized
    const initialized = await isWalletInitialized();
    if (!initialized) {
      throw new Error('Wallet not initialized');
    }
    
    // Get encrypted wallet
    const { [WALLET_STORAGE_KEY]: encryptedWallet } = await browser.storage.local.get(WALLET_STORAGE_KEY);
    
    if (!encryptedWallet) {
      throw new Error('Wallet not found');
    }
    
    // Try to decrypt with password to verify it's correct
    try {
      await passworder.decrypt(password, encryptedWallet);
    } catch (e) {
      throw new Error('Incorrect password');
    }
    
    // Create export file with metadata
    const exportData = {
      type: 'eth-fox-wallet-backup',
      version: 1,
      timestamp: Date.now(),
      data: encryptedWallet
    };
    
    // Return the export data
    return JSON.stringify(exportData);
  } catch (error) {
    console.error('Error exporting wallet:', error);
    throw new Error(`Failed to export wallet: ${error.message}`);
  }
}

// Import wallet from encrypted JSON file
async function importWallet(fileData, password) {
  try {
    // Parse the file data
    const importData = JSON.parse(fileData);
    
    // Validate the import data
    if (!importData.type || importData.type !== 'eth-fox-wallet-backup') {
      throw new Error('Invalid wallet backup file');
    }
    
    if (!importData.data) {
      throw new Error('No wallet data found in backup');
    }
    
    // Try to decrypt the wallet data with the provided password
    try {
      const walletState = await passworder.decrypt(password, importData.data);
      
      // Validate wallet state has required properties
      if (!walletState.mnemonic || !walletState.accounts || !Array.isArray(walletState.accounts)) {
        throw new Error('Invalid wallet data structure');
      }
      
      // Save the imported wallet
      await browser.storage.local.set({
        [WALLET_STORAGE_KEY]: importData.data,
        [ACTIVE_ACCOUNT_KEY]: 0, // Reset to first account
        [WALLET_ENCRYPTION_STATUS_KEY]: 'unlocked'
      });
      
      return {
        accounts: walletState.accounts.length,
        importedAccounts: walletState.customAccounts ? walletState.customAccounts.length : 0
      };
    } catch (e) {
      throw new Error('Invalid password or corrupted backup file');
    }
  } catch (error) {
    console.error('Error importing wallet:', error);
    throw new Error(`Failed to import wallet: ${error.message}`);
  }
}

// Get a public client for the current chain
async function getPublicClient() {
  const chain = await getCurrentChain();
  return createPublicClient({
    chain,
    transport: http()
  });
}

// Create wallet client with the account for the current chain
async function getWalletClient() {
  const account = await getOrCreateAccount();
  const chain = await getCurrentChain();
  
  return createWalletClient({
    account,
    chain,
    transport: http()
  });
}

// Handle wallet requests
async function handleRequest(method, params) {
  try {
    // Check initialization for most methods
    if (method !== 'wallet_initializeWallet' && 
        method !== 'wallet_isInitialized' &&
        method !== 'wallet_unlock') {
      
      const initialized = await isWalletInitialized();
      if (!initialized) {
        throw new Error('Wallet not initialized. Please initialize wallet first.');
      }
    }
    
    // Special handling for initialization methods
    if (method === 'wallet_initializeWallet') {
      const { password, mnemonic, forceReset } = params[0];
      return initializeWallet(password, mnemonic, forceReset);
    }
    
    if (method === 'wallet_resetWallet') {
      return deleteWalletData();
    }
    
    if (method === 'wallet_isInitialized') {
      return isWalletInitialized();
    }
    
    if (method === 'wallet_isLocked') {
      return isWalletLocked();
    }
    
    if (method === 'wallet_unlock') {
      const { password } = params[0];
      return unlockWallet(password);
    }
    
    if (method === 'wallet_lock') {
      return lockWallet();
    }
    
    // For all other methods, check if wallet is locked
    const walletLocked = await isWalletLocked();
    if (walletLocked && 
        method !== 'eth_chainId' && 
        method !== 'wallet_getChainInfo') {
      throw new Error('Wallet is locked. Please unlock first.');
    }
    
    // Initialize clients for methods that need them
    let walletClient, publicClient, account;
    
    if (method !== 'wallet_getAccounts' && 
        method !== 'wallet_addAccount' && 
        method !== 'wallet_importAccount' && 
        method !== 'wallet_exportWallet' && 
        method !== 'wallet_importWallet' && 
        method !== 'wallet_setActiveAccount') {
      
      try {
        walletClient = await getWalletClient();
        publicClient = await getPublicClient();
        account = walletClient.account;
      } catch (error) {
        if (method === 'eth_requestAccounts' || method === 'eth_accounts') {
          // For these methods, return empty array instead of error
          return [];
        }
        throw error;
      }
    }
    
    switch (method) {
      case 'eth_requestAccounts':
      case 'eth_accounts':
        // For eth_requestAccounts, we want to return the account address if available
        // If account is undefined (wallet locked), return empty array
        return account ? [account.address] : [];

      case 'eth_chainId':
        const chain = await getCurrentChain();
        return `0x${chain.id.toString(16)}`;
        
      case 'wallet_getChainInfo':
        // Return chain information including block explorer URL
        const requestedChainId = params[0];
        const allChains = await loadAllChains();
        const chainInfo = allChains[requestedChainId];
        if (chainInfo) {
          return {
            chainId: requestedChainId,
            name: chainInfo.name,
            blockExplorers: chainInfo.blockExplorers
          };
        }
        throw new Error(`Chain ${requestedChainId} not supported`);
      
      case 'wallet_getAccounts':
        const { password } = params[0] || {};
        return getAccounts(password);
        
      case 'wallet_addAccount':
        const { password: addPassword, name } = params[0];
        return addAccountFromSeed(addPassword, name);
        
      case 'wallet_importAccount':
        const { privateKey, name: importName, password: importPassword } = params[0];
        return importPrivateKey(privateKey, importName, importPassword);
        
      case 'wallet_setActiveAccount':
        const { index } = params[0];
        return setActiveAccountIndex(index);
        
      case 'wallet_exportWallet':
        const { password: exportPassword } = params[0];
        return exportWallet(exportPassword);
        
      case 'wallet_importWallet':
        const { fileData, password: importWalletPassword } = params[0];
        return importWallet(fileData, importWalletPassword);

      case 'eth_sendTransaction':
        // Add special handling for eth_sendTransaction with debugging
        const originalTxParams = params[0];
        const requestId = params[1]; // Optional request ID for identifying approval responses
        
        // Clone the transaction params to avoid modifying the original
        const txParams = { ...originalTxParams };
        
        // Debug transaction parameters - convert BigInt values to strings first
        console.log('Original transaction parameters:', safeStringify(txParams));
        
        try {
          // Get current chain info for displaying network context
          const currentChain = await getCurrentChain();
          
          // Prepare transaction data for approval UI
          let formattedValue = '0';
          let valueInEth = '0';
          
          // Format value if it exists
          if (txParams.value) {
            console.log('Transaction value:', txParams.value);
            console.log('Transaction value type:', typeof txParams.value);
            
            const valueBigInt = BigInt(txParams.value);
            formattedValue = valueBigInt.toString();
            valueInEth = (Number(valueBigInt) / 1e18).toFixed(6); // Convert to ETH for display
            
            // Update txParams with BigInt value for actual sending
            txParams.value = valueBigInt;
          }
          
          // Get gas parameters if not provided
          const publicClient = await getPublicClient();
          
          // 1. GAS ESTIMATION: Only estimate if not provided by caller
          let estimatedGas;
          if (!txParams.gas) {
            try {
              console.log('Estimating gas for transaction...');
              estimatedGas = await publicClient.estimateGas({
                to: txParams.to,
                from: txParams.from,
                value: txParams.value || undefined,
                data: txParams.data || '0x',
                nonce: txParams.nonce ? BigInt(txParams.nonce) : undefined
              });
              
              console.log('Estimated gas:', estimatedGas);
              
              // Add buffer to estimated gas (20% more) to be safe
              const gasWithBuffer = estimatedGas * 120n / 100n;
              txParams.gas = `0x${gasWithBuffer.toString(16)}`;
              console.log('Gas with buffer:', txParams.gas);
            } catch (error) {
              console.error('Gas estimation failed:', error);
              // If estimation fails, use a default gas limit that's reasonable for simple transfers
              if (!txParams.data || txParams.data === '0x') {
                // Simple ETH transfer - use standard 21000 gas
                txParams.gas = '0x5208'; // 21000 in hex
              } else {
                // Contract interaction - use higher default but still reasonable
                txParams.gas = '0x186A0'; // 100,000 in hex
              }
              console.log('Using default gas limit:', txParams.gas);
            }
          }
          
          // 2. GAS PRICE/FEE DATA: If not provided, get from network
          if (!txParams.maxFeePerGas && !txParams.maxPriorityFeePerGas && !txParams.gasPrice) {
            try {
              console.log('Getting fee data from network...');
              const feeData = await publicClient.estimateFeesPerGas();
              console.log('Fee data:', feeData);
              
              // Check if the network supports EIP-1559
              if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
                // For EIP-1559 networks
                txParams.maxFeePerGas = `0x${feeData.maxFeePerGas.toString(16)}`;
                txParams.maxPriorityFeePerGas = `0x${feeData.maxPriorityFeePerGas.toString(16)}`;
              } else if (feeData.gasPrice) {
                // For legacy networks
                txParams.gasPrice = `0x${feeData.gasPrice.toString(16)}`;
              }
            } catch (error) {
              console.error('Fee data estimation failed:', error);
              // If fee estimation fails, try to get gas price as fallback
              try {
                const gasPrice = await publicClient.getGasPrice();
                txParams.gasPrice = `0x${gasPrice.toString(16)}`;
                console.log('Using network gas price:', txParams.gasPrice);
              } catch (gasError) {
                console.error('Gas price fetch failed:', gasError);
                // Last resort - use a reasonable default gas price
                txParams.gasPrice = '0x' + (5000000000n).toString(16); // 5 Gwei
                console.log('Using default gas price:', txParams.gasPrice);
              }
            }
          }
          
          // 3. Get and set nonce if not provided
          if (!txParams.nonce) {
            try {
              console.log('Getting nonce for address:', txParams.from);
              const nonce = await publicClient.getTransactionCount({
                address: txParams.from
              });
              txParams.nonce = `0x${nonce.toString(16)}`;
              console.log('Using nonce:', txParams.nonce);
            } catch (error) {
              console.error('Error getting nonce:', error);
              // Nonce is important, but we'll let the node handle it if we can't get it
            }
          }
          
          // Convert any BigInt values to strings for safe serialization
          const safeTxParams = convertBigIntToString(txParams);
          
          // Log the fully prepared transaction parameters
          console.log('Prepared transaction parameters:', safeStringify(safeTxParams));
          
          // Create transaction approval request with estimated gas
          const approvalRequest = {
            id: requestId || `tx-${Date.now()}`,
            type: 'transaction',
            chainId: currentChain.id.toString(16).startsWith('0x') ? 
                    currentChain.id.toString(16) : 
                    `0x${currentChain.id.toString(16)}`,
            txParams: {
              ...safeTxParams,
              value: formattedValue, // Use string representation for approval UI
              gas: safeTxParams.gas || '0x0',
              gasPrice: safeTxParams.gasPrice || undefined,
              maxFeePerGas: safeTxParams.maxFeePerGas || undefined,
              maxPriorityFeePerGas: safeTxParams.maxPriorityFeePerGas || undefined
            },
            metadata: {
              networkName: currentChain.name,
              valueInEth,
              estimatedGasHex: txParams.gas || '0x0',
              estimatedGasDec: txParams.gas ? parseInt(txParams.gas, 16).toString() : '0',
              timestamp: Date.now()
            }
          };
          
          // Store the approval request
          await storeApprovalRequest(approvalRequest);
          
          // Wait for user approval
          const approvalResult = await waitForApproval(approvalRequest.id);
          
          if (!approvalResult.approved) {
            throw new Error('Transaction rejected by user');
          }
          
          // Send the transaction once approved
          console.log('Sending transaction with parameters:', safeStringify(txParams));
          
          // Prepare final transaction parameters for sending
          // viem expects specific types for certain fields
          const finalTxParams = {
            to: txParams.to,
            from: txParams.from,
            data: txParams.data || undefined,
            nonce: txParams.nonce ? parseInt(txParams.nonce, 16) : undefined,
          };
          
          // Handle value (BigInt)
          if (txParams.value) {
            finalTxParams.value = typeof txParams.value === 'bigint' 
              ? txParams.value 
              : BigInt(txParams.value);
          }
          
          // Handle gas (BigInt)
          if (txParams.gas) {
            finalTxParams.gas = typeof txParams.gas === 'bigint'
              ? txParams.gas
              : BigInt(parseInt(txParams.gas, 16));
          }
          
          // Handle fee data (EIP-1559 or legacy)
          if (txParams.maxFeePerGas && txParams.maxPriorityFeePerGas) {
            finalTxParams.maxFeePerGas = typeof txParams.maxFeePerGas === 'bigint'
              ? txParams.maxFeePerGas
              : BigInt(parseInt(txParams.maxFeePerGas, 16));
              
            finalTxParams.maxPriorityFeePerGas = typeof txParams.maxPriorityFeePerGas === 'bigint'
              ? txParams.maxPriorityFeePerGas
              : BigInt(parseInt(txParams.maxPriorityFeePerGas, 16));
          } else if (txParams.gasPrice) {
            finalTxParams.gasPrice = typeof txParams.gasPrice === 'bigint'
              ? txParams.gasPrice
              : BigInt(parseInt(txParams.gasPrice, 16));
          }
          
          console.log('Final transaction parameters:', safeStringify(finalTxParams));
          const txHash = await walletClient.sendTransaction(finalTxParams);
          
          // Clean up the approval request
          await removeApprovalRequest(approvalRequest.id);
          console.log('Transaction sent successfully:', txHash);
          
          return txHash;
        } catch (error) {
          console.error('Transaction failed:', error);
          // Clean up the approval request if it exists
          if (requestId) {
            await removeApprovalRequest(requestId);
          }
          // Format error for better debugging
          throw new Error(`Transaction failed: ${error.message || 'Unknown error'}`);
        }

      case 'personal_sign':
        try {
          // Get the message and address from params
          const messageHex = params[0];
          const requestId = params[1]; // Optional request ID for identifying approval responses
          const skipApproval = params[2]; // Optional flag to skip approval (for popup-initiated signing)
          
          // For hexadecimal messages, try to decode them to UTF-8 for display
          let messageText = '';
          try {
            // Skip the '0x' prefix when decoding
            const hexString = messageHex.startsWith('0x') ? messageHex.slice(2) : messageHex;
            const bytes = new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
            messageText = new TextDecoder().decode(bytes);
          } catch (e) {
            console.warn('Could not decode message as UTF-8:', e);
            messageText = messageHex; // Fall back to showing the hex
          }
          
          // If skipApproval is not true, go through the normal approval flow
          if (!skipApproval) {
            // Create and store an approval request
            const approvalRequest = {
              id: requestId || `msg-${Date.now()}`,
              type: 'message',
              message: messageHex,
              messageText,
              account: account.address,
              metadata: {
                timestamp: Date.now()
              }
            };
            
            // Request user approval
            await storeApprovalRequest(approvalRequest);
            
            // Wait for user approval
            const approvalResult = await waitForApproval(approvalRequest.id);
            
            if (!approvalResult.approved) {
              throw new Error('Message signing rejected by user');
            }
            
            // Clean up the approval request after approval
            await removeApprovalRequest(approvalRequest.id);
          }
          
          // Sign the message with the active account
          const signature = await account.signMessage({
            message: messageHex
          });
          
          return signature;
        } catch (error) {
          console.error('Error signing message:', error);
          throw new Error(`Message signing failed: ${error.message}`);
        }
        
      case 'eth_signTypedData':
      case 'eth_signTypedData_v4':
        try {
          // Get the typed data parameters
          const address = params[0];
          const typedData = params[1];
          let parsedData;
          
          try {
            // Handle case where data might be a string
            if (typeof typedData === 'string') {
              parsedData = JSON.parse(typedData);
            } else {
              parsedData = typedData;
            }
          } catch (parseError) {
            console.error('Error parsing typed data:', parseError);
            throw new Error('Invalid typed data format');
          }
          
          // Validate that the signer matches our account
          if (address.toLowerCase() !== account.address.toLowerCase()) {
            throw new Error('Signer address does not match active account');
          }
          
          const requestId = params[2]; // Optional request ID
          const skipApproval = params[3]; // Optional flag to skip approval
          
          // Format the data for display in the approval UI
          const formattedData = formatTypedDataForDisplay(parsedData);
          
          // If skipApproval is not true, go through the normal approval flow
          if (!skipApproval) {
            // Create and store an approval request
            const approvalRequest = {
              id: requestId || `typed-${Date.now()}`,
              type: 'typedData',
              address,
              typedData: parsedData,
              formattedData,
              account: account.address,
              metadata: {
                timestamp: Date.now(),
                method: method // Store which version of the method was called
              }
            };
            
            // Request user approval
            await storeApprovalRequest(approvalRequest);
            
            // Wait for user approval
            const approvalResult = await waitForApproval(approvalRequest.id);
            
            if (!approvalResult.approved) {
              throw new Error('Signature request rejected by user');
            }
            
            // Clean up the approval request after approval
            await removeApprovalRequest(approvalRequest.id);
          }
          
          // Sign the typed data using the active account
          const signature = await account.signTypedData(parsedData);
          
          return signature;
        } catch (error) {
          console.error('Error signing typed data:', error);
          throw new Error(`Typed data signing failed: ${error.message}`);
        }
        
      case 'wallet_switchEthereumChain':
        const newChainId = params[0].chainId;
        await setCurrentChain(newChainId);
        
        // Emit chain changed event to all content scripts
        await emitEvent('chainChanged', newChainId);
        
        return null;
        
      case 'wallet_addEthereumChain':
        const chainData = params[0];
        const addChainId = chainData.chainId;
        
        // Check if chain already exists in our predefined chains
        const existingChains = await loadAllChains();
        if (existingChains[addChainId]) {
          // If chain already exists, just switch to it
          await setCurrentChain(addChainId);
          return null;
        }
        
        // Validate required chain parameters
        if (!chainData.chainId || !chainData.chainName || !chainData.rpcUrls || chainData.rpcUrls.length === 0) {
          throw new Error('Invalid chain configuration: missing required parameters');
        }
        
        // Create a viem-compatible chain object
        const newChain = {
          id: parseInt(addChainId, 16),
          name: chainData.chainName,
          network: chainData.chainName.toLowerCase().replace(/\s+/g, '-'),
          nativeCurrency: chainData.nativeCurrency || {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18
          },
          rpcUrls: {
            default: { http: chainData.rpcUrls },
            public: { http: chainData.rpcUrls }
          }
        };
        
        // Add block explorer if provided
        if (chainData.blockExplorerUrls && chainData.blockExplorerUrls.length > 0) {
          newChain.blockExplorers = {
            default: {
              name: chainData.chainName + ' Explorer',
              url: chainData.blockExplorerUrls[0]
            }
          };
        }
        
        // Save the new chain to storage
        const { userChains } = await browser.storage.local.get('userChains');
        const updatedUserChains = { ...(userChains || {}) };
        updatedUserChains[addChainId] = newChain;
        await browser.storage.local.set({ userChains: updatedUserChains });
        
        // Switch to the new chain and emit event
        await setCurrentChain(addChainId);
        
        // Emit chain changed event to all content scripts
        await emitEvent('chainChanged', addChainId);
        
        return null;

      default:
        return publicClient.request({ method, params });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    throw error;
  }
}

// Transaction approval handling

// Store a new approval request in browser storage
async function storeApprovalRequest(request) {
  try {
    // Get existing pending requests
    const { pendingApprovals } = await browser.storage.local.get('pendingApprovals');
    const approvals = pendingApprovals || {};
    
    // Add the new request
    approvals[request.id] = request;
    
    // Save back to storage
    await browser.storage.local.set({ pendingApprovals: approvals });
    
    // Create a popup to request user approval
    try {
      // Check if we're on Firefox for Android (browser.windows is undefined)
      if (typeof browser.windows === 'undefined') {
        // For Firefox Android, open as a tab instead
        await browser.tabs.create({
          url: `/approval.html?id=${request.id}`
        });
      } else {
        // For desktop Firefox, open as a popup window
        await browser.windows.create({
          url: `/approval.html?id=${request.id}`,
          type: 'popup',
          width: 400,
          height: 600,
          focused: true
        });
      }
    } catch (windowError) {
      console.error('Error creating approval window/tab:', windowError);
      // Fallback to opening as a tab if window creation fails
      await browser.tabs.create({
        url: `/approval.html?id=${request.id}`
      });
    }
    
    console.log('Approval request stored and popup/tab created:', request.id);
  } catch (error) {
    console.error('Error storing approval request:', error);
    throw error;
  }
}

// Wait for a specific approval request to be completed
async function waitForApproval(requestId) {
  return new Promise((resolve) => {
    const checkApproval = async () => {
      try {
        const { approvalResults } = await browser.storage.local.get('approvalResults');
        
        if (approvalResults && approvalResults[requestId]) {
          // We have a result
          const result = approvalResults[requestId];
          
          // Clean up the result
          const updatedResults = { ...approvalResults };
          delete updatedResults[requestId];
          await browser.storage.local.set({ approvalResults: updatedResults });
          
          resolve(result);
          return;
        }
        
        // Check again after a short delay
        setTimeout(checkApproval, 500);
      } catch (error) {
        console.error('Error checking approval status:', error);
        // Resolve with rejection in case of error
        resolve({ approved: false, error: error.message });
      }
    };
    
    // Start checking
    checkApproval();
  });
}

// Remove a pending approval request
async function removeApprovalRequest(requestId) {
  try {
    const { pendingApprovals } = await browser.storage.local.get('pendingApprovals');
    
    if (pendingApprovals && pendingApprovals[requestId]) {
      const updatedApprovals = { ...pendingApprovals };
      delete updatedApprovals[requestId];
      await browser.storage.local.set({ pendingApprovals: updatedApprovals });
    }
  } catch (error) {
    console.error('Error removing approval request:', error);
  }
}

// Get all pending approval requests
async function getPendingApprovals() {
  try {
    const { pendingApprovals } = await browser.storage.local.get('pendingApprovals');
    return pendingApprovals || {};
  } catch (error) {
    console.error('Error getting pending approvals:', error);
    return {};
  }
}

// Approve or reject a transaction request
async function resolveApproval(requestId, approved) {
  try {
    // Get the pending request
    const { pendingApprovals } = await browser.storage.local.get('pendingApprovals');
    
    if (!pendingApprovals || !pendingApprovals[requestId]) {
      throw new Error(`Approval request ${requestId} not found`);
    }
    
    // Store the result
    const { approvalResults } = await browser.storage.local.get('approvalResults');
    const results = approvalResults || {};
    
    results[requestId] = { 
      approved, 
      timestamp: Date.now() 
    };
    
    await browser.storage.local.set({ approvalResults: results });
    
    // Clean up the pending request
    const updatedApprovals = { ...pendingApprovals };
    delete updatedApprovals[requestId];
    await browser.storage.local.set({ pendingApprovals: updatedApprovals });
    
    return true;
  } catch (error) {
    console.error('Error resolving approval:', error);
    throw error;
  }
}

// Helper function to convert BigInt values to strings for JSON serialization
function convertBigIntToString(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToString);
  }
  
  if (typeof obj === 'object') {
    const result = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = convertBigIntToString(obj[key]);
      }
    }
    return result;
  }
  
  return obj;
}

// Safely stringify objects with BigInt values
function safeStringify(obj, replacer = null, space = 2) {
  return JSON.stringify(convertBigIntToString(obj), replacer, space);
}

// Helper function to format typed data for display in the approval UI
function formatTypedDataForDisplay(typedData) {
  // Deep copy to avoid modifying the original
  const formattedData = JSON.parse(JSON.stringify(typedData));
  
  try {
    // Extract primary details for easier display
    const primaryType = formattedData.primaryType;
    const domain = formattedData.domain;
    
    // Format domain into a readable summary
    let domainSummary = '';
    if (domain.name) domainSummary += `Name: ${domain.name}\n`;
    if (domain.version) domainSummary += `Version: ${domain.version}\n`;
    if (domain.chainId) domainSummary += `Chain ID: ${domain.chainId}\n`;
    if (domain.verifyingContract) domainSummary += `Contract: ${domain.verifyingContract}\n`;
    
    // Format the message data based on primary type
    const messageData = formattedData.message;
    const primaryTypeData = [];
    
    // Format permit-specific data in a readable way if it's a permit
    if (primaryType === 'Permit') {
      if (messageData.owner) primaryTypeData.push(`Owner: ${messageData.owner}`);
      if (messageData.spender) primaryTypeData.push(`Spender: ${messageData.spender}`);
      if (messageData.value) primaryTypeData.push(`Value: ${messageData.value}`);
      if (messageData.nonce) primaryTypeData.push(`Nonce: ${messageData.nonce}`);
      if (messageData.deadline) {
        const deadline = Number(messageData.deadline);
        const date = new Date(deadline * 1000); // Convert from unix timestamp
        primaryTypeData.push(`Deadline: ${date.toLocaleString()} (${messageData.deadline})`);
      }
    } else {
      // For non-permit types, format all fields
      for (const key in messageData) {
        let value = messageData[key];
        // Format arrays or objects
        if (typeof value === 'object' && value !== null) {
          value = JSON.stringify(value);
        }
        primaryTypeData.push(`${key}: ${value}`);
      }
    }
    
    return {
      domainName: domain.name || 'Unknown Domain',
      domainSummary,
      primaryType,
      messageData: primaryTypeData.join('\n'),
      fullData: safeStringify(typedData, null, 2)
    };
  } catch (error) {
    console.error('Error formatting typed data:', error);
    // Return a simpler format if there's an error
    return {
      domainName: 'Error formatting data',
      domainSummary: '',
      primaryType: typedData.primaryType || 'Unknown',
      messageData: 'Error parsing message data',
      fullData: safeStringify(typedData, null, 2)
    };
  }
}

// Create a utility to emit events to all tabs
async function emitEvent(eventName, data) {
  try {
    const tabs = await browser.tabs.query({});
    // Convert any BigInt values to strings before sending
    const safeData = convertBigIntToString(data);
    
    for (const tab of tabs) {
      browser.tabs.sendMessage(tab.id, {
        event: eventName,
        data: safeData
      }).catch(() => {
        // Ignore errors for tabs that don't have our content script
      });
    }
  } catch (error) {
    console.error(`Error emitting ${eventName} event:`, error);
  }
}

// Remove a network
async function removeNetwork(chainId) {
  try {
    // Can't remove builtin networks
    if (chains[chainId]) {
      throw new Error(`Cannot remove built-in network with chain ID ${chainId}`);
    }
    
    // Get current user chains
    const { userChains } = await browser.storage.local.get('userChains');
    if (!userChains || !userChains[chainId]) {
      throw new Error(`Network with chain ID ${chainId} not found`);
    }
    
    // Get current chain
    const { chainId: currentChainId } = await browser.storage.local.get('chainId');
    
    // Switch to default if removing the active chain
    if (currentChainId === chainId) {
      await browser.storage.local.set({ chainId: DEFAULT_CHAIN_ID });
      await emitEvent('chainChanged', DEFAULT_CHAIN_ID);
    }
    
    // Remove the chain
    const updatedUserChains = { ...userChains };
    delete updatedUserChains[chainId];
    await browser.storage.local.set({ userChains: updatedUserChains });
    
    return true;
  } catch (error) {
    console.error('Error removing network:', error);
    throw error;
  }
}

export default { 
  handleRequest, 
  emitEvent, 
  removeNetwork,
  getPendingApprovals,
  resolveApproval,
  convertBigIntToString,
  safeStringify,
  // Export the new wallet management functions
  isWalletInitialized,
  isWalletLocked,
  initializeWallet,
  unlockWallet,
  lockWallet,
  getAccounts,
  addAccountFromSeed,
  importPrivateKey,
  setActiveAccountIndex,
  getActiveAccount,
  exportWallet,
  importWallet,
  deleteWalletData
};