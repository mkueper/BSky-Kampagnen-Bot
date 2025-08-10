const cron = require("node-cron");
const config = require("../config");
const { postSkeet } = require("./blueskyClient");
const Skeet = require("../models/skeetModel");

function scheduleSkeetPosting(content) {
  cron.schedule(config.SCHEDULE_TIME, async () => {
    try {
      console.log(`Poste Skeet: ${content}`);
      const post = await postSkeet(content);
      await Skeet.create({
        content,
        postUri: post.uri,
        postedAt: new Date(),
      });
      console.log("Skeet erfolgreich gepostet und gespeichert.");
    } catch (error) {
      console.error("Fehler beim Posten des Skeets:", error);
    }
  });
}

module.exports = {
  scheduleSkeetPosting,
};
