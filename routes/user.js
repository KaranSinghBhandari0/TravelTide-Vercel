const express = require('express');
const router = express.Router({mergeParams:true});
const user = require('../models/user');
const wrapAsync = require('../utils/wrapAsync');
const passport = require('passport');
const {saveRedirectUrl} = require("../middlewares.js");

// sign in
router.get("/signup", (req,res)=> {
    res.render("accounts/signup.ejs");
})

router.post("/signup", wrapAsync(async (req, res, next) => {
    try {
        const { username, password, email } = req.body;

        // Check if the email already exists
        const existingUser = await user.findOne({ email });
        if (existingUser) {
            req.flash('error', 'E-mail already exists');
            return res.redirect('/account/signup');
        }

        // Create a new user instance
        const newUser = new user({ 
            username: username, 
            email: email,
        });

        // Register the new user
        await user.register(newUser, password);

        // Automatically log in the new user
        req.login(newUser, (err) => {
            if (err) {
                return next(err);
            }
            req.flash('success', 'Welcome! You are a new user.');
            res.redirect('/listings');
        });
    } catch (error) {
        req.flash('error', error.message);
        res.redirect("/account/signup");
    }
}));


// login
router.get("/login", (req,res)=> {
    res.render("accounts/login.ejs");
})

router.post("/login", saveRedirectUrl,  passport.authenticate('local', { failureRedirect: '/account/login', failureFlash: true }), async (req,res)=> {
    req.flash('success', 'Welcome to TravelTide You are logged in');
    let redirectUrl = res.locals.redirectUrl || "/listings";
    res.redirect(redirectUrl);
})

// logout
router.get("/logout", (req,res,next)=> {
    req.logout((err)=> {
        if(err) {
            return next(err);
        }
        req.flash('success', 'you are logged out')
        res.redirect('/listings');
    })
})

module.exports = router;