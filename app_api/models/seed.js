// Import
const Mongoose = require("./db")
const Trip = require("./trip")

// Read seed data from json
var fs = require("fs")
var trips = JSON.parse(fs.readFileSync("../data/trips.json", "utf8"))

// Delete existing records then insert seed data
const seedDB = async() => {
    await Trip.deleteMany({})
    await Trip.insertMany(trips)
}

// Close DB connection and exit
seedDB().then(async() => {
    await Mongoose.connection.close()
    process.exit(0)
})
