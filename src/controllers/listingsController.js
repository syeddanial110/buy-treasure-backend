const spark = require('../lib/spark');

async function fetchListings(req, res, listingType) {
  try {
    const { page = 1, limit = 20, minPrice, maxPrice, beds, baths, city, propertyType } = req.query;
    const data = await spark.getListings({ page, limit, minPrice, maxPrice, beds, baths, city, propertyType, listingType });
    res.json({
      listings: data.value || [],
      total: data['@odata.count'] || 0,
      page: Number(page),
      limit: Number(limit),
      ...(listingType && { type: listingType }),
    });
  } catch (err) {
    console.error('[listingsController] getListings:', err.message);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
}

async function getListings(req, res)     { return fetchListings(req, res, null); }
async function getSaleListings(req, res) { return fetchListings(req, res, 'sale'); }
async function getRentListings(req, res) { return fetchListings(req, res, 'rent'); }

async function getListing(req, res) {
  try {
    const { listingKey } = req.params;
    const data = await spark.getListing(listingKey);
    res.json(data);
  } catch (err) {
    console.error('[listingsController] getListing:', err.message);
    if (err.response?.status === 404) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
}

async function getListingPhotos(req, res) {
  try {
    const { listingKey } = req.params;
    const data = await spark.getListingPhotos(listingKey);
    res.json({ photos: data.value || [] });
  } catch (err) {
    console.error('[listingsController] getListingPhotos:', err.message);
    if (err.response?.status === 404) {
      return res.json({ photos: [] });
    }
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
}

module.exports = { getListings, getSaleListings, getRentListings, getListing, getListingPhotos };
