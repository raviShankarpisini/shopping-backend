const mongoose = require("mongoose");

//
const signInSchema = new mongoose.Schema({
	username: {
		type: String,
		required: true,
	},
	email: {
		type: String,
		required: true,
	},
	password: {
		type: String,
		required: true,
	},
});

const signIn = mongoose.model("signIn", signInSchema);
module.exports = signIn;
