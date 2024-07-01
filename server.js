const express = require("express");
const dotEnv = require("dotenv");
const cors = require("cors");
const bodyParser = require("body-parser");
const { default: mongoose, Schema } = require("mongoose");
const { MongoClient, ObjectId } = require("mongodb"); // M should be capital
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const signIn = require("./models/shoppingModels");

const app = express();

app.use(cors());

// app.use(bodyParser.json());
app.use(express.json()) // this is the latest method
dotEnv.config();
const port = process.env.PORT || 8000;

app.listen(port, () => {
	console.log(`server running at ${port}`);
});

const dbConnection = async () => {
	try {
		await mongoose.connect(process.env.MONGO_URL);
	} catch (error) {
		console.log("error while db connection ", error);
	}
};

dbConnection();
// ----------------this is one way of writing schema ------
// const dbName = mongoose.connection.useDb("shopping");
// const modalName = dbName.model(
// 	"loginDetails",
// 	new Schema({}, { strict: false })
// );
// --------------------------------------------------------

const authorizeToken = async (req, res, next) => {
	try {
		let jwtToken;
		const headers = req.headers["authorization"];
		if (headers !== undefined) {
			jwtToken = headers.split(" ")[1];
		}

		if (jwtToken !== undefined) {
			jwt.verify(jwtToken, "random", async (error, payload) => {
				if (error) {
					res.status(400).json({ message: "Invalid token" }); // always maintain staus code first. if we dont maintain like that we get 200 response even if we give 400
				} else {
					next();
				}
			});
		} else {
			res.status(400).json({ message: "Invalid token" }); // always maintain staus code first. if we dont maintain like that we get 200 response even if we give 400
		}
	} catch (error) {
		res.json({ error });
	}
};

app.post("/login", async (req, res) => {
	try {
		const checkingUser = await signIn.findOne({
			$or: [
				{ username: req.body.username },
				{ email: req.body.username },
			],
		});

		if (checkingUser === null) {
			res.status(400).json({
				// always maintain staus code first. if we dont maintain like that we get 200 response even if we give 400
				message: "user doesn't exist please create account",
			});
		} else {
			const checkingPassword = await bcrypt.compare(
				req.body.password,
				checkingUser.password
			);
			if (checkingPassword) {
				const jwtToken = jwt.sign(req.body.username, "random");
				res.status(200).json({ jwt_token: jwtToken });
			} else {
				res.status(400).json({ message: "Incorrect password" }); // always maintain staus code first. if we dont maintain like that we get 200 response even if we give 400
			}
		}
	} catch (error) {
		res.status(400).json(error); // always maintain staus code first. if we dont maintain like that we get 200 response even if we give 400
	}
});

app.post("/register", async (req, res) => {
	const { username, email, password } = req.body;
	try {
		const checkingUser = await signIn.findOne({ email });

		if (checkingUser === null) {
			const hashPassword = await bcrypt.hash(password, 12);
			// await login.insertMany({ // can also use this line
			// 	username: req.body.username,
			// 	password: req.body.password,
			// });
			// await login.save(); no need to write this line
			await signIn.create({
				username,
				password: hashPassword,
				email,
			});

			// await signIn.create({
			// 	username,
			// 	password,
			// 	email,
			// });
			res.status(200).json({
				message: "user account created successfully please login",
			});
		} else {
			res.status(400).json({
				message: "user already exists please login",
			}); // always maintain staus code first. if we dont maintain like that we get 200 response even if we give 400
		}
	} catch (error) {
		res.json({ error });
	}
});

let db;

const connectToMongoDB = async () => {
	try {
		const client = await MongoClient.connect(process.env.MONGO_URL);
		db = client.db(); // No need to specify dbName again because we given in the url. if not we need to write like this client.db(dbname);
	} catch (error) {
		console.error("Error connecting to MongoDB:", error);
	}
};

connectToMongoDB();

app.get("/prime-deals", authorizeToken, async (req, res) => {
	try {
		const collection = db.collection("primedeals"); // this primedeals collection name is created in mongodb compass not by schema;
		const data = await collection.find().toArray(); // if i convert data to toArray(). i will get cursor error
		res.json({ prime_deals: data });
	} catch (error) {
		res.json({ error });
	}
});

app.get("/products", authorizeToken, async (req, res) => {
	const { sort_by, category, title_search, rating } = req.query;
	// change cate

	try {
		const collection = await db.collection("products");

		// Building the query object
		let query = {};

		if (category) {
			query.category = category;
		}

		if (rating) {
			query.rating = { $gte: parseFloat(rating) };
		}

		if (title_search) {
			query.title = { $regex: title_search, $options: "i" }; // Case-insensitive search
		}

		// Sorting object
		let sort = {};
		if (sort_by) {
			sort.price = parseInt(sort_by);
		}

		const data = await collection.find(query).sort(sort).toArray();

		// const data = await collection.find({ category }).toArray();
		res.json({ products: data });

		// 	db.products.find({
		// 		category: "cloths",
		// 		title: { $regex: "toy", $options: "i" }, // Case-insensitive search
		// 		rating: 4.5
		// 	  }).sort({ price: -1 }); // Sorting by price in descending order (HIGH_LOW)
	} catch (error) {
		res.json({ error });
	}
});

app.get("/products/:id", authorizeToken, async (req, res) => {
	try {
		const { id } = req.params;

		const filterId = parseInt(id);
		const collection = await db.collection("individualproducts");
		const data = await collection.find({ id: filterId }).toArray();
		res.json(data);
	} catch (error) {
		res.json({ error });
	}
});
