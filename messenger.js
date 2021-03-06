'use strict';

// Messenger API integration example
// We assume you have:
// * a Wit.ai bot setup (https://wit.ai/docs/quickstart)
// * a Messenger Platform setup (https://developers.facebook.com/docs/messenger-platform/quickstart)
// You need to `npm install` the following dependencies: body-parser, express, request.
//
// 1. npm install body-parser express request
// 2. Download and install ngrok from https://ngrok.com/download
// 3. ./ngrok http 8445
// 4. WIT_TOKEN=your_access_token FB_APP_SECRET=your_app_secret FB_PAGE_TOKEN=your_page_token node examples/messenger.js
// 5. Subscribe your page to the Webhooks using verify_token and `https://<your_ngrok_io>/webhook` as callback URL.
// 6. Talk to your bot on Messenger!

const bodyParser = require('body-parser');
const crypto = require('crypto');
const express = require('express');

const fetch = require('node-fetch');
const request = require('request');
var fs = require('fs')
var https = require('https')





let Wit = null;
let log = null;
try {
  // if running from repo
  Wit = require('../').Wit;
  log = require('../').log;
} catch (e) {
  Wit = require('node-wit').Wit;
  log = require('node-wit').log;
}

// Webserver parameter
const PORT = 8080;

// Wit.ai parameters
const WIT_TOKEN = 'GKUIWM6X6J4EP4RN6LH7NAQNYNEW2M2O';
const WIT_TOKEN2 = 'D6DLOBYWJHM2VZRI22AF6UP2TFHQPDY4';

// Messenger API parameters
const FB_PAGE_TOKEN = 'EAABcuqLqpc4BAMjuZCbSxZBjU734ZAlXt9OzLaMOBLrsXr1AFkgW1kzIceqiLpYNdYLW0VdyQjZCymlXh99vDiBvcRmXM5sOGntvWWjk1Dq73PZBsLFqzJaQgZA8Sv5gxEpZCFaEVb9zVVATw3kvPRldj3TY7OezhZBTGaQqjz54CgZDZD';
if (!FB_PAGE_TOKEN) { throw new Error('missing FB_PAGE_TOKEN') }
const FB_APP_SECRET = '24efdeaa3c574a83996053d65c081208';
if (!FB_APP_SECRET) { throw new Error('missing FB_APP_SECRET') }

let FB_VERIFY_TOKEN = 'my_voice_is_my_password_verify_me';
crypto.randomBytes(8, (err, buff) => {
  if (err) throw err;
  FB_VERIFY_TOKEN = buff.toString('hex');
  console.log(`/webhook will accept the Verify Token "${FB_VERIFY_TOKEN}"`);
});

// ----------------------------------------------------------------------------
// Messenger API specific code

// See the Send API reference
// https://developers.facebook.com/docs/messenger-platform/send-api-reference


const token = "EAABcuqLqpc4BAFJvG9EzLvF91uQYdS0nHLUOa9sAlKeBsIn052mjpZAo0GQrM62tUbZB4M6OclUFhMqWA44eVtixw2EsyUkBlPVxvZA2vgrROFOxQ2l4v8Xxg4YsAjZAKB3xhlExPJHfabxI9kjvM7iJgLuIIeh5Fxznpk3uNgZDZD"


var orders = [];
var groups = [];
var modifier = {};
var witflag = true;
var hackflag = true;

var enkryptid = "1352659151433814";
var baller = "1244986138929148";
var cpk = "1358977324172821";
var party = [enkryptid, baller, cpk];
var places = {
  name: "Pick A Restaurant",
  list: ["Leon Grill", "Monkey Bar", "New Plantain Leaf"],
  latlong: [[12.969086, 77.648610], [12.970477, 77.645370], [12.981763,	77.674693]],
  prices: [0, 0]
}
var locations = {};
locations[enkryptid] = [12.959600, 77.643781];
locations[cpk] = [12.971209, 77.619497];
locations[baller] = [12.959600, 77.643781];

var eventObj = {};

function sendGenericMessage(sender, data) {
  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: token },
    method: 'POST',
    json: {
      recipient: { id: sender },
      message: data,
    }
  }, function (error, response, body) {
    if (error) {
      console.log('Error sending messages: ', error)
    } else if (response.body.error) {
      console.log('Error: ', response.body.error)
    }
  })
}

const fbMessage = (id, text) => {
  const body = JSON.stringify({
    recipient: { id },
    message: { text },
  });
  const qs = 'access_token=' + encodeURIComponent(FB_PAGE_TOKEN);
  return fetch('https://graph.facebook.com/me/messages?' + qs, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
    .then(rsp => rsp.json())
    .then(json => {
      if (json.error && json.error.message) {
        throw new Error(json.error.message);
      }
      return json;
    });
};

// ----------------------------------------------------------------------------
// Wit.ai bot specific code

// This will contain all user sessions.
// Each session has an entry:
// sessionId -> {fbid: facebookUserId, context: sessionState}
const sessions = {};

const findOrCreateSession = (fbid) => {
  let sessionId;
  // Let's see if we already have a session for the user fbid
  Object.keys(sessions).forEach(k => {
    if (sessions[k].fbid === fbid) {
      // Yep, got it!
      sessionId = k;
    }
  });
  if (!sessionId) {
    // No session found for user fbid, let's create a new one
    sessionId = new Date().toISOString();
    sessions[sessionId] = { fbid: fbid, context: {} };
  }
  return sessionId;
};

// Our bot actions
const actions = {
  send(request, response) {
    // Our bot has something to say!
    // Let's retrieve the Facebook user whose session belongs to
    console.log("REQUEST", JSON.stringify(request));
    const recipientId = sessions[request.sessionId].fbid;
    response = discombobulate(recipientId, request, response);
    if (recipientId) {
      // Yay, we found our recipient!
      // Let's forward our bot response to her.
      // We return a promise to let our bot know when we're done sending

      return sendGenericMessage(recipientId, response.text)
      //      .then(() => null)
      //      .catch((err) => {
      //        console.error(
      //          'Oops! An error occurred while forwarding the response to',
      //          recipientId,
      //          ':',
      //          err.stack || err
      //        );
      //      });
    } else {
      console.error('Oops! Couldn\'t find user for session:', request.sessionId);
      // Giving the wheel back to our bot
      return Promise.resolve()
    }
  },
  // You should implement your custom actions here
  // See https://wit.ai/docs/quickstart
};

// Setting up our bot
const wit = new Wit({
  accessToken: WIT_TOKEN,
  actions,
  logger: new log.Logger(log.INFO)
});
const wit2 = new Wit({
  accessToken: WIT_TOKEN2,
  actions,
  logger: new log.Logger(log.INFO)
});

var witget = function () {
  console.log(witflag ? WIT_TOKEN : WIT_TOKEN2);
  return (witflag ? wit : wit2);
}

// Starting our webserver and putting it all together
const app = express();
app.use(express.static(__dirname + '/public'));
app.use(({method, url}, rsp, next) => {
  rsp.on('finish', () => {
    console.log(`${rsp.statusCode} ${method} ${url}`);
  });
  next();
});
app.use(bodyParser.json({ verify: verifyRequestSignature }));

app.get('/getitems', function (req, res) {
  console.log("SENT ALLITEMS");
  res.send({
    arr: orders,
    aller_pref: modifier
  })
});

app.get('/done', function (req, res) {
  console.log("MARKED AS DONE");
  orders[parseInt(req.query.id)].done = true;
  sendGenericMessage(orders[parseInt(req.query.id)].id, { text: 'Heads up! Your serving(s) of ' + orders[parseInt(req.query.id)].item + ' is on its way.' });
  sendGenericMessage(orders[parseInt(req.query.id)].id, {
    "attachment": {
      "type": "image",
      "payload": {
        "url": "http://i.giphy.com/l41lQKzFg8T8p7oas.gif"
      }
    }
  });
  res.send("DONE");
})

// Webhook setup
app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' &&
    req.query['hub.verify_token'] === FB_VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(400);
  }
});

// Message handler
app.post('/webhook', (req, res) => {
  // Parse the Messenger payload
  // See the Webhook reference
  // https://developers.facebook.com/docs/messenger-platform/webhook-reference
  const data = req.body;

  if (data.object === 'page') {
    data.entry.forEach(entry => {
      entry.messaging.forEach(event => {
        // Yay! We got a new message!
        // We retrieve the Facebook user ID of the sender
        const sender = event.sender.id;
        const sessionId = findOrCreateSession(sender);
        console.log('received event', JSON.stringify(event));
        if (event.message && !event.message.is_echo && !event.message.quick_reply) {

          // We retrieve the user's current session, or create one if it doesn't exist
          // This is needed for our bot to figure out the conversation history

          // We retrieve the message content
          const {text, attachments} = event.message;


          if (attachments) {
            // We received an attachment
            // Let's reply with an automatic message
            if (attachments[0].type == "location") {
              locations[sender] = [parseFloat(attachments[0].payload.coordinates.lat), parseFloat(attachments[0].payload.coordinates.long)];
              sendGenericMessage(sender, {text: "Location saved. You can expect better suggestions when we're taking you places"});
            }
          } else if (text) {
            // We received a text message

            // Let's forward the message to the Wit.ai Bot Engine
            // This will run all actions until our bot has nothing left to do
            witget().runActions(
              sessionId, // the user's current session
              text, // the user's message
              sessions[sessionId].context // the user's current session state
            ).then((context) => {
              // Our bot did everything it has to do.
              // Now it's waiting for further messages to proceed.
              console.log('Waiting for next user messages');

              // Based on the session state, you might want to reset the session.
              // This depends heavily on the business logic of your bot.
              // Example:
              // if (context['done']) {
              //   delete sessions[sessionId];
              // }

              // Updating the user's current session state
              sessions[sessionId].context = context;
            })
              .catch((err) => {
                console.error('Oops! Got an error from Wit: ', err.stack || err);
              })
          }
        } else {
          if (event.postback) {
            console.log("PAYLOAD", event.postback);
            if (event.postback.payload) {
              if (event.postback.payload.startsWith("ORDER_ITEM")) {
                if (!witflag) {
                  event.postback.payload = "Order 1 " + event.postback.payload.split("^")[1];
                } else {
                  if (!eventObj.places[event.postback.payload.split("^")[1]]) {
                    eventObj.places[event.postback.payload.split("^")[1]] = 1;
                  } else {
                    eventObj.places[event.postback.payload.split("^")[1]] += 1;
                  }
                  var count = 0;
                  for (var key in eventObj.places) {
                    count += eventObj.places[key];
                  }
                  if (count >= eventObj.people.length) {
                    var actualtimecount = 0;
                    var actualtimeindex = -1;
                    for (var key in eventObj.places) {
                      if (eventObj.places[key] > actualtimecount) {
                        actualtimecount = eventObj.places[key];
                        actualtimeindex = key;
                      }
                    }
                    var actualtime = actualtimeindex;
                    for (var place in places.list) {
                      if (places.list[place] == actualtime) {
                        eventObj.where = {
                          name: places.list[place],
                          latlong: places.latlong[place]
                        };
                        eventObj.places = [];
                        var origins = [];
                        for (var x in locations) {
                          origins.push(locations[x].join(","));
                        }
                        var origintext = origins.join("|");
                        var desttext = origintext+"|"+eventObj.where.latlong.join(",");
                        console.log("AYYYYYY", "https://maps.googleapis.com/maps/api/distancematrix/json?origins="+origintext+"&destinations="+desttext+"&key=AIzaSyBSs3pcGd_c1zH1ffQNErGR6ETIcdpZogE");
                        request("https://maps.googleapis.com/maps/api/distancematrix/json?origins="+origintext+"&destinations="+desttext+"&key=AIzaSyBSs3pcGd_c1zH1ffQNErGR6ETIcdpZogE", function(err, response, body) {
                          body = JSON.parse(body);
                          for (var guy in eventObj.people) {
                            var kkk="";
                            console.log("AYYY", body["rows"]);
                            var cb = function(varya, runner) {
                              runner(varya);
                            }
                            for (var j in body.rows[guy].elements) {
                              if (guy != j && body.rows[guy].elements[j].duration.value < 10) {
                                if (guy == 2) {
                                  guy = 1;
                                }
                                if (j==2) {
                                  j = 1;
                                }
                                console.log("ITER", guy, j);
                                cb([j, guy], function(arr) {
                                  request({
                                    url: 'https://graph.facebook.com/v2.6/' + eventObj.people[arr[0]] + '?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=' + token,
                                    json: true
                                  }, function (error, response, bodya) {
                                    if (!error && response.statusCode === 200) {
                                      kkk="You will be carpooling with " + bodya["first_name"] + " " + bodya["last_name"];
                                      sendGenericMessage(eventObj.people[arr[1]], {text: kkk});
                                    }
                                  });
                                });
                                break;
                              }
                            }
                            cb(guy, function(guy) {
                              setTimeout(function() {
                                if (hackflag) {
                                  if (guy == 1) {
                                    guy = 2;
                                    hackflag = false;
                                  }
                                } else {
                                  if (guy == 1) {
                                    hackflag = true;
                                  }
                                }
                                sendGenericMessage(eventObj.people[guy], {
                                  text: "Ok, here's the plan. You guys are meeting up for " + eventObj.event + " in " + eventObj.where.name + " at " + eventObj.time.getHours() +":00 hours. Confirm once you're there, or let us know now if you intend to skip.",
                                  "quick_replies": [
                                    {
                                      "content_type": "text",
                                      "title": "" + "I'm there",
                                      "payload": "CONFIRM^YES^"
                                    },
                                    {
                                      "content_type": "text",
                                      "title": "" + "I'm gonna skip",
                                      "payload": "CONFIRM^NO^"
                                    }
                                  ]
                                })
                              }, 1000);
                            });
                          }
                        });
                        return;
                      }
                    }
                    eventObj.time = new Date((new Date()).setHours(parseInt(actualtime.substring(1)), 0))
                    eventObj.times = [];
                    for (var guy in eventObj.people) {
                      sendGenericMessage(eventObj.people[guy], generateButtonR(places));
                    }
                  }
                  console.log("WHAT", eventObj);
                  return;
                }
              }
              if (event.postback.payload.startsWith("PAYMENT")) {
                event.postback.payload = "checkout " + event.postback.payload.split("^")[1];
              }
              if (event.postback.payload.startsWith("HOURSELECT")) {
                if (!eventObj.times["l"+event.postback.payload.split("^")[1]]) {
                  eventObj.times["l"+event.postback.payload.split("^")[1]] = 1;
                } else {
                  eventObj.times["l"+event.postback.payload.split("^")[1]] += 1;
                }
                var count = 0;
                for (var key in eventObj.times) {
                  count += eventObj.times[key];
                }
                if (count >= eventObj.people.length) {
                  var actualtimecount = 0;
                  var actualtimeindex = -1;
                  for (var key in eventObj.times) {
                    if (eventObj.times[key] > actualtimecount) {
                      actualtimecount = eventObj.times[key];
                      actualtimeindex = key;
                    }
                  }
                  var actualtime = actualtimeindex;
                  eventObj.time = new Date((new Date()).setHours(parseInt(actualtime.substring(1)), 0))
                  eventObj.times = [];
                  for (var guy in eventObj.people) {
                    sendGenericMessage(eventObj.people[guy], generateButtonR(places));
                  }
                }
                console.log("WHAT", eventObj);
                return;
              }
              witget().runActions(
                sessionId, // the user's current session
                event.postback.payload, // the user's message
                sessions[sessionId].context // the user's current session state
              ).then((context) => {
                // Our bot did everything it has to do.
                // Now it's waiting for further messages to proceed.
                console.log('Waiting for next user messages');

                // Based on the session state, you might want to reset the session.
                // This depends heavily on the business logic of your bot.
                // Example:
                // if (context['done']) {
                //   delete sessions[sessionId];
                // }

                // Updating the user's current session state
                sessions[sessionId].context = context;
              })
                .catch((err) => {
                  console.error('Oops! Got an error from Wit: ', err.stack || err);
                })
            }
          } else if (event.message.quick_reply) {
            console.log("PAYLOAD", event.message.quick_reply);
            if (event.message.quick_reply.payload) {
              if (event.message.quick_reply.payload.startsWith("CONFIRM")) {
                if (event.message.quick_reply.payload.split("^")[1] == "YES") {
                  sendGenericMessage(event.sender.id, {text: "Thanks for letting us know. Hang on while we catch up with everyone. "})
                  eventObj.confirmed += 1;
                }
                if (event.message.quick_reply.payload.split("^")[1] == "NO") {
                  eventObj.people.splice(eventObj.people.indexOf(event.sender.id), 1);
                  sendGenericMessage(event.sender.id, {text: "Thanks for letting us know. We're counting you out of the group for now."})
                }
                if (eventObj.confirmed == eventObj.people.length) {
                  eventObj.confirmed = 0;
                  witflag = false;
                  for (var guy in eventObj.people) {
                    var reply = "Hey, Welcome to BroBar, my name is AlphaDawg and I will be your server tonight. Would you like to hear about our specials today?";
                    sendGenericMessage(eventObj.people[guy], { text: reply })
                    sendGenericMessage(eventObj.people[guy], {
                      "attachment": {
                        "type": "image",
                        "payload": {
                          "url": "http://i.giphy.com/l2JhKi0Xs9AQ5tqtG.gif"
                        }
                      }
                    });
                  }
                }
                return;
              }
              if (event.message.quick_reply.payload.startsWith("ORDER_ITEM")) {
                if (!witflag) {
                  event.message.quick_reply.payload = "Order 1 " + event.message.quick_reply.payload.split("^")[1];
                } else {
                  if (!eventObj.places[event.message.quick_reply.payload.split("^")[1]]) {
                    eventObj.places[event.message.quick_reply.payload.split("^")[1]] = 1;
                  } else {
                    eventObj.places[event.message.quick_reply.payload.split("^")[1]] += 1;
                  }
                  var count = 0;
                  for (var key in eventObj.places) {
                    count += eventObj.places[key];
                  }
                  if (count >= eventObj.people.length) {
                    var actualtimecount = 0;
                    var actualtimeindex = -1;
                    for (var key in eventObj.places) {
                      if (eventObj.places[key] > actualtimecount) {
                        actualtimecount = eventObj.places[key];
                        actualtimeindex = key;
                      }
                    }
                    var actualtime = actualtimeindex;
                    for (var place in places.list) {
                      if (places.list[place] == actualtime) {
                        eventObj.where = {
                          name: places.list[place],
                          latlong: places.latlong[place]
                        };
                        eventObj.places = [];
                        console.log("DONEDONE");
                        return;
                      }
                    }
                    eventObj.time = new Date((new Date()).setHours(parseInt(actualtime.substring(1)), 0))
                    eventObj.times = [];
                    for (var guy in eventObj.people) {
                      sendGenericMessage(eventObj.people[guy], generateButtonR(places));
                    }
                  }
                  console.log("WHAT", eventObj);
                  return;
                }
              }
              if (event.message.quick_reply.payload.startsWith("PAYMENT")) {
                event.message.quick_reply.payload = "checkout " + event.message.quick_reply.payload.split("^")[1];
              }
              if (event.message.quick_reply.payload.startsWith("HOURSELECT")) {
                if (!eventObj.times["l"+event.message.quick_reply.payload.split("^")[1]]) {
                  eventObj.times["l"+event.message.quick_reply.payload.split("^")[1]] = 1;
                } else {
                  eventObj.times["l"+event.message.quick_reply.payload.split("^")[1]] += 1;
                }
                var count = 0;
                for (var key in eventObj.times) {
                  count += eventObj.times[key];
                }
                if (count >= eventObj.people.length) {
                  var actualtimecount = 0;
                  var actualtimeindex = -1;
                  for (var key in eventObj.times) {
                    if (eventObj.times[key] > actualtimecount) {
                      actualtimecount = eventObj.times[key];
                      actualtimeindex = key;
                    }
                  }
                  var actualtime = actualtimeindex;
                  eventObj.time = new Date((new Date()).setHours(parseInt(actualtime.substring(1)), 0))
                  eventObj.times = [];
                  for (var guy in eventObj.people) {
                    sendGenericMessage(eventObj.people[guy], generateButtonR(places));
                  }
                }
                console.log("WHAT", eventObj);
                return;
              }
              witget().runActions(
                sessionId, // the user's current session
                event.message.quick_reply.payload, // the user's message
                sessions[sessionId].context // the user's current session state
              ).then((context) => {
                // Our bot did everything it has to do.
                // Now it's waiting for further messages to proceed.
                console.log('Waiting for next user messages');

                // Based on the session state, you might want to reset the session.
                // This depends heavily on the business logic of your bot.
                // Example:
                // if (context['done']) {
                //   delete sessions[sessionId];
                // }

                // Updating the user's current session state
                sessions[sessionId].context = context;
              })
                .catch((err) => {
                  console.error('Oops! Got an error from Wit: ', err.stack || err);
                })
            }
          }
        }
      });
    });
  }
  res.sendStatus(200);
});

/*
 * Verify that the callback came from Facebook. Using the App Secret from
 * the App Dashboard, we can verify the signature that is sent with each
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];

  if (!signature) {
    // For testing, let's log an error. In production, you should throw an
    // error.
    console.error("Couldn't validate the signature.");
  } else {
    var elements = signature.split('=');
    var method = elements[0];
    var signatureHash = elements[1];

    var expectedHash = crypto.createHmac('sha1', FB_APP_SECRET)
      .update(buf)
      .digest('hex');

    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
}

app.listen(PORT);



console.log('Listening on :' + PORT + '...');


var disco = function (id, tities) {
  if (tities.intent && tities.intent.length) {
    if (tities.intent[0].value == "greeting") {
      request({
        url: 'https://graph.facebook.com/v2.6/' + id + '?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=' + token,
        json: true
      }, function (error, response, body) {
        if (!error && response.statusCode === 200) {
          var reply = "Hey " + body['first_name'] + ", I'm Pupper, your concierge for today. Tell me if you want to plan something with your friends or family."
          sendGenericMessage(id, { text: reply })

        }
      })
      return {
        "attachment": {
          "type": "image",
          "payload": {
            "url": "http://i.giphy.com/644IL1MPwN7KE.gif"
          }
        }
      };
    } else {
      return { text: "I didn't get that" };
    }
  } else if (tities.organize && tities.organize.length) {
    var temptime = undefined;
    if (tities.datetime && tities.datetime.length) {
      temptime = new Date((new Date()).setHours(parseInt(tities.datetime[0].value.split("T")[1].substring(0,2)), 0))
      console.log("LMAO", temptime, tities.datetime[0].value)
    }
    if (!temptime) {
      if (tities.organize[0].value == "lunch") {
        temptime = new Date((new Date()).setHours(13, 0))
      } else if (tities.organize[0].value == "dinner") {
        temptime = new Date((new Date()).setHours(22, 0))
      }
    }
    eventObj = {
      event: tities.organize[0].value,
      time: temptime,
      people: party,
      where: [],
      times: [],
      places: [],
      confirmed: 0
    }
    eventObj.times["l"+eventObj.time.getHours()] = 1;
    request({
      url: 'https://graph.facebook.com/v2.6/' + id + '?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=' + token,
      json: true
    }, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        for (var guy in eventObj.people) {
          if (id != eventObj.people[guy]) {
            var reply = body['first_name'] + " " + body['last_name'] + " has made plans for " + eventObj.event + " at " + eventObj.time.getHours() + ":00. Click Ok, or select a different time";
            var prevHour = eventObj.time.getHours();
            var nextHour = eventObj.time.getHours();
            if ((prevHour - 1) < 0) {
              prevHour = 23;
            } else {
              prevHour -= 1;
            }
            if ((nextHour + 1) > 23) {
              nextHour = 0;
            } else {
              nextHour += 1;
            }
            sendGenericMessage(eventObj.people[guy], {
              text: reply,
              "quick_replies": [
                {
                  "content_type": "text",
                  "title": "" + prevHour,
                  "payload": "HOURSELECT^" + prevHour + "^"
                },
                {
                  "content_type": "text",
                  "title": "" + "OK",
                  "payload": "HOURSELECT^" + eventObj.time.getHours() + "^"
                },
                {
                  "content_type": "text",
                  "title": "" + nextHour,
                  "payload": "HOURSELECT^" + nextHour + "^"
                }
              ]
            })
          }
        }
      }
    });
    return {text: "Cool, I'll check with others and let you know about your " + tities.organize[0].value + " plans"};
  } else {
    return { text: "I didn't get that" };
  }
}
var discombobulate = function (id, request, response) {
  var groupID = -1;
  if (id) {
    for (var group in groups) {
      if (groups[group].indexOf(id) != -1) {
        groupID = group;
      }
    }
    if (groupID == -1) {
      groups.push([id]);
      groupID = groups.length - 1;
    }
    var execidentifier = response.text.split("^");
    if (execidentifier[1]) {
      console.log('EXEC', execidentifier);
      if (witflag) {
        response.text = disco(id, request.entities);
      } else {
        response.text = menulist[execidentifier[1]](groupID, id, request.entities);
      }

    } else if (response.quickreplies && response.quickreplies.length) {
      var data = {
        text: response.text,
        quick_replies: []
      }
      for (var option in response.quickreplies) {
        data.quick_replies.push({
          content_type: "text",
          title: response.quickreplies[option],
          payload: response.quickreplies[option]
        });
      }
      response.text = data;
    } else {
      response.text = { text: response.text };
    }
    console.log("RESPONSE", JSON.stringify(response));
    console.log("EVENT", eventObj);
    console.log("GROUPS", groups);
    console.log("ORDERS", orders);
    return response;
  }
}

var mains = {
  name: "Mains",
  list: ["Lamb burger", "Sambar rice"],
  prices: [300, 150]
}

var starters = {
  name: "Starters",
  list: ["Spring roll", "Paneer manchurian", "Fries"],
  prices: [50, 150, 150]
}

var drinks = {
  name: "Drinks",
  list: ["Bloody mary", "Mojito"],
  prices: [200, 200]
}

var desserts = {
  name: "Deserts",
  list: ["Dark forest cake", "Vanilla ice cream"],
  prices: [200, 100]
}

var specials = {
  name: "Specials",
  list: ["Jaigerbombs", "Fish curry"],
  prices: [50, 50]
}

var allitems = [].concat(mains.list).concat(starters.list).concat(drinks.list).concat(desserts.list).concat(specials.list);
var allprices = [].concat(mains.prices).concat(starters.prices).concat(drinks.prices).concat(desserts.prices).concat(specials.prices);

var menulist = {
  menu: function (group, id, entities) {
    var menutypes = {
      all: function () {
        return menu();
      },
      mains: function () {
        return generateButton(mains);
      },
      specials: function () {
        return generateButton(specials);
      },
      drinks: function () {
        return generateButton(drinks);
      },
      starters: function () {
        return generateButton(starters);
      },
      desserts: function () {
        return generateButton(desserts);
      }
    };
    if (entities.menu) {
      return menutypes[entities.menu[0].value]();
    } else if (entities.number) {
      if (entities.joinuser) {
        if (entities.joinuser[0].value.toLowerCase() == "@theenkrypt") {
          var hisgroup = -1;
          for (var group in groups) {
            if (groups[group].indexOf(enkryptid) != -1) {
              hisgroup = group;
            }
          }
          if (hisgroup == -1) {
            groups.push([enkryptid]);
            hisgroup = groups.length - 1;
          }
          var copy = {
            group: hisgroup,
            id: enkryptid,
            quantity: entities.number[0].value,
            item: entities.product[0].value,
            price: entities.number[0].value * allprices[allitems.indexOf(entities.product[0].value)],
            paid: false,
            done: false
          }
          orders.push(copy);
          request({
            url: 'https://graph.facebook.com/v2.6/' + id + '?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=' + token,
            json: true
          }, function (error, response, body) {
            if (!error && response.statusCode === 200) {
              for (var group in groups) {
                if (groups[group].indexOf(enkryptid) != -1) {
                  groups[group].splice(groups[group].indexOf(enkryptid), 1);
                }
              }
              groups[group].push(enkryptid);
              var reply = body['first_name'] + " " + body['last_name'] + " has ordered " + copy.quantity + " serving(s) of " + copy.item + " for you. If that's not cool, you can cancel anytime.";
              sendGenericMessage(enkryptid, { text: reply })
            }
          });
          return { text: "Done! He should get a message about the order you've placed for him shortly." };
        }
      } else {
        orders.push({
          group: group,
          id: id,
          quantity: entities.number[0].value,
          item: entities.product[0].value,
          price: entities.number[0].value * allprices[allitems.indexOf(entities.product[0].value)],
          paid: false,
          done: false
        });
        return { text: entities.number[0].value + " serving(s) of " + entities.product[0].value + " coming right up!" };
      }
    } else if (entities.order) {
      if (entities.order[0].value == 'cancel') {
        var flag = -1;
        for (var item in orders) {
          if (orders[item].id == id) {
            flag = item;
          }
        }
        if (flag == -1) {
          return { text: "You haven't ordered anything yet, but it's not going to stay that way. We have a variety of selections from our mains, starters, drinks, desserts and specials. Which one would you like to see?" }
        } else {
          var spliced = orders.splice(flag, 1);
          return { text: "Fret not! Your last order of " + spliced[0].quantity + " serving(s) of " + spliced[0].item + " has been cancelled." };
        }
      } else if (entities.order[0].value == 'previous') {
        if (entities.joinuser) {
          if (entities.joinuser[0].value.toLowerCase() == "@theenkrypt") {
            var flag = -1;
            for (var item in orders) {
              if (orders[item].id == id) {
                flag = item;
              }
            }
            if (flag == -1) {
              return { text: "You haven't ordered anything yet, but it's not going to stay that way. We have a variety of selections from our mains, starters, drinks, desserts and specials. Which one would you like to see?" }
            } else {
              var copy = JSON.parse(JSON.stringify(orders[flag]));
              var hisgroup = -1;
              for (var group in groups) {
                if (groups[group].indexOf(enkryptid) != -1) {
                  hisgroup = group;
                }
              }
              if (hisgroup == -1) {
                groups.push([enkryptid]);
                hisgroup = groups.length - 1;
              }
              copy.id = enkryptid;
              copy.group = hisgroup;
              orders.push(copy);
              request({
                url: 'https://graph.facebook.com/v2.6/' + id + '?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=' + token,
                json: true
              }, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                  for (var group in groups) {
                    if (groups[group].indexOf(enkryptid) != -1) {
                      groups[group].splice(groups[group].indexOf(enkryptid), 1);
                    }
                  }
                  groups[group].push(enkryptid);
                  var reply = body['first_name'] + " " + body['last_name'] + " has ordered " + copy.quantity + " serving(s) of " + copy.item + " for you. If that's not cool, you can cancel anytime.";
                  sendGenericMessage(enkryptid, { text: reply })
                }
              });
              return { text: "Done! He should get a message about the order you've placed for him shortly." };
            }
          }
        } else {
          return { text: "I don't understand :(. Could you perhaps phrase that in a way that is simpler to understand?" }
        }
      }
    } else if (entities.bill) {
      var items = [];
      var split = true;
      if (entities.bill[0].value == "split") {
        items = orders.filter(function (obj) {
          if (!obj.paid && obj.id == id) {
            return true;
          }
        });

      } else if (entities.bill[0].value == "group") {
        items = orders.filter(function (obj) {
          if (!obj.paid && obj.group == group) {
            return true;
          }
        });
        split = false;
      }
      if (!items.length) {
        return { text: "You haven't ordered anything yet, but it's not going to stay that way. We have a variety of selections from our mains, starters, drinks, desserts and specials. Which one would you like to see?" }
      }
      var rest = {
        "attachment": {
          "type": "template",
          "payload": {
            "template_type": "receipt",
            "recipient_name": "Recipient",
            "order_number": "" + Math.random(),
            "currency": "INR",
            "payment_method": "Online",
            "order_url": "http://m.me/brobarbot",
            "elements": [],
            "address": {
              "street_1": "A hardcoded",
              "street_2": "address example",
              "city": "Bro City",
              "postal_code": "94025",
              "state": "KA",
              "country": "IN"
            },
            "summary": {
              "subtotal": 0.0,
              "shipping_cost": 0.0,
              "total_tax": 0.0,
              "total_cost": 0.0
            }
          }
        }
      }
      var total = 0;
      for (var item in items) {
        rest.attachment.payload.elements.push({
          image_url: "http://i.imgur.com/GTlVOvE.png",
          title: items[item].item,
          quantity: items[item].quantity,
          price: items[item].price,
          currency: "INR"
        });
        total = total + items[item].price;
        console.log("TOTAL", total);
      }
      rest.attachment.payload.summary.subtotal = total;
      rest.attachment.payload.summary.total_cost = total;
      console.log(JSON.stringify(rest));
      sendGenericMessage(id, rest)

      setTimeout(function () {
        sendGenericMessage(id, {
          attachment: {
            "type": "template",
            "payload": {
              "template_type": "button",
              "text": "Would you like to pay now?",
              "buttons": [{
                type: "postback",
                title: "Yes",
                payload: "PAYMENT_^" + (split ? "split" : "table") + "^"
              }, {
                type: "postback",
                title: "No",
                payload: "NONE"
              }]
            }
          }
        });
      }, 2000);
    } else if (entities.joinuser) {
      if (entities.joinuser[0].value.toLowerCase() == "@theenkrypt") {
        request({
          url: 'https://graph.facebook.com/v2.6/' + id + '?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=' + token,
          json: true
        }, function (error, response, body) {
          if (!error && response.statusCode === 200) {
            for (var group in groups) {
              if (groups[group].indexOf(enkryptid) != -1) {
                groups[group].splice(groups[group].indexOf(enkryptid), 1);
              }
            }
            groups[group].push(enkryptid);
            var reply = body['first_name'] + " " + body['last_name'] + " has added you to a group on Brobar. People in this group can now order for each other and pay/split the bill."
            sendGenericMessage(enkryptid, { text: reply })

          }
        })
        return { text: "Adding your friend to your group. He should get a message shortly." }
      } else {
        return { text: "I could not find that user. This app is in beta and not public, but I like your enthusiasm in trying out random edge cases." }
      }
    } else if (entities.allergy) {
      if (modifier[id]) {
        if (modifier[id].allergies) {
          modifier[id].allergies.push(entities.allergy[0].value);
        } else {
          modifier[id].allergies = [entities.allergy[0].value]
        }
      } else {
        modifier[id] = {
          allergies: [entities.allergy[0].value]
        };
      }
      return { text: "My sympathies. I'll let the guys at the kitchen know right away." };
    } else if (entities.preferences) {
      if (modifier[id]) {
        if (modifier[id].preferences) {
          modifier[id].preferences.push(entities.preferences[0].value);
        } else {
          modifier[id].preferences = [entities.preferences[0].value]
        }
      } else {
        modifier[id] = {
          preferences: [entities.preferences[0].value]
        };
      }
      return { text: "That's cool. I'll let the guys at the kitchen know right away." };
    } else if (entities.checkout) {
      if (entities.checkout[0].value.trim() == "split") {
        for (var item in orders) {
          if (orders[item].id == id) {
            orders.splice(item, 1);
          }
        }
        return { text: "All done! Your order history is cleared. You're good to go." };
      } else if (entities.checkout[0].value.trim() == "table") {
        for (var item in orders) {
          if (orders[item].group == group) {
            orders.splice(item, 1);
          }
        }
        var eventObj = {};
        witflag = true;
        return { text: "All done! You've paid for your entire table. You all are good to go." };
      }
    } else {
      return { text: "Place an order or ask for the bill when you're done. Let me know if you like your food spicy or sweet, and if there's anything you're allergic to. AlphaDawg is happy to serve." };
    }
  },
  intro: function (group, id, entities) {
    request({
      url: 'https://graph.facebook.com/v2.6/' + id + '?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=' + token,
      json: true
    }, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        var reply = "Hey " + body['first_name'] + ", Welcome to BroBar, my name is AlphaDawg and I will be your server tonight. Would you like to hear about our specials today? "
        sendGenericMessage(id, { text: reply })

      }
    })
    return {
      "attachment": {
        "type": "image",
        "payload": {
          "url": "http://i.giphy.com/l2JhKi0Xs9AQ5tqtG.gif"
        }
      }
    };
  },
  mains: function () {
    return generateButton(mains);
  },
  specials: function () {
    return generateButton(specials);
  },
  drinks: function () {
    return generateButton(drinks);
  },
  starters: function () {
    return generateButton(starters);
  }
}

var menu = function () {
  return { text: "Whew, you must be really hungry if you want to see our entire menu. We have a variety of selections from our mains, starters, drinks, desserts and specials. Which one would you like to see?" };
}

var generateButton = function (funcloop) {
  var items = funcloop;
  var attachment = {
    attachment: {
      "type": "template",
      "payload": {
        "template_type": "button",
        "text": "Ok, here you go: " + items.name,
        "buttons": []
      }
    }
  }
  for (var item in items.list) {
    attachment.attachment.payload.buttons.push({
      type: "postback",
      title: items.list[item],
      payload: "ORDER_ITEM_^" + items.list[item] + "^"
    });
  }
  return attachment;
}
var generateButtonR = function (funcloop) {
  var items = funcloop;
  var attachment = {
    attachment: {
      "type": "template",
      "payload": {
        "template_type": "button",
        "text": "Ok " + items.name,
        "buttons": []
      }
    }
  }
  for (var item in items.list) {
    attachment.attachment.payload.buttons.push({
      type: "postback",
      title: items.list[item],
      payload: "ORDER_ITEM_^" + items.list[item] + "^"
    });
  }
  return attachment;
}
