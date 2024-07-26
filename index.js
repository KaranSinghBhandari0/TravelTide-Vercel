if(process.env.NODE_ENV != "production") {
    require('dotenv').config();
}
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const path = require('path');
const methodOverride = require('method-override');
const ejsMate = require('ejs-mate');
const ExpressError = require("./utils/ExpressError.js");
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const user = require('./models/user.js');

// let DB_url = 'mongodb://127.0.0.1:27017/wanderlust';
let DB_url = process.env.ATLAS_URL;

main()
    .then(()=> {
        console.log("connection sucessful")
    })
    .catch((err) => console.log(err))

async function main() {
    await mongoose.connect(DB_url);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, 'public')));

app.engine("ejs", ejsMate);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

const store = MongoStore.create({
    mongoUrl: DB_url,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24*3600,
});

store.on("err", ()=> {
    console.log(err);
})

// session and flash
app.use(session({
    store: store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: new Date(Date.now() + 7*24*60*60*1000),
        maxAge: 7*24*60*60*1000,
        httpOnly: true,
    }
}))
app.use(flash());


// passport
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(user.authenticate()));
passport.serializeUser(user.serializeUser());
passport.deserializeUser(user.deserializeUser());

// flash errors
app.use((req,res,next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.currUser = req.user;
    next();
})


let port = 3000;
app.listen(port, ()=> {
    console.log(`listening on port ${port}`);
})
app.get("/", (req,res)=> {
    res.redirect("/listings");
})


// listing routes
const listings = require('./routes/listing.js');
app.use("/listings", listings);

// review routes
const reviews = require('./routes/review.js');
app.use("/listings/:id/reviews", reviews);

// account routes
const User = require('./routes/user.js');
app.use("/account", User);

// footer routes
const footer = require('./routes/footer.js');
app.use("/footer", footer);


// undefined path 
app.all("*", (req,res,next) => {
    next(new ExpressError(404, `Error 404 Page Not Found!!!`));
})

// error handling middleware 
app.use((err,req,res,next) => {
    let {status=500,message="Some error occured"} = err;
    res.status(status).render("listings/error.ejs", {err});
})