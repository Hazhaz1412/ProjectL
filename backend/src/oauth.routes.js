const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const express = require('express');
const session = require('express-session');
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'lung_app';

async function getDb() {
  const client = await MongoClient.connect(MONGO_URI, { useUnifiedTopology: true });
  return client.db(DB_NAME);
}
 
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.PUBLIC_URL.replace(/\/$/, '')}/auth/google/callback`,
},
  async (accessToken, refreshToken, profile, done) => {
    try {
      const db = await getDb();
      const users = db.collection('users');
      let user = await users.findOne({ email: profile.emails[0].value });
      if (user) {
        // Nếu user đã có (dù là thủ công hay oauth), cập nhật provider nếu cần
        if (!user.provider) {
          await users.updateOne({ _id: user._id }, { $set: { provider: 'google' } });
        }
      } else {
        // Tạo user mới với provider google
        user = {
          email: profile.emails[0].value,
          provider: 'google',
          is_active: true,
          is_admin: false,
          roles: [],
          extra_permissions: [],
          created_at: new Date(),
          updated_at: new Date(),
          password: null  
        };
        const result = await users.insertOne(user);
        user._id = result.insertedId;
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user._id);
});
passport.deserializeUser(async (id, done) => {
  try {
    const db = await getDb();
    const users = db.collection('users');
    const user = await users.findOne({ _id: new ObjectId(id) });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
 
router.use(session({
  secret: process.env.JWT_SECRET || 'your_jwt_secret',
  resave: false,
  saveUninitialized: false
}));
router.use(passport.initialize());
router.use(passport.session());

// Google OAuth login
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/auth/google/fail' }), (req, res) => {
  // Đăng nhập thành công, trả về JWT
  const user = req.user;
  const payload = {
    user_id: user._id,
    email: user.email,
    roles: user.roles || [],
    extra_permissions: user.extra_permissions || []
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  // Có thể redirect về FE kèm token hoặc trả về JSON
  res.json({ token });
});

router.get('/google/fail', (req, res) => {
  res.status(401).json({ message: 'Google login failed' });
});

module.exports = router;
