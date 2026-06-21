const express = require('express');
const router = express.Router();
const { getListings, getSaleListings, getRentListings, getFilteredListings, getListing, getListingPhotos, getTopAreaListings } = require('../controllers/listingsController');

router.get('/', getListings);
router.get('/sale', getSaleListings);
router.get('/rent', getRentListings);
router.get('/filter', getFilteredListings);
router.get('/top-areas/:city', getTopAreaListings);
router.get('/:listingKey/photos', getListingPhotos);
router.get('/:listingKey', getListing);

module.exports = router;
