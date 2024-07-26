const express = require('express');
const router = express.Router({mergeParams:true});
const multer  = require('multer');
const {storage} = require('../cloudConfig.js');

router.get("/privacy", (req,res)=> {
    res.render("footer/privacy.ejs");
})

router.get("/terms", (req,res)=> {
    res.render("footer/T&C.ejs");
})

router.get("/ContactUs", (req,res)=> {
    res.render("footer/ContactUs.ejs");
})

router.get("/helpDone", (req,res)=> {
    req.flash('success', 'Thanks, for Your feedback');
    res.redirect('/listings');
})

module.exports = router;