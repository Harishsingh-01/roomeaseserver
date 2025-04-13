const mongoose = require("mongoose");
const User = require("./models/User"); // Adjust the path if your model is stored elsewhere

// MongoDB connection
mongoose.connect(
  "mongodb+srv://harishchaudhary790:mymongodb123@cluster0.or3xpiz.mongodb.net/",
  { useNewUrlParser: true, useUnifiedTopology: true }
)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Connection error:", err));

// Function to add user data
const addUsersData = async () => {
  try {
    // Step 1: Delete all previous users (optional)
    await User.deleteMany({});
    console.log("Previous user data cleared.");

    // Step 2: Add new user data
    const users = [
      {
        _id: "67d6595a1c42b360da16b729",
        name: "aaaaaa",
        email: "aaaaa@gmail.com",
        password: "$2b$10$VUq2gTb/kXZl4bB8uzH04eodfeD5IkqoYeFG1UGZNsYxrPrxHOo1i",
        role: "user"
      },
      {
        _id: "67d66395d2439f81f6689480",
        name: "Harish",
        email: "harishchaudhary790@gmail.com",
        password: "$2b$10$3smGcLS918.WwMOTIV3qguKwFrq9y9kANUVpRwRssEjuhpSDGDtZm",
        role: "user"
      },
      {
        _id: "67d6e6cdfe5a3a8224a30e2f",
        name: "harish",
        email: "harishchaudharyinsta@gmail.com",
        password: "$2b$10$VXCWJGeQummwBcAvCURsZuheK5WvJRoEkhF9Syxk5UDxDb1NfLMIa",
        role: "user"
      },
      {
        _id: "67d991abd2336c33f9a1bb71",
        name: "Admin",
        email: "admin@test",
        password: "$2b$10$ZHI8P5OB2vmgwpYISGwJBuye917Es1RU8ZjW7QOPiNR5OyeFmnfju",
        role: "admin"
      },
      {
        _id: "67de200423bc4dddd2da607c",
        name: "Gaurav Sharma",
        email: "gaurav.sharma_bca23@gla.ac.in",
        password: "$2b$10$F8MxpsYMiI/9747IIj.T0Olut/QfSMZOykdw6VBGptRoLZNLXBVf.",
        role: "user"
      },
      {
        _id: "67de50bf136f6637c737af0f",
        name: "Harsh",
        email: "harishchaudhary1110@gmail.com",
        password: "$2b$10$2o9EIgQLlqp2TSIF9HUAT.9ra5dy8VtZOB6d4zKS4ww93KN3WOJdS",
        role: "user"
      },
      {
        _id: "67e2a8edb29d58d5f9538b88",
        name: "Janvi Sharma",
        email: "js6508754@gmail.com",
        password: "$2b$10$ICtW21Rn.v/Uga91T0c2OOPJmNV7Mnfl8rHxuADw5xXRC7z1m2Y.y",
        role: "user"
      },
      {
        _id: "67ebce0f3f6875119389887b",
        name: "Devang",
        email: "devangshukla218@gmail.com",
        password: "$2b$10$JXgPP81lfmaaxQO0QIYkoujKPd3fLcD2KHOU1Cu.h81hNtKGBtMSy",
        role: "user"
      }
    ];

    const addedUsers = await User.insertMany(users);
    console.log("User data added:", addedUsers);
  } catch (err) {
    console.error("Error while adding users:", err);
  } finally {
    mongoose.connection.close();
  }
};

// Run the function
addUsersData();
