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
const token_url2 = process.env.token_url2;
const access_url = process.env.access_url;
const base_url = `https://api.spotify.com/v1/me/player`;
const accountBaseUrl = `https://accounts.spotify.com/api`;

app.use(cors());

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

const getUserProfile = (access_token) => {
  const res = axios({
    url: `https://api.spotify.com/v1/me`,
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
    },
  });
  return res;
};

const getAccessToken = () => {
  const accessTokenResponse = axios({
    url: token_url,
    headers: {
      "Content-Type": "application/json",
    },
  });
  return accessTokenResponse;
};

const getAccessToken2 = () => {
  const accessTokenResponse = axios({
    url: token_url2,
    headers: {
      "Content-Type": "application/json",
    },
  });
  return accessTokenResponse;
};

const getRefreshToken = () => {
  const refreshTokenRes = axios({
    url: access_url,
    headers: {
      "Content-Type": "application/json",
    },
  });
  return refreshTokenRes;
};

const fetchLastPlayedSong = (payload) => {
  const res = axios({
    url: `${base_url}/recently-played`,
    headers: {
      Authorization: `Bearer ${payload}`,
      "Content-Type": "application/json",
    },
  });
  return res;
};

const fetchCurrPlayingSong = (payload) => {
  const res = axios({
    url: `${base_url}/currently-playing`,
    headers: {
      Authorization: `Bearer ${payload}`,
      "Content-Type": "application/json",
    },
  });
  return res;
};

const mixtape = (payload) => {
  const res = axios({
    url: `https://api.spotify.com/v1/playlists/37i9dQZF1EVHGWrwldPRtj`,
    headers: {
      Authorization: `Bearer ${payload}`,
      "Content-Type": "application/json",
    },
  });
  return res;
};

const getNewAccessToken = (payload) => {
  const res = axios({
    method: "post",
    url: `${accountBaseUrl}/token`,
    data: querystring.stringify({
      grant_type: "refresh_token",
      refresh_token: payload.refresh_token,
    }),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${new Buffer.from(
        `${client_id}:${client_secret}`
      ).toString("base64")}`,
    },
  });
  return res;
};

const postNewAccessToken = (payload) => {
  const res = axios({
    method: "put",
    url: token_url,
    headers: {
      "Content-Type": "application/json",
    },
    data: JSON.stringify({
      access_token: payload.access_token,
      expiryTime: payload.expiredTime,
    }),
  });
  return res;
};

const postNewAccessToken2 = (payload) => {
  const res = axios({
    method: "put",
    url: token_url2,
    headers: {
      "Content-Type": "application/json",
    },
    data: JSON.stringify({
      access_token: payload.access_token,
      expiryTime: payload.expiredTime,
    }),
  });
  return res;
};

const loginPostAccessToken = (payload) => {
  const res = axios({
    method: "put",
    url: access_url,
    headers: {
      "Content-Type": "application/json",
    },
    data: JSON.stringify({
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
      expiryTime: payload.expiryTime,
    }),
  });
  return res;
};

const getInitAccessToken = (payload) => {
  const res = axios({
    method: "post",
    url: "https://accounts.spotify.com/api/token",
    data: querystring.stringify({
      grant_type: "authorization_code",
      code: payload.code,
      redirect_uri: payload.redirect_uri,
    }),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${new Buffer.from(
        `${client_id}:${client_secret}`
      ).toString("base64")}`,
    },
  });
  return res;
};

app.get("/mixtape", async (req, res) => {
  const now = Date.now();
  const currDate = +Date.now();
  try {
    const accessToken = await getAccessToken2();
    const refreshToken = await getRefreshToken();
    if (accessToken.data.expiryTime > now) {
      const mixtapeRes = await mixtape(accessToken.data.access_token);
      if (mixtapeRes.status === 200) {
        res.status(200).send(mixtapeRes.data);
      }
    }
    if (accessToken.data.expiryTime < now) {
      const getNewAccess = await getNewAccessToken({
        refresh_token: refreshToken.data.refresh_token2,
      });
      const { access_token } = getNewAccess.data;
      let expiredTime = currDate + 3600;
      const postNewAccess = await postNewAccessToken2({
        access_token: access_token,
        expiredTime: expiredTime,
      });
      if (postNewAccess.status === 200) {
        const mixtapeRes = await mixtape(access_token);
        if (mixtapeRes.status === 200) {
          res.status(200).send(mixtapeRes.data);
        }
      }
    }
  } catch (error) {
    console.log(error.response);
  }
});

app.get("/currently-playing", async (req, res) => {
  const now = Date.now();
  const currDate = +Date.now();
  try {
    const accessToken = await getAccessToken();
    const refreshToken = await getRefreshToken();
    if (accessToken.data.expiryTime > now) {
      const currPlayingSong = await fetchCurrPlayingSong(
        accessToken.data.access_token
      );
      if (currPlayingSong.status === 204) {
        const lastPlayedSong = await fetchLastPlayedSong(
          accessToken.data.access_token
        );
        if (lastPlayedSong.status === 200) {
          res.status(200).send(lastPlayedSong.data.items[0].track);
        }
      } else if (currPlayingSong.status === 200) {
        res.status(200).send(currPlayingSong.data.item);
      }
    }
    if (accessToken.data.expiryTime < now) {
      const getNewAccess = await getNewAccessToken({
        refresh_token: refreshToken.data.refresh_token,
      });
      const { access_token } = getNewAccess.data;
      let expiredTime = currDate + 3600;
      const postNewAccess = await postNewAccessToken({
        access_token: access_token,
        expiredTime: expiredTime,
      });
      if (postNewAccess.status === 200) {
        const currPlayingSong = await fetchCurrPlayingSong(access_token);
        if (currPlayingSong.status === 204) {
          const lastPlayedSong = await fetchLastPlayedSong(access_token);
          if (lastPlayedSong.status === 200) {
            res.status(200).send(lastPlayedSong.data.items[0].track);
          }
        } else if (currPlayingSong.status === 200) {
          res.status(200).send(currPlayingSong.data.item);
        }
      }
    }
  } catch (error) {
    console.log(error.response);
  }
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

app.get("/callback", async (req, res) => {
  try {
    const code = req.query.code || null;
    const initialAccessToken = await getInitAccessToken({
      code: code,
      redirect_uri: redirect_uri,
    });
    if (initialAccessToken.status === 200) {
      const { access_token, refresh_token, expires_in } =
        initialAccessToken.data;
      let time = Date.now();
      let expiryTime = time + expires_in;
      const userProfile = await getUserProfile(access_token);
      if (userProfile.status === 200) {
        if (userProfile.data.id === "22tlod5b4sujuk2jxfja6cjjy") {
          const postLoginAccessToken = await loginPostAccessToken({
            access_token: access_token,
            refresh_token: refresh_token,
            expiryTime: expiryTime,
          });
          console.log(postLoginAccessToken);
        }
      }
      const queryParams = querystring.stringify({
        access_token,
        refresh_token,
      });
      res.redirect(`http://localhost:3000/?${queryParams}`);
    }
  } catch (error) {
    res.send(error.response);
  }
});

app.get("/refresh_token", async (req, res) => {
  try {
    const refreshToken = await getRefreshToken();
    const getNewAccess = await getNewAccessToken({
      refresh_token: refreshToken.data.refresh_token,
    });
    const { access_token, expires_in } = getNewAccess.data;
    let timer = Date.now();
    let expiryTime = timer + expires_in;
    const postNewAccess = await postNewAccessToken({
      access_token: access_token,
      expiredTime: expiryTime,
    });
    res.send(postNewAccess.data);
  } catch (error) {
    res.send(error.response);
  }
});

app.listen(process.env.PORT || 8000, () => {
  console.log("listening on port 8000");
});
