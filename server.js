const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const axios = require('axios');
const User = require('./models/User');
const Activity = require('./models/Activity');

const app = express();
app.use(bodyParser.json());

mongoose.connect('mongodb://localhost:27017/translateApp', { useNewUrlParser: true, useUnifiedTopology: true });

// User Registration
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.json({ message: 'User registered successfully' });
});

// User Login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, 'secret', { expiresIn: '1h' });
    res.json({ token });
});

// Translation Endpoint
app.post('/translate', async (req, res) => {
    const { text, targetLang, token } = req.body;
    try {
        const decoded = jwt.verify(token, 'secret');
        const user = await User.findById(decoded.id);

        const response = await axios.post('https://translation-api-url', { text, targetLang });
        const translatedText = response.data.translatedText;

        const activity = new Activity({ user: user._id, text, translatedText, targetLang });
        await activity.save();

        res.json({ translatedText });
    } catch (error) {
        res.status(400).json({ message: 'Error translating text' });
    }
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});

