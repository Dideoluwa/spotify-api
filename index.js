const express = require("express");
const app = express();
const querystring = require("querystring");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const redirect_uri = process.env.redirect_uri;
const client_id = process.env.client_id;
const client_secret = process.env.client_secret;
const token_url = process.env.token_url;
const access_url = process.env.access_url;

app.use(cors());

let currDate = +Date.now();
let now = Date.now();

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

app.get("/currently-playing", async (req, res) => {
  axios({
    url: token_url,
    headers: {
      "Content-Type": "application/json",
    },
  }).then((tokenRes) => {
    if (tokenRes.status === 200) {
      axios({
        url: access_url,
        headers: {
          "Content-Type": "application/json",
        },
      }).then((DbResponse) => {
        if (DbResponse.status === 200) {
          if (tokenRes.data.expiryTime > now) {
            axios({
              url: `https://api.spotify.com/v1/me/player/recently-played`,
              headers: {
                Authorization: `Bearer ${tokenRes.data.access_token}`,
                "Content-Type": "application/json",
              },
            }).then((trackResponse) => {
              if (trackResponse.status === 200) {
                res.status(200).send(trackResponse.data.items[0].track);
              } else {
                res.status(400).json({
                  message: `Error occured`,
                });
              }
            });
          }
          if (tokenRes.data.expiryTime < now) {
            axios({
              method: "post",
              url: "https://accounts.spotify.com/api/token",
              data: querystring.stringify({
                grant_type: "refresh_token",
                refresh_token: DbResponse.data.refresh_token,
              }),
              headers: {
                "content-type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${new Buffer.from(
                  `${client_id}:${client_secret}`
                ).toString("base64")}`,
              },
            })
              .then((response) => {
                if (response.status === 200) {
                  const { access_token } = response.data;
                  let expiredTime = currDate + 3600;
                  axios({
                    method: "put",
                    url: token_url,
                    headers: {
                      "Content-Type": "application/json",
                    },
                    data: JSON.stringify({
                      access_token: access_token,
                      expiryTime: expiredTime,
                    }),
                  }).then((putRes) => {
                    if (putRes.status === 200) {
                      axios({
                        url: `https://api.spotify.com/v1/me/player/recently-played`,
                        headers: {
                          Authorization: `Bearer ${access_token}`,
                          "Content-Type": "application/json",
                        },
                      }).then((currListSong) => {
                        if (currListSong.status === 200) {
                          res
                            .status(200)
                            .send(currListSong.data.items[0].track);
                        } else {
                          res.status(400).json({
                            message: `Error occured`,
                          });
                        }
                      });
                    }
                  });
                } else {
                  console.log(response.expires_in);
                }
              })
              .catch((error) => {
                console.log(error);
              });
          }
        } else {
          console.log(DbResponse);
        }
      });
    } else {
      console.log(tokenRes);
    }
  });
});

app.get("/login", (req, res) => {
  const state = generateRandomString(16);
  res.cookie(stateKey, state);

  const scope =
    "user-read-private user-read-email ugc-image-upload user-read-playback-state user-read-currently-playing user-modify-playback-state app-remote-control streaming playlist-read-private playlist-read-collaborative playlist-modify-private playlist-modify-public user-read-playback-position user-top-read user-read-recently-played user-library-modify user-library-read";
  const queryParams = querystring.stringify({
    client_id: client_id,
    response_type: "code",
    redirect_uri: redirect_uri,
    scope: scope,
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
      "content-type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${new Buffer.from(
        `${client_id}:${client_secret}`
      ).toString("base64")}`,
    },
  })
    .then((response) => {
      if (response.status === 200) {
        const { access_token, refresh_token, expires_in } = response.data;
        let time = Date.now();
        let expiryTime = time + expires_in;
        axios({
          url: `https://api.spotify.com/v1/me`,
          headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/json",
          },
        }).then((response) => {
          if (response.status === 200) {
            console.log(response.data.id);
            if (response.data.id === "22tlod5b4sujuk2jxfja6cjjy") {
              axios({
                method: "put",
                url: access_url,
                headers: {
                  "Content-Type": "application/json",
                },
                data: JSON.stringify({
                  access_token: access_token,
                  refresh_token: refresh_token,
                  expiryTime: expiryTime,
                }),
              }).then((res) => {
                if (res.status === 200) {
                } else {
                  console.log(res.data);
                }
              });
            }
          }
        });
        const queryParams = querystring.stringify({
          access_token,
          refresh_token,
        });
        res.redirect(`http://localhost:3000/?${queryParams}`);
      } else {
        res.redirect(`/?${querystring.stringify({ error: "invalid_token" })}`);
      }
    })
    .catch((error) => {
      res.send(error);
    });
});

app.get("/refresh_token", (req, res) => {
  axios({
    url: access_url,
    headers: {
      "Content-Type": "application/json",
    },
  }).then((response) => {
    if (response.status === 200) {
      console.log(response.data);
      axios({
        method: "post",
        url: "https://accounts.spotify.com/api/token",
        data: querystring.stringify({
          grant_type: "refresh_token",
          refresh_token: response.data.refresh_token,
        }),
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${new Buffer.from(
            `${client_id}:${client_secret}`
          ).toString("base64")}`,
        },
      })
        .then((response) => {
          let timer = Date.now();
          let expiryTime = timer + response.data.expires_in;
          axios({
            method: "put",
            url: token_url,
            headers: {
              "Content-Type": "application/json",
            },
            data: JSON.stringify({
              access_token: response.data.access_token,
              expiryTime: expiryTime,
            }),
          });
          console.log(response.data);
          res.send(response.data);
        })
        .catch((error) => {
          res.send(error);
        });
    } else {
      console.log(response.data);
    }
  });
});

app.listen(process.env.PORT || 8000, () => {
  console.log("listening on port 8000");
});
