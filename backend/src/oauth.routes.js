const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const express = require('express');
const session = require('express-session');
const { ObjectId } = require('mongodb');
const { getDbWrite, getDbRead } = require('./db.rw');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
 
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.PUBLIC_URL.replace(/\/$/, '')}/auth/google/callback`,
},
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Đọc user từ DB read
      const dbRead = await getDbRead();
      const usersRead = dbRead.collection('users');
      let user = await usersRead.findOne({ email: profile.emails[0].value });
      
      if (user) { 
        if (!user.provider) {
          // Cập nhật provider (thao tác ghi)
          const dbWrite = await getDbWrite();
          await dbWrite.collection('users').updateOne({ _id: user._id }, { $set: { provider: 'google' } });
        }
      } else { 
        // Tạo user mới (thao tác ghi)
        const dbWrite = await getDbWrite();
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
        const result = await dbWrite.collection('users').insertOne(user);
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
    // Đọc user từ DB read
    const dbRead = await getDbRead();
    const users = dbRead.collection('users');
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
 
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/auth/google/fail' }), (req, res) => {
 
  const user = req.user;
  const payload = {
    user_id: user._id,
    email: user.email,
    roles: user.roles || [],
    extra_permissions: user.extra_permissions || []
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }); 
  res.json({ token });
});

router.get('/google/fail', (req, res) => {
  res.status(401).json({ message: 'Google login failed' });
});

module.exports = router;
