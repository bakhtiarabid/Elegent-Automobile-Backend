const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const { MongoClient } = require("mongodb");
const admin = require("firebase-admin");
const ObjectId = require("mongodb").ObjectId;

const port = process.env.PORT || 5000;

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
   credential: admin.credential.cert(serviceAccount),
});

// middleware

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xztta.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
   useNewUrlParser: true,
   useUnifiedTopology: true,
});

console.log(uri);

async function verifyToken(req, res, next) {
   if (req.headers?.authorization?.startsWith("Bearer ")) {
      const token = req.headers.authorization.split(" ")[1];

      try {
         const decodedUser = await admin.auth().verifyIdToken(token);
         req.decodedEmail = decodedUser.email;
      } catch {}
   }
   next();
}

async function run() {
   try {
      await client.connect();
      console.log("Connected to MongoDB");
      const database = client.db("elegent_automobile");
      const vehiclesCollection = database.collection("vehicles");
      const ordersCollection = database.collection("orders");
      const usersCollection = database.collection("users");
      const reviewCollection = database.collection("review");

      //GET VEHICLES API
      app.get("/vehicles", async (req, res) => {
         const cursor = vehiclesCollection.find({});
         const result = await cursor.toArray();
         res.json(result);
      });

      //POST VEHICLES API

      app.post("/vehicles", async (req, res) => {
         const addData = req.body;
         console.log("orderData", addData);
         const result = await vehiclesCollection.insertOne(addData);
         res.json(result);
      });

      //GET Single Item API
      app.get("/vehicles/:id", async (req, res) => {
         const id = req.params.id;
         console.log("getting specific plan", id);
         const query = { _id: ObjectId(id) };
         const vehicle = await vehiclesCollection.findOne(query);
         res.json(vehicle);
      });

      //POST PLACE ORDER API
      app.post("/placeorder", async (req, res) => {
         const orderData = req.body;
         console.log("orderData", orderData);
         const result = await ordersCollection.insertOne(orderData);
         res.json(result);
      });

      app.get("/placeorder", async (req, res) => {
         const cursor = ordersCollection.find({});
         const result = await cursor.toArray();
         res.json(result);
      });
      // GET USERS ORDER API
      app.get("/placeorder/:email", async (req, res) => {
         const email = req.params.email;

         const query = { email: email };

         const cursor = ordersCollection.find(query);
         const userOrder = await cursor.toArray();
         res.json(userOrder);
      });

      //USERS API
      app.post("/users", async (req, res) => {
         const user = req.body;
         const result = await usersCollection.insertOne(user);
         console.log(result);
         res.json(result);
      });

      app.put("/users", async (req, res) => {
         const user = req.body;
         const filter = { email: user.email };
         const options = { upsert: true };
         const updateDoc = { $set: user };
         const result = await usersCollection.updateOne(
            filter,
            updateDoc,
            options
         );
         res.json(result);
      });

      //UPDATE API
      app.put("/placeorder/:id", async (req, res) => {
         const id = req.params.id;
         const updatedStatus = req.body;
         console.log(updatedStatus);
         const filter = { _id: ObjectId(id) };
         const options = { upsert: true };
         const updateDoc = {
            $set: {
               status: "shipped",
            },
         };
         const result = await ordersCollection.updateOne(
            filter,
            updateDoc,
            options
         );
         console.log("updating", id);
         res.json(result);
      });

      //ADMIN API
      app.put("/users/admin", verifyToken, async (req, res) => {
         const user = req.body;
         const requester = req.decodedEmail;
         if (requester) {
            const requesterAccount = await usersCollection.findOne({
               email: requester,
            });
            if (requesterAccount.role === "admin") {
               const filter = { email: user.email };
               const updateDoc = { $set: { role: "admin" } };
               const result = await usersCollection.updateOne(
                  filter,
                  updateDoc
               );
               res.json(result);
            }
         } else {
            res.status(403).json({
               message: "you do not have access to make admin",
            });
         }
      });

      //GET ADMIN API
      app.get("/users/:email", async (req, res) => {
         const email = req.params.email;
         const query = { email: email };
         const user = await usersCollection.findOne(query);
         let isAdmin = false;
         if (user?.role === "admin") {
            isAdmin = true;
         }
         res.json({ admin: isAdmin });
      });

      //review api
      app.post("/review", async (req, res) => {
         const user = req.body;
         const result = await reviewCollection.insertOne(user);
         console.log(result);
         res.json(result);
      });

      //GET REVIEW API
      app.get("/review", async (req, res) => {
         const cursor = reviewCollection.find({});
         const result = await cursor.toArray();
         res.json(result);
      });

      //Cancel API for USERS

      app.delete("/deleorder/:id", async (req, res) => {
         const id = req.params.id;
         const query = { _id: ObjectId(id) };
         const result = await ordersCollection.deleteOne(query);
         res.json(result);
      });
      //DELETE API FOR VEHICLE
      app.delete("/vehicles/:id", async (req, res) => {
         const id = req.params.id;
         const query = { _id: ObjectId(id) };
         const result = await vehiclesCollection.deleteOne(query);
         res.json(result);
      });
   } finally {
      // await client.close();
   }
}

run().catch(console.dir);

app.get("/", (req, res) => {
   res.send("Elegent Automobile Server is running!");
});

app.listen(port, () => {
   console.log(`listening at ${port}`);
});
