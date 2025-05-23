require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const path = require('path');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize Firebase Admin SDK
const serviceAccount = require(path.join(__dirname, 'cafe-hub-app-firebase-adminsdk-fbsvc-14597fb726.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// MongoDB connection string
const uri = `mongodb+srv://${process.env.CAFEHUB_DB_USER}:${process.env.CAFEHUB_DB_PASS}@cluster0.aamwoxj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    
    // Connect to the "coffeesdb" database and access its "coffees" collection
    const coffeesCollection = client.db("coffeesdb");
    const coffees = coffeesCollection.collection("coffees");
    // Connect to the "coffeesdb" database and access its "users" collection
    const usersCollection = client.db("coffeesdb");
    const users = usersCollection.collection("users");


    // Coffee CRUD
    // Get data from client and transfer to database
    app.post('/coffees', async(req, res) => {
        const newCoffee = req.body;
        // Insert the defined document into the "coffees" collection
        const result = await coffees.insertOne(newCoffee);
        res.send(result);
    })

    // Get data from database and transfer to client
    app.get('/coffees', async(req, res) => {
        // Execute query
        const cursor = coffees.find(); // If any sorting functionality, add here
        const result = await cursor.toArray();
        res.send(result);
    })

    // Get a single data from database and transfer to client
    app.get('/coffees/:id', async(req, res) => {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result = await coffees.findOne(query);
        res.send(result);
    })

    // Get a Coffee from database and transfer to client and update it, after update it transfer to database from client
    app.put('/coffees/:id', async(req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updatedCoffee = req.body;
      const updatedDoc = {
        $set: updatedCoffee
      };
      const options = {upsert: true};
      const result = await coffees.updateOne(filter, updatedDoc, options);
      res.send(result);
    })

    // Delete a Coffee From Database
    app.delete('/coffees/:id', async (req, res) => {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result = await coffees.deleteOne(query);
        res.send(result);
    })

    // User CRUD
    // Get data from client and transfer to database
    app.post('/users', async(req, res) => {
      const newUser = req.body;
      const result = await users.insertOne(newUser);
      res.send(result);
    })

    // Get data from database and transfer to client
    // app.get('/users', async(req, res) => {
    //     const result = await users.find().toArray();
    //     res.send(result);
    // })

    // Get data from database and transfer to client with search functionality
    app.get('/users', async(req, res) => {
        const {searchQuery} = req.query;
        let query = {};
        if(searchQuery){
          // query = {name: {$regex: searchQuery, $options: "i"}} // Single Query
          query = {
            $or: [
              { name: { $regex: searchQuery, $options: "i" } },
              { email: { $regex: searchQuery, $options: "i" } },
              { phoneNumber: { $regex: searchQuery, $options: "i" } },
              { address: { $regex: searchQuery, $options: "i" } }
            ]
          }
        }

        const result = await users.find(query).toArray();
        res.send(result);
    })

    // update lastSignInTime in db (single data)
    app.patch('/users', async(req, res) => {
      const {email, lastSignInTime} = req.body;
      const filter = {email: email};
      const updatedDoc = {
        $set: {
          lastSignInTime: lastSignInTime
        }
      };
      const result = await users.updateOne(filter, updatedDoc);
      res.send(result);
    })

    // Delete a User From Database
    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      try {
        // Find user document in MongoDB
        const user = await users.findOne({ _id: new ObjectId(id) });
        if (!user) {
          return res.status(404).send({ message: 'User not found' });
        }
        // Delete from Firebase Auth using firebaseUid or email
        if (user.firebaseUid) {
          await admin.auth().deleteUser(user.firebaseUid);
        } else if (user.email) {
          try {
            const firebaseUser = await admin.auth().getUserByEmail(user.email);
            if (firebaseUser) {
              await admin.auth().deleteUser(firebaseUser.uid);
            }
          } catch (firebaseErr) {
            // User may not exist in Firebase Auth - log and continue
            console.warn(`Firebase user not found for email: ${user.email}`);
          }
        }
        // Delete user document from MongoDB
        const query = { _id: new ObjectId(id) };
        const result = await users.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).send({ message: 'Failed to delete user', error: error.message });
      }
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Welcome to CafeHub Server');
});

app.listen(port, () => {
  console.log(`CafeHub Server is Running on Port ${port}`)
})