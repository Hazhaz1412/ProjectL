const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const { xss } = require('express-xss-sanitizer');

const session = require('express-session');
const app = express();

const Redis = require('ioredis');
const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379
});

redis.on('connect', () => console.log('Connected to Redis'));
redis.on('error', (err) => console.error('Redis error:', err));

app.set('redis', redis);
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors());
app.use(express.json({limit : '20kb'})); 
app.use(session({
  secret: process.env.JWT_SECRET || 'your_jwt_secret',
  resave: false,
  saveUninitialized: false
}));
app.use((req, res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body);
  if (req.params) mongoSanitize.sanitize(req.params);
  next();
}); 
app.use(xss());

if (process.env.USE_RATE_LIMIT === 'true') {
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests, please try again later.'
  }));
}


app.get('/', (req, res) => {
  res.send('Backend is working!');
});
const adminRoutes = require('./src/admin.routes');
app.use('/auth', require('./src/auth.routes'));
app.use('/admin', adminRoutes);

app.use('/auth', require('./src/oauth.routes'));
 
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
}); 
app.use((req, res) => {
  res.status(404).json({ message: 'Not found' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
