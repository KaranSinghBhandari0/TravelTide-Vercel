const express = require('express');
const router = express.Router({ mergeParams: true });
const wrapAsync = require("../utils/wrapAsync");
const Listing = require('../models/listing.js');
const { isLoggedIn, isOwner } = require('../middlewares.js');
const multer = require('multer');

const storage = multer.memoryStorage(); // Upload to memory first
const upload = multer({ storage });

// Home page
router.get("/", wrapAsync(async (req, res) => {
    let allListings = await Listing.find({});
    res.render("listings/index.ejs", { allListings });
}));

// Create new listing page
router.get("/new", isLoggedIn, (req, res) => {
    res.render("listings/new.ejs");
});

// Create new listing
router.post("/", isLoggedIn, upload.array('image'), wrapAsync(async (req, res, next) => {
    const files = req.files;

    // Upload files to Cloudinary
    const uploadToCloudinary = (file) => {
        return new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                { folder: 'TravelTide' },
                (error, result) => {
                    if (error) {
                        return reject(error);
                    }
                    resolve(result);
                }
            ).end(file.buffer);
        });
    };

    const uploadPromises = files.map(uploadToCloudinary);
    const cloudinaryResults = await Promise.all(uploadPromises);

    const images = cloudinaryResults.map(result => ({
        url: result.secure_url,
        filename: result.public_id
    }));

    let newListing = new Listing({
        title: req.body.title,
        description: req.body.description,
        price: req.body.price,
        location: req.body.location,
        country: req.body.country,
        image: images,
    });

    newListing.owner = req.user._id;

    await newListing.save();
    req.flash('success', 'New listing created successfully');
    res.redirect("/listings");
}));

// Show listing
router.get("/:id", wrapAsync(async (req, res) => {
    let { id } = req.params;
    let listing = await Listing.findById(id)
        .populate({ path: "reviews", populate: { path: "author" } })
        .populate("owner");

    if (!listing) {
        req.flash("error", "Listing does not exist");
        return res.redirect('/listings');
    }

    res.render("listings/show.ejs", { listing });
}));

// Update listing page
router.get("/:id/update", isLoggedIn, isOwner, wrapAsync(async (req, res) => {
    let { id } = req.params;
    let listing = await Listing.findById(id);

    if (!listing) {
        req.flash("error", "Listing does not exist");
        return res.redirect('/listings');
    }

    res.render("listings/edit.ejs", { listing });
}));

// Update listing
router.patch("/:id", isLoggedIn, isOwner, upload.array('image'), wrapAsync(async (req, res) => {
    let { id } = req.params;
    let updatedListing = await Listing.findById(id);

    // Handle new images upload
    if (req.files && req.files.length > 0) {
        const uploadToCloudinary = (file) => {
            return new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    { folder: 'TravelTide' },
                    (error, result) => {
                        if (error) {
                            return reject(error);
                        }
                        resolve(result);
                    }
                ).end(file.buffer);
            });
        };

        const uploadPromises = req.files.map(uploadToCloudinary);
        const cloudinaryResults = await Promise.all(uploadPromises);

        const newImages = cloudinaryResults.map(result => ({
            url: result.secure_url,
            filename: result.public_id
        }));

        // Add new images to the listing
        updatedListing.image.push(...newImages);
    }

    // Update the text fields
    updatedListing.title = req.body.title;
    updatedListing.description = req.body.description;
    updatedListing.price = req.body.price;
    updatedListing.location = req.body.location;
    updatedListing.country = req.body.country;

    await updatedListing.save();
    req.flash('success', 'Listing updated successfully');
    res.redirect(`/listings/${id}`);
}));

// Delete listing
router.delete("/:id", isLoggedIn, isOwner, wrapAsync(async (req, res) => {
    let { id } = req.params;
    let listing = await Listing.findById(id);

    if (!listing) {
        req.flash('error', 'Listing not found');
        return res.redirect('/listings');
    }

    // Delete images from Cloudinary
    const deleteImages = listing.image.map(img => cloudinary.uploader.destroy(img.filename));
    await Promise.all(deleteImages);

    await Listing.findByIdAndDelete(id);
    req.flash('success', 'Listing deleted successfully');
    res.redirect("/listings");
}));

module.exports = router;
