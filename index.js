require('dotenv').config();
process.env.TimeZone = 'Asia/Kolkata'; // Force IST for all new Date() calls
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const initDB = require('./config/dbInit');

const fileuploadRoutes = require("./routes/fileuploadRoutes");
const usersRoutes = require('./routes/usersRoutes');
const siteconfigRoutes = require('./routes/siteconfigRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const homeBannerRoutes = require('./routes/homeBannerRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const customerRoutes = require('./routes/customerRoutes');
const customerAddressRoutes = require('./routes/customerAddressRoutes');
const paymentSettingsRoutes = require('./routes/paymentSettingsRoutes');
const orderRoutes = require('./routes/orderRoutes');
const promoBannerRoutes = require('./routes/promoBannerRoutes');
const faqRoutes = require('./routes/faqRoutes');
const abandonCheckoutRoutes = require('./routes/abandonCheckoutRoutes');
const aboutUsRoutes = require('./routes/aboutUsRoutes');
const legalPagesRoutes = require('./routes/legalPagesRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// trust proxy (for correct req.ip behind proxies/CDNs)
app.set('trust proxy', true);

// CORS options
const corsOptions = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '50mb' }));

app.use("/api/file", fileuploadRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/siteconfig', siteconfigRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/homebanner', homeBannerRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/product', productRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/customer-address', customerAddressRoutes);
app.use('/api/payment-settings', paymentSettingsRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/promo-banner', promoBannerRoutes);
app.use('/api/faq', faqRoutes);
app.use('/api/abandon-checkout', abandonCheckoutRoutes);
app.use('/api/about-us', aboutUsRoutes);
app.use('/api/legal', legalPagesRoutes);

// Run DB init (non-blocking for Vercel serverless)
initDB().catch((err) => {
  console.error('❌ DB init failed:', err);
});

// Export for Vercel serverless
module.exports = app;

// Start HTTP server on local + VPS (skip only on Vercel serverless)
const isVercel = process.env.VERCEL === '1';
if (!isVercel) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on http://0.0.0.0:${PORT}`);
  });
}