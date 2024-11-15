const express = require("express");
require("dotenv").config();

const app = express();

const port = process.env.PORT || 3001;

const loginRoutes = require("./src/routes/autoLogin");

app.use("/auto-login", loginRoutes);

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
