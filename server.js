const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const session = require("express-session");
const mongoose = require("mongoose");
const path = require("path");
const api = require("./api");
const axios = require("axios");

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

app.get("/admin", requireAuth, async (req, res) => {
    try {
        // Fetch the users from the database (replace this with your actual logic)
        const users = await User.find();

        res.render("admin", {
            username: req.user.username,
            users: users,
            user: {},
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
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

app.get("/teslanews", requireAuth, async (req, res) => {
    try {
        const newsArticles = await api.getTeslaNews();
        console.log("Tesla News Articles:", newsArticles); // Add this line
        res.render("tesla-news", {
            teslaNews: newsArticles,
            page: "teslanews",
        });
    } catch (error) {
        console.error("Error fetching Tesla news:", error);
        res.status(500).json({ error: error });
    }
});

const faceitApiUrl = "https://open.faceit.com/data/v4/players/";

const headers = {
    "Content-Type": "application/json",
    Authorization: "Bearer 3b5a9d07-4b77-4be4-bf5d-f9ff3d6cb7b6",
};

app.get("/", requireAuth, async function (req, res) {
    try {
        // Extracting Faceit player ID from the query parameter
        const playerId = req.query.playerId;

        if (!playerId) {
            return res.render("index", { result: null });
        }

        const playerStatsUrl = `${faceitApiUrl}${playerId}/games/cs2/stats?offset=0&limit=20`;
        const response = await axios.get(playerStatsUrl, { headers });

        const totalKd = response.data.items.reduce(
            (acc, item) => acc + Number(item.stats["K/D Ratio"]),
            0
        );
        const averageKd = (totalKd / response.data.items.length).toFixed(2);

        const totalKr = response.data.items.reduce(
            (acc, item) => acc + Number(item.stats["K/R Ratio"]),
            0
        );
        const averageKr = (totalKr / response.data.items.length).toFixed(2);

        const totalHeadshots = response.data.items.reduce(
            (acc, item) => acc + Number(item.stats["Headshots"]),
            0
        );
        const averageHeadshots = (
            totalHeadshots / response.data.items.length
        ).toFixed(2);

        const totalKills = response.data.items.reduce(
            (acc, item) => acc + Number(item.stats["Kills"]),
            0
        );
        const averageKills = (totalKills / response.data.items.length).toFixed(
            2
        );

        const formattedOutput = `
        Nickname: ${response.data.items[0].stats.Nickname}
        Overall Average K/D: ${averageKd}
        Overall Average K/R: ${averageKr}
        Overall Average Headshots: ${averageHeadshots}
        Overall Average Kills: ${averageKills}
    `;

        res.render("index", { result: formattedOutput });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error fetching data from Faceit API");
    }
});

app.post("/admin/addUser", requireAuth, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).send("Forbidden");
    }

    const { username, password, isAdmin } = req.body;

    // Validate input if needed

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
        username,
        password: hashedPassword,
        isAdmin: isAdmin === "on",
    });

    await newUser.save();
    res.redirect("/admin");
});

// Delete a user (admin only)
app.post("/admin/deleteUser/:username", requireAuth, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).send("Forbidden");
    }

    const usernameToDelete = req.params.username;

    try {
        // Validate username if needed

        await User.findOneAndDelete({ username: usernameToDelete });
        res.redirect("/admin");
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});

// Edit user details (admin only)
app.get("/admin/editUser/:userId", requireAuth, async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).send("User not found");
        }

        res.render("editUser", { user: user });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/admin/editUser", requireAuth, async (req, res) => {
    try {
        const { userId, username, password, isAdmin } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.findByIdAndUpdate(userId, {
            username,
            password: hashedPassword,
            isAdmin: isAdmin === "on",
        });

        res.redirect("/admin");
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
