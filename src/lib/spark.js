const axios = require('axios');

const BASE_URL = 'https://replication.sparkapi.com/Version/3/Reso/OData';

// ── In-memory cache ──────────────────────────────────────────────────────────
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const _cache = new Map();

function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { _cache.delete(key); return null; }
  return entry.data;
}
function cacheSet(key, data) {
  _cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}
function clearCache() {
  _cache.clear();
  console.log('[spark] Listings cache cleared');
}
// ─────────────────────────────────────────────────────────────────────────────

const escOData = (s) => String(s).replace(/'/g, "''");

const BRANCA_REALTY_OFFICE_KEY    = '20241204053833553112000000'; // used for filtering
const BRANCA_REALTY_OFFICE_MLS_ID = '802380';                    // for display only

// All supported Treasure Coast cities
const TREASURE_COAST_CITIES = [
  'Port St. Lucie',
  'Stuart',
  'Jupiter',
  'Fort Pierce',
  'Vero Beach',
  'Sebastian',
];

// Slug → exact MLS city name (handles URL-friendly params like ?city=port-st-lucie)
const CITY_SLUG_MAP = {
  'port-st-lucie':  'Port St. Lucie',
  'port st. lucie': 'Port St. Lucie',
  'stuart':         'Stuart',
  'jupiter':        'Jupiter',
  'fort-pierce':    'Fort Pierce',
  'fort pierce':    'Fort Pierce',
  'vero-beach':     'Vero Beach',
  'vero beach':     'Vero Beach',
  'sebastian':      'Sebastian',
};

const VALID_CITY_SLUGS = Object.keys(CITY_SLUG_MAP);

function resolveCity(city) {
  if (!city) return null;
  return CITY_SLUG_MAP[city.toLowerCase()] || null;
}

function sparkHeaders() {
  return {
    Authorization: `Bearer ${process.env.SPARK_ACCESS_TOKEN}`,
    Accept: 'application/json',
  };
}

const SORT_MAP = {
  'newest':       'ModificationTimestamp desc',
  'price-low':    'ListPrice asc',
  'price-high':   'ListPrice desc',
};

async function getListings({ page = 1, limit = 20, minPrice, maxPrice, beds, baths, city, propertyType, listingType, sortBy } = {}) {
  const cacheKey = JSON.stringify({ fn: 'getListings', page, limit, minPrice, maxPrice, beds, baths, city, propertyType, listingType, sortBy });
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const top      = Math.min(Math.max(Number(limit) || 1, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip     = (safePage - 1) * top;
  const orderby  = SORT_MAP[sortBy] || SORT_MAP['newest'];

  const filters = ["StandardStatus eq 'Active'"];
  if (minPrice) filters.push(`ListPrice ge ${Number(minPrice)}`);
  if (maxPrice) filters.push(`ListPrice le ${Number(maxPrice)}`);
  if (beds)     filters.push(`BedroomsTotal ge ${Number(beds)}`);
  if (baths)    filters.push(`BathroomsTotalInteger ge ${Number(baths)}`);

  const resolvedCity = resolveCity(city);
  if (resolvedCity) {
    filters.push(`City eq '${escOData(resolvedCity)}'`);
  } else {
    const cityFilter = TREASURE_COAST_CITIES.map(c => `City eq '${c}'`).join(' or ');
    filters.push(`(${cityFilter})`);
  }

  if (propertyType)          filters.push(`PropertyType eq '${escOData(propertyType)}'`);
  if (listingType === 'rent') filters.push("PropertyType eq 'Residential Lease'");
  if (listingType === 'sale') filters.push("PropertyType ne 'Residential Lease'");

  const response = await axios.get(`${BASE_URL}/Property`, {
    headers: sparkHeaders(),
    params: {
      $top: top,
      $skip: skip,
      $filter: filters.join(' and '),
      $orderby: orderby,
      $count: true,
      $expand: 'Media($top=4)',
    },
  });

  cacheSet(cacheKey, response.data);
  return response.data;
}

async function getInHouseListings({ page = 1, limit = 20, sortBy } = {}) {
  const cacheKey = JSON.stringify({ fn: 'getInHouseListings', page, limit, sortBy });
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const top      = Math.min(Math.max(Number(limit) || 1, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip     = (safePage - 1) * top;
  const orderby  = SORT_MAP[sortBy] || SORT_MAP['newest'];

  const filter = `StandardStatus eq 'Active' and ListOfficeKey eq '${BRANCA_REALTY_OFFICE_KEY}'`;

  const response = await axios.get(`${BASE_URL}/Property`, {
    headers: sparkHeaders(),
    params: {
      $top: top,
      $skip: skip,
      $filter: filter,
      $orderby: orderby,
      $count: true,
      $expand: 'Media($top=4)',
    },
  });

  cacheSet(cacheKey, response.data);
  return response.data;
}

async function getInHouseListingsCount() {
  const cacheKey = 'getInHouseListingsCount';
  const cached = cacheGet(cacheKey);
  if (cached !== null) return cached;

  const response = await axios.get(`${BASE_URL}/Property`, {
    headers: sparkHeaders(),
    params: {
      $filter: `StandardStatus eq 'Active' and ListOfficeKey eq '${BRANCA_REALTY_OFFICE_KEY}'`,
      $count: true,
      $top: 0,
    },
  });

  const count = response.data['@odata.count'] || 0;
  cacheSet(cacheKey, count);
  return count;
}

async function getListing(listingKey) {
  const response = await axios.get(`${BASE_URL}/Property('${escOData(listingKey)}')`, {
    headers: sparkHeaders(),
    params: { $expand: 'Media' },
  });
  return response.data;
}

async function getListingPhotos(listingKey) {
  try {
    // Try dedicated Media endpoint first
    const response = await axios.get(`${BASE_URL}/Media`, {
      headers: sparkHeaders(),
      params: {
        $filter: `ResourceRecordKey eq '${escOData(listingKey)}'`,
        $top: 100,
      },
    });
    return response.data;
  } catch (err) {
    if (err.response?.status === 404) {
      // Media endpoint not available for this token — fall back to $expand on Property
      const response = await axios.get(`${BASE_URL}/Property('${escOData(listingKey)}')`, {
        headers: sparkHeaders(),
        params: { $expand: 'Media' },
      });
      const media = response.data?.Media || response.data?.value?.[0]?.Media || [];
      return { value: Array.isArray(media) ? media : [] };
    }
    console.error('[spark] getListingPhotos raw error:', err.response?.status, JSON.stringify(err.response?.data));
    throw err;
  }
}

module.exports = {
  getListings, getListing, getListingPhotos,
  getInHouseListings, getInHouseListingsCount,
  clearCache,
  VALID_CITY_SLUGS, CITY_SLUG_MAP,
  BRANCA_REALTY_OFFICE_KEY, BRANCA_REALTY_OFFICE_MLS_ID,
};
