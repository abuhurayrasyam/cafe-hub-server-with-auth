const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Welcome to CafeHub Server');
});

app.listen(port, () => {
  console.log(`CafeHub Server is Running on Port ${port}`)
})