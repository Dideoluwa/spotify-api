const express = require("express");
const app = express();
const querystring = require("querystring");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const redirect_uri = process.env.redirect_uri;
const client_id = process.env.client_id;
const client_secret = process.env.client_secret;

console.log("Come here");

app.use(
  cors({
    origin: "*",
  })
);

app.get("/", (req, res) => {
  res.send("hello world");
});

const generateRandomString = (length) => {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const stateKey = "spotify_auth_state";

app.get("/login", (req, res) => {
  const state = generateRandomString(16);
  res.cookie(stateKey, state);

  const scope = "user-read-private user-read-email";
  const queryParams = querystring.stringify({
    client_id: client_id,
    response_type: "code",
    redirect_uri: redirect_uri,
  });
  res.redirect(`https://accounts.spotify.com/authorize?${queryParams}`);
});

app.get("/callback", (req, res) => {
  const code = req.query.code || null;

  axios({
    method: "post",
    url: "https://accounts.spotify.com/api/token",
    data: querystring.stringify({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: redirect_uri,
    }),
    headers: {
      "Access-Control-Allow-Origin": "*",
      "content-type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${new Buffer.from(
        `${client_id}:${client_secret}`
      ).toString("base64")}`,
    },
  })
    .then((response) => {
      if (response.status === 200) {
        const { access_token, token_type } = response.data;
        const { refresh_token } = response.data;
        axios
          .get(
            `https://spotifyapi-production.up.railway.app/refresh_token?refresh_token=${refresh_token}`,
            {
              headers: {
                "Access-Control-Allow-Origin": "*",
                Authorization: `${token_type} ${access_token}`,
              },
            }
          )
          .then((response) => {
            res.send(`<pre>${JSON.stringify(response.data, null, 2)}</pre>`);
          })
          .catch((error) => {
            res.send(error);
          });
      } else {
        res.send(response);
      }
    })
    .catch((error) => {
      res.send(error);
    });
});

app.get("/refresh_token", (req, res) => {
  const { refresh_token } = req.query;

  axios({
    method: "post",
    url: "https://accounts.spotify.com/api/token",
    data: querystring.stringify({
      grant_type: "refresh_token",
      refresh_token: refresh_token,
    }),
    headers: {
      "Access-Control-Allow-Origin": "*",
      "content-type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${new Buffer.from(
        `${client_id}:${client_secret}`
      ).toString("base64")}`,
    },
  })
    .then((response) => {
      res.send(response.data);
    })
    .catch((error) => {
      res.send(error);
    });
});

app.listen(process.env.PORT || 8080, () => {
  console.log("listening on port 8080");
});
