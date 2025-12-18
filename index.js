const express = require("express");
const cors = require("cors");
require("dotenv").config();

const serviceAccount = require("./infraFbJson.json");
const admin = require("firebase-admin");

const port = process.env.PORT || 4000;
const app = express();

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = process.env.MONGODB_URI;

// Create a MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function run() {
  try {
    // Connect once
    await client.connect();

    const InfraDB = client.db("infraDB");
    const IssuesCollection = InfraDB.collection("issues");
    const UsersCollection = InfraDB.collection("users");

    // Get all issues
    app.get("/issues", async (req, res) => {
      try {
        const {
          category,
          status,
          search,
          priority,
          limit = 0,
          skip = 0,
          recent,
        } = req.query;
        let query = {};
        if (category) {
          query.category = category;
        }
        if (status) {
          query.status = status;
        }
        if (priority) {
          query.priority = priority;
        }
        if (search) {
          query.title = { $regex: search, $options: "i" };
        }
        const sort = {};
        if (recent == "true") {
          sort.created_at = -1;
        }
        const result = await IssuesCollection.find(query)
          .sort(sort)
          .limit(Number(limit))
          .skip(Number(skip))
          .project({ description: 0, updated_at: 0 })
          .toArray();

        const count = await IssuesCollection.countDocuments(query);

        // res.send(result);
        res.send({ result, total: count });
      } catch (err) {
        res.status(500).send({ message: "Error fetching issues" });
      }
    });

    /***
     *  try {
        const { category, search, limit = 0, skip = 0, recent } = req.query;
        let query = {};

        if (category) {
          query.category = category;
        }
        if (search) {
          query.name = { $regex: search, $options: "i" };
        }
        const sort = {};
        if (recent == "true") {
          sort.createdAt = -1;
        }
        // sort.createdAt = -1;

        const result = await allCollection
          .find(query)
          .sort(sort)
          .limit(Number(limit))
          .skip(Number(skip))
          .project({ description: 0, email: 0 })
          .toArray();

        const count = await allCollection.countDocuments(query);

        // res.send(result);
        res.send({ result, total: count });
      } catch (error) {
        console.error("Error fetching listings:", error);
        res.status(500).send({ message: "Internal Server Error" });
      }
     * */

    app.post("/issues", async (req, res) => {
      try {
        const IssueData = req.body;

        IssueData.priority = "low";
        IssueData.status = "Pending";
        IssueData.created_at = new Date();

        console.log(IssueData);

        // Insert issue
        const result = await IssuesCollection.insertOne(IssueData);

        // Update user's issue count
        await UsersCollection.updateOne(
          { email: IssueData.reported_by },
          { $inc: { issuesReported: 1 } }
        );

        res.send(result);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Something went wrong" });
      }
    });

    app.patch("/issues/:issueId/rejected", async (req, res) => {
      const { issueId } = req.params;
      const Id = new ObjectId(issueId);
      const result = await IssuesCollection.updateOne(
        { _id: Id },
        {
          $set: { status: "Rejected" },
        }
      );
      res.send(result);
    });
    //user related api
    app.post("/users", async (req, res) => {
      try {
        const user = req.body;
        user.createdAt = new Date();
        user.issuesReported = 0;
        user.isPremium = false;
        user.isBlocked = false;
        const email = user.email;
        const userExists = await UsersCollection.findOne({ email });

        if (userExists) {
          return res.send({ message: "user already exists" });
        }
        const result = await UsersCollection.insertOne(user);
        res.send(result);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Something went wrong" });
      }
    });

    app.get("/users", async (req, res) => {
      const { role } = req.query;
      const result = await UsersCollection.find({ role }).toArray();
      res.send(result);
    });
    app.patch("/users/:email/blocked", async (req, res) => {
      const { email } = req.params;
      console.log(email);

      const user = await UsersCollection.findOne({ email });
      console.log(user);

      const result = await UsersCollection.updateOne(
        { email },
        {
          $set: {
            isBlocked: !user.isBlocked,
          },
        }
      );
      res.send(result);
    });

    app.post("/create-staff", async (req, res) => {
      const { name, email, password, phone, photoURL } = req.body;

      try {
        const user = await admin.auth().createUser({
          email,
          password,
          displayName: name,
          photoURL,
        });

        await UsersCollection.insertOne({
          uid: user.uid,
          displayName: name,
          email,
          phone,
          photoURL,
          status: "active",
          role: "staff",
          createdAt: new Date(),
        });

        res.send({ success: true });
      } catch (err) {
        res.status(500).send({ message: err.message });
      }
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = await UsersCollection.findOne({ email });

      if (!user) {
        return res.status(404).send({ success: false, user: null });
      }

      res.send({ success: true, user });
    });

    // GET all staff
    app.get("/staff", async (req, res) => {
      const result = await UsersCollection.find({ role: "staff" }).toArray();
      res.send(result);
    });

    // UPDATE staff
    app.patch("/staff/:email", async (req, res) => {
      const email = req.params.email;
      const updateData = req.body;

      const result = await UsersCollection.updateOne(
        { email },
        { $set: updateData }
      );

      res.send(result);
    });

    // DELETE staff
    app.delete("/staff/:email", async (req, res) => {
      const email = req.params.email;

      const result = await UsersCollection.deleteOne({ email });
      res.send(result);
    });

    app.patch("/users/update/:email", async (req, res) => {
      try {
        const updatedData = req.body;
        const email = req.params.email;

        const result = await UsersCollection.updateOne(
          { email },
          { $set: updatedData }
        );

        res.send(result);
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Failed to update user" });
      }
    });

    console.log("MongoDB Connected Successfully");
  } catch (error) {
    console.error("Database Error:", error);
  }
}

run();

app.get("/", (req, res) => {
  res.send("Hello from Server..");
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
