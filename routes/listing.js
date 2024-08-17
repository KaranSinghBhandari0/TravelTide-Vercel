const express = require('express');
const router = express.Router({ mergeParams: true });
const wrapAsync = require("../utils/wrapAsync");
const Listing = require('../models/listing.js');
const { isLoggedIn } = require('../middlewares.js');
const { isOwner } = require('../middlewares.js');
const multer = require('multer');
const { storage } = require('../cloudConfig.js');
const upload = multer({ storage });

// Home page
router.get("/", wrapAsync(async (req, res) => {
    let allListings = await Listing.find({});
    res.render("listings/index.ejs", { allListings });
}));

// Create new listing (GET form)
router.get("/new", isLoggedIn, (req, res) => {
    res.render("listings/new.ejs");
});

// Create new listing (POST request to handle form submission with multiple images)
router.post("/", isLoggedIn, upload.array('image'), wrapAsync(async (req, res, next) => {
    let newListing = new Listing({
        title: req.body.title,
        description: req.body.description,
        price: req.body.price,
        location: req.body.location,
        country: req.body.country,
        owner: req.user._id,
        images: req.files.map(f => ({ url: f.path, filename: f.filename }))  // Map through multiple files
    });

    await newListing.save();
    console.log("New listing was saved.");
    req.flash('success', 'New listing created successfully');
    res.redirect("/listings");
}));

// Show listing
router.get("/:id", wrapAsync(async (req, res) => {
    let { id } = req.params;
    let listing = await Listing.findById(id).populate({
        path: "reviews",
        populate: { path: "author" }
    }).populate("owner");

    if (!listing) {
        req.flash("error", "Listing does not exist");
        return res.redirect('/listings');
    }

    res.render("listings/show.ejs", { listing });
}));

// Update listing (GET form)
router.get("/:id/update", isLoggedIn, isOwner, wrapAsync(async (req, res) => {
    let { id } = req.params;
    let listing = await Listing.findById(id);

    if (!listing) {
        req.flash("error", "Listing does not exist");
        return res.redirect('/listings');
    }

    res.render("listings/edit.ejs", { listing });
}));

// Update listing (PATCH request to handle form submission with multiple images)
router.patch("/:id", isLoggedIn, isOwner, upload.array('image'), wrapAsync(async (req, res) => {
    let { id } = req.params;
    let { title, description, price, location, country } = req.body;
    
    let updatedListing = await Listing.findByIdAndUpdate(id, {
        title, description, price, location, country
    });

    // If new images are uploaded, append them
    if (req.files.length) {
        const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }));
        updatedListing.images.push(...imgs); // Append new images
        await updatedListing.save();
    }

    req.flash('success', 'Listing updated successfully');
    res.redirect(`/listings/${id}`);
}));

// Delete listing
router.delete("/:id", isLoggedIn, isOwner, wrapAsync(async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash('success', 'Listing deleted successfully');
    res.redirect("/listings");
}));

// Search by country
router.post("/search", wrapAsync(async (req, res) => {
    let { country } = req.body;
    country = country.trim();

    const searchPatterns = [
        { country: { $regex: new RegExp(`^${country}$`, 'i') } },
        { location: { $regex: new RegExp(`^${country}\\s*$`, 'i') } },
    ];

    let allListings = await Listing.find({ $or: searchPatterns });

    if (allListings.length === 0) {
        req.flash('error', `No destination found in ${country}`);
        return res.redirect("/listings");
    }

    res.render("listings/searchResults.ejs", { allListings });
}));

// Payment routes
router.get("/:id/payment", isLoggedIn, wrapAsync(async (req, res) => {
    let { id } = req.params;
    let currListing = await Listing.findById(id);

    if (req.user._id.equals(currListing.owner._id)) {
        req.flash('error', 'You are the listing owner, this is your place.');
        return res.redirect('/listings');
    }

    res.render("listings/paymentpage.ejs", { currListing, quantity: req.query.quantity });
}));

router.get("/:id/paymentdone/:tickets", isLoggedIn, wrapAsync(async (req, res) => {
    let { id, tickets } = req.params;
    let currListing = await Listing.findById(id);

    setTimeout(() => {
        res.render("listings/receipt.ejs", { currListing, tickets, time: new Date() });
    }, 3000);
}));

module.exports = router;
