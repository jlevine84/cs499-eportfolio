// Reqs and var init
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
require("../models/user"); // Ensures schema is loaded
const User = mongoose.model("users"); // Unified model reference
const passport = require("passport");

// POST method for /register endpoint - register a new user
const register = async (req, res) => {
    try {
        // Validate request body to ensure all required params are present
        if (!req.body.name || !req.body.email || !req.body.password) {
            return res.status(400).json({ "message": "All fields required" });
        }

        // Initialize new user document with optional role override (defaults to "editor")
        const user = new User({
            name: req.body.name,
            email: req.body.email,
            role: req.body.role || "editor"
        });

        // Secure the password using the schema instance method
        user.setPassword(req.body.password);

        // Save the new user to MongoDB
        const savedUser = await user.save();

        // If save is successful, generate and return the JWT
        const token = savedUser.generateJWT();
        return res.status(201).json({ token });

    } catch (err) {
        // Log the error and return a 400 or 500 status depending on the error type
        console.error("Error during user registration:", err);
        
        // Handle MongoDB duplicate key errors (e.g., email already exists)
        if (err.code === 11000) {
            return res.status(409).json({ "message": "Email already registered." });
        }
        
        return res.status(400).json({ "error": err.message });
    }
};

// POST method for /login endpoint - Handle login of user
const login = (req, res) => {
    try {
        // Validate request body to ensure all required params are present
        if (!req.body.email || !req.body.password) {
            return res.status(400).json({ "message": "All fields required" });
        }

        // Delegate authentication to passport module
        passport.authenticate("local", (err, user, info) => {
            console.log("Passport Auth Result:", { err, user, info }); // <-- Add this debug line
            // If authentication error occurs, return the error
            if (err) { return res.status(404).json(err); }

            // If auth succeeded, generate a token and return it
            if (user) { 
                const token = user.generateJWT();
                console.log("Login Successful.");
                return res.status(200).json({ token });
            }

            // Else, return unauthenticated error
            else { return res.status(401).json(info); }
        })(req, res);
    } catch (err) {
        // Log error to console and return a server error
        console.error("Error during user login execution:", err);
        return res.status(400).json({ "error": err.message });
    }
};

// Middleware: Authenticate Bearer JWT
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ "message": "Access denied. Token missing." });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Contains _id, email, name, role
        next();
    } catch (err) {
        return res.status(401).json({ "message": "Invalid or expired token." });
    }
};

// Middleware: Enforce Admin Role Access
const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === "admin") {
        next();
    } else {
        return res.status(403).json({ "message": "Access forbidden. Admin privileges required." });
    }
};

module.exports = { register, login, verifyToken, requireAdmin };