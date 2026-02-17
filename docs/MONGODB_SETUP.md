# MongoDB Setup Guide

## Installation Steps

### 1. Get Your MongoDB Connection String

You have several options to get a MongoDB connection string:

#### Option A: MongoDB Atlas (Recommended - Cloud)
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free account
3. Create a new cluster
4. Click "Connect" and copy the connection string
5. It will look like: `mongodb+srv://username:password@cluster.mongodb.net/databasename?retryWrites=true&w=majority`

#### Option B: Local MongoDB
1. Install MongoDB from https://www.mongodb.com/try/download/community
2. Start MongoDB service
3. Use connection string: `mongodb://localhost:27017/anjii`

#### Option C: MongoDB Community Edition Docker
```bash
docker run -d -p 27017:27017 --name mongodb mongo
```
Connection string: `mongodb://localhost:27017/anjii`

### 2. Update Your .env File

Edit `.env` in the root directory and add your connection string:

```
MONGODB_URI=your_mongodb_connection_string_here
JWT_SECRET=your-secret-key-change-in-production
PORT=5000
```

**Example with Atlas:**
```
MONGODB_URI=mongodb+srv://myuser:mypassword@cluster0.abcd1234.mongodb.net/anjii?retryWrites=true&w=majority
JWT_SECRET=my-super-secret-key-12345
PORT=5000
```

**Example with Local MongoDB:**
```
MONGODB_URI=mongodb://localhost:27017/anjii
JWT_SECRET=my-super-secret-key-12345
PORT=5000
```

### 3. Restart Your Backend Server

```bash
cd backend
node server.js
```

If successfully connected, you should see:
```
✅ Connected to MongoDB
✅ Server running on http://localhost:5000
```

## Features

- ✅ User registration with MongoDB persistence
- ✅ User login with bcrypt password hashing
- ✅ JWT token authentication
- ✅ User profile management
- ✅ Automatic password hashing
- ✅ Fallback to in-memory storage if MongoDB is unavailable

## Database Schema

### User Model

```javascript
{
  _id: ObjectId,
  fullName: String,
  email: String (unique, lowercase),
  password: String (hashed),
  userType: String (enum: ['student', 'alumni']),
  company: String (optional),
  skills: [String],
  registrationDate: Date
}
```

## Troubleshooting

### Connection Refused
- Check your MongoDB service is running
- Verify connection string is correct
- For Atlas, ensure your IP address is whitelisted

### Authentication Failed
- Verify username and password in connection string
- Check special characters are URL encoded
- Ensure user has appropriate permissions in MongoDB

### Data Not Persisting
- Check MongoDB connection string is in .env
- Verify database name is correct
- Check MongoDB user has write permissions

For more help, check the MongoDB documentation:
- https://docs.mongodb.com/
- https://www.mongodb.com/docs/manual/
