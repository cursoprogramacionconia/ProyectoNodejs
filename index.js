const express = require("express");

const app = express();

const port = 3000;


app.get('/', (req, res) => {
      res.send('Mi proyecto Codex ejemplo1'); 
});

app.listen(port,()=>{{
    console.log(`Server Iniciado (http://localhost:${port})`);
}});