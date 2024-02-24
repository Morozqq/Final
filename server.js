const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const session = require("express-session");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const port = 3000;

// Connect to MongoDB Atlas
mongoose.connect(
    "mongodb+srv://aslandzheleubaj04:523435523435Aa@cluster0.duzkl5t.mongodb.net/users"
);
const db = mongoose.connection;
db.once("open", () => {
    console.log("Connected to MongoDB Atlas");
});

// Define User schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
});

const User = mongoose.model("User", userSchema);

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
    session({
        secret: "your-secret-key",
        resave: true,
        saveUninitialized: true,
    })
);

// Authentication Middleware
const requireAuth = async (req, res, next) => {
    try {
        if (!req.session.userId) {
            return res.redirect("/login");
        }

        const user = await User.findById(req.session.userId);

        if (!user) {
            return res.redirect("/login");
        }

        req.user = user;
        next();
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

// Set the views directory
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Registration Page - Frontend
app.get("/register", (req, res) => {
    res.render("register", { page: "register" });
});

// Registration - Backend
app.post("/register", async (req, res) => {
    const { username, password, isAdmin } = req.body;

    // Check if username is unique
    const existingUser = await User.findOne({ username });
    if (existingUser) {
        return res.status(400).send("Username already exists");
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Convert isAdmin value to Boolean
    const isAdminBool = isAdmin === "on";

    // Create a new user with isAdmin flag
    const newUser = new User({
        username,
        password: hashedPassword,
        isAdmin: isAdminBool,
    });

    await newUser.save();
    res.redirect("/login");
});

// Login Page - Frontend
app.get("/login", (req, res) => {
    res.render("login", { page: "login" });
});

app.get("/logout", (req, res) => {
    // Clear the session
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
        } else {
            // Redirect to the login page after logout
            res.redirect("/login");
        }
    });
});

// Login - Backend
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    // Find the user by username
    const user = await User.findOne({ username });
    if (!user) {
        console.log("User not found");
        return res.status(401).send("Invalid username or password");
    }

    // Compare hashed password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
        console.log("Password mismatch");
        return res.status(401).send("Invalid username or password");
    }

    // Set user session
    req.session.userId = user._id;

    console.log("Login successful. Redirecting to /main");
    // Redirect to the main page or admin page based on the user's role
    if (user.isAdmin) {
        res.redirect("/admin");
    } else {
        res.redirect("/main");
    }
});

app.get("/admin", requireAuth, (req, res) => {
    res.render("admin", { username: req.user.username });
});

// Main Page - Frontend with Authorization Middleware
app.get("/main", requireAuth, async (req, res) => {
    try {
        // Find the authenticated user by their ID
        const user = await User.findById(req.session.userId);

        if (!user) {
            // Redirect to login if the user is not found
            return res.redirect("/login");
        }

        // Render the EJS main page with the user's name
        res.render("main", { username: user.username });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
