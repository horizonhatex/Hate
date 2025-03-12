const {
  Client,
  GatewayIntentBits,
  WebhookClient,
  EmbedBuilder,
  Collection,
  REST,
  Routes,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActivityType,
} = require("discord.js");
const bedrock = require("bedrock-protocol");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const join = "<:join:1346840649093222515>";
const rightend = "<:rightend:1346840651798544445>";
const leave = "<:leave:1346840645180063774>";

// Import JSON configuration file
const {
  token,
  ID,
  GUILD,
  host,
  port,
  username,
  device,
  relaychannel,
  gamertagChannel,
  max,
  memberRole,
} = require("./config.json");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const players = new Map();

// Webhook URL
const webhook = new WebhookClient({
  id: "1346324018571116645",
  token: "_MXOtAUzAbvMg7Xa-nAMyXn34ZYync3gWLRPxZOpJ1L76JYjXpDz_cPRXQtTiKwO5cIO",
});

// Devices
const devices = [
  "Undefined",
  "Android",
  "iOS",
  "OSX",
  "FireOS",
  "GearVR",
  "Hololens",
  "Windows",
  "Win32",
  "Dedicated",
  "TVOS",
  "PlayStation",
  "NintendoSwitch",
  "Xbox",
  "WindowsPhone",
];

const whitelistFolderPath = "whitelists";

// Bedrock Protocol
const bedrockClient = bedrock.createClient({
  host: host,
  port: port,
  skinData: {
    ThirdPartyName: username,
    ThirdPartyNameOnly: true,
    DeviceOS: device,
  },
  username: "Relay",
  offline: false,
});

// Starting To Join The Server
client.on("ready", () => {
  if (client.user) {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setPresence({
      activities: [{ name: `Horizon Is Cute`, type: ActivityType.Watching }],
      status: "dnd",
    });

    webhook // Starting To Join The Server
      .send({
        embeds: [
          new EmbedBuilder()
            .setDescription("**Connecting to the server...**")
            .setColor("Yellow"),
        ],
      })
      .catch(console.error);
  } else {
    console.error("Client user is null. Bot may not be logged in.");
  }
});

// If The Bot Has Been Joined
bedrockClient.on("spawn", async () => {
  webhook
    .send({
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: `${username} is now connected to the server`,
            iconURL: client.user.displayAvatarURL({ dynamic: true }),
          })
          .setColor("Green"),
      ],
    })
    .catch(console.error);
});

// Ensure the folder exists - messageCreate gamertag
const folderPath = "whitelists";
if (!fs.existsSync(folderPath)) {
  fs.mkdirSync(folderPath);
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  const user = message.author.username;
  const userId = message.author.id;
  const content = message.content;

  if (message.channel.id === gamertagChannel) {
    // Double Check
    const embed = new EmbedBuilder()
      .setTitle("Confirm your Gamertag")
      .setDescription(
        `Please confirm that the gamertag you just sent is your real gamertag. Double check before confirming.\n\nGamertag: ${content}`
      )
      .setColor("Blue");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("confirm")
        .setLabel("Yes")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("cancel")
        .setLabel("No")
        .setStyle(ButtonStyle.Danger)
    );

    const confirmationMessage = await message.reply({
      embeds: [embed],
      components: [row],
      ephemera: true,
    });

    const filter = (interaction) => interaction.user.id === userId;
    const collector = confirmationMessage.createMessageComponentCollector({
      filter,
      time: 15000,
    });

    collector.on("collect", async (interaction) => {
      if (!interaction.deferred) {
        await interaction.deferReply({ ephemeral: true }).catch(console.error);
      }
      if (interaction.customId === "confirm") {
        const date = new Date().toLocaleDateString("en-US");
        const userData = {
          "Discord Name": user,
          DiscordID: userId,
          Gamertag: content,
          Date: date,
        };

        const filePath = path.join(folderPath, `${content}.json`);
        fs.writeFileSync(filePath, JSON.stringify(userData, null, 2));

        // Add role to the user
        const guild = message.guild;
        const member = await guild.members.fetch(userId);
        const role = guild.roles.cache.get(memberRole);

        if (role && member) {
          await member.roles
            .add(role)
            .then(() => console.log(`Added role to ${user}`))
            .catch((error) =>
              console.error(`Failed to add role to ${user}:`, error)
            );

          // Change the user's nickname
          const newNickname = content; // Set the nickname to the gamertag
          await member
            .setNickname(newNickname)
            .then(() => console.log(`Changed nickname of ${user}`))
            .catch((error) =>
              console.error(`Failed to change nickname of ${user}:`, error)
            );

          interaction.followUp({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  "Your gamertag has been confirmed and saved.\nTo get the **IP & PORT** please go to <#1345744750434586646>\n\n> If you are still **unable** to join | DM <@1342370557009854484>\n> If your **Gamertag** was wrong | DM <@1342370557009854484>"
                )
                .setColor("Green"),
            ],
          });
          await message.react("✅");
          collector.stop();
        } else {
          console.log("No Role Found");
        }
      } else if (interaction.customId === "cancel") {
        await interaction.followUp({
          content: "Cancelled.",
          embeds: [],
          components: [],
          ephemeral: true,
        });
        collector.stop();
      }
    });

    collector.on("end", (collected, reason) => {
      if (reason === "time") {
        confirmationMessage.edit({
          content: "Confirmation timed out.",
          embeds: [],
          components: [],
        });
      }
    });
  }
});

// User Discord Message Channel Send To The Minecraft Chat Server
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const user = message.author.username;
  const content = message.content;

  const channelID = relaychannel;

  if (message.channel.id === channelID) {
    //Command Listerner
    if (content.startsWith(".")) {
      //Kick Command
      if (content.startsWith(".kick")) {
        const args = content.slice(6).trim().split(" ");
        if (args.length < 2) {
          message.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription("Usage: .kick <player> <reason>")
                .setColor("Red"),
            ],
          });
          return;
        }

        const playerName = args[0];
        const reason = args.slice(1).join(" ");

        bedrockClient.queue("command_request", {
          command: `/kick ${playerName} ${reason}`,
          origin: {
            type: 0,
            uuid: uuidv4(),
            request_id: "Admin",
          },
          interval: false,
          version: 66,
        });

        bedrockClient.write("text", {
          filtered_message: "",
          type: "chat",
          needs_translation: false,
          source_name: bedrockClient.username,
          message: `§b${playerName} was §4§lkicked§r§b from the server §a| ${reason}`,
          xuid: "0",
          platform_chat_id: "0",
        });

        message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${
                  playerName || "Unknown Player"
                } has been kicked from the server | \`${reason}\``
              )
              .setColor("Green"),
          ],
        });
        return;
      }

      //Ban Command
      if (content.startsWith(".ban")) {
        const args = content.slice(5).trim().split(" ");
        if (args.length < 2) {
          message.reply({
            embeds: [
              new EmbedBuilder()
                .setDescription("Usage: .ban <player> <reason>")
                .setColor("Red"),
            ],
          });
          return;
        }

        const playerName = args[0];
        const reason = args.slice(1).join(" ");

        // Define the folder and file paths
        const pathfolder = path.join(__dirname, "players");
        const files = path.join(pathfolder, `${playerName}.json`);

        //Player Data
        const data = {
          Name: playerName,
          Reason: reason,
          BannedBy: user,
        };

        // Create the folder if it doesn't exist
        if (!fs.existsSync(pathfolder)) {
          fs.mkdirSync(pathfolder);
        }

        fs.writeFileSync(files, JSON.stringify(data, null, 2), "utf8");

        bedrockClient.queue("command_request", {
          command: `/kick ${playerName} ${reason}`,
          origin: {
            type: 0,
            uuid: uuidv4(),
            request_id: "Admin",
          },
          interval: false,
          version: 66,
        });

        bedrockClient.write("text", {
          filtered_message: "",
          type: "chat",
          needs_translation: false,
          source_name: bedrockClient.username,
          message: `§b${playerName} was §4§lbanned§r§b from the server §a| ${reason}`,
          xuid: "0",
          platform_chat_id: "0",
        });

        message.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${
                  playerName || "Unknown Player"
                } has been banned from the server | \`${reason}\``
              )
              .setColor("Green"),
          ],
        });
        return;
      }
    }

    await message.react("✅");

    bedrockClient.write("text", {
      filtered_message: "",
      type: "chat",
      needs_translation: false,
      source_name: bedrockClient.username,
      message: `${user} > ${content}`,
      xuid: "0",
      platform_chat_id: "0",
    });
  }
});

async function fetchPlayerProfile(xuid) {
  const fetch = (await import("node-fetch")).default;
  const API_KEY = "8bac60b2-1d66-448a-9f4d-3f14d7678b5b";

  const response = await fetch(`https://xbl.io/api/v2/account/${xuid}`, {
    headers: {
      "X-Authorization": API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

let onlinePlayers = 0;
const totalPlayers = max;
const bot = username;

// Join Player
bedrockClient.on("player_list", async (packet) => {
  packet.records.records.forEach(async (player) => {
    if (packet.records.type === "add") {
      const username = player.username;
      if (username === client.username) return;
      const xuid = player.xbox_user_id;
      const os = devices[player.build_platform];
      const joinedOn = Date.now();
      let gamerscore = 0;
      let iconURL = "";
      const playerName = player.username;
      const gamertag = player.username;
      if (playerName === client.username) return;
      if (gamertag === bot) return;

      await checkAndKickBannedPlayer(playerName);
      const isWhitelisted = await checkWhitelist(gamertag);
      if (!isWhitelisted) {
        bedrockClient.queue("command_request", {
          command: `/kick ${gamertag} Your gamertag is not in the database! To join this server`,
          origin: {
            type: 0,
            uuid: uuidv4(),
            request_id: "Admin",
          },
          interval: false,
          version: 66,
        });
        return;
      }

      bedrockClient.write("text", {
        filtered_message: "",
        type: "chat",
        needs_translation: false,
        source_name: bedrockClient.username,
        message: `Welcome to We hate Everyone my Dear! ${playerName}`,
        xuid: "0",
        platform_chat_id: "0",
      });

      try {
        const profileData = await fetchPlayerProfile(xuid);
        if (profileData.profileUsers && profileData.profileUsers.length > 0) {
          const playerProfile = profileData.profileUsers[0];
          iconURL =
            playerProfile.settings.find(
              (setting) => setting.id === "GameDisplayPicRaw"
            )?.value || iconURL;
          gamerscore =
            playerProfile.settings.find(
              (setting) => setting.id === "Gamerscore"
            )?.value || gamerscore;
        }
      } catch (error) {
        console.error("Error fetching player profile:", error);
      }

      onlinePlayers++;

      const embed = new EmbedBuilder()
        .setDescription(
          `${join}**${username}** joined the server!\n${rightend}XUID: ${xuid}\n${rightend}Gamerscore: ${gamerscore}\n${rightend}Device: ${os}\n${rightend}Online: ${onlinePlayers}/${totalPlayers}`
        )
        .setColor("Green");

      if (iconURL) {
        embed.setThumbnail(iconURL);
      }

      webhook.send({ embeds: [embed] }).catch(console.error);

      try {
        players.set(player.uuid, {
          username,
          os,
          gamerscore,
          xuid,
          iconURL,
        });
      } catch (error) {
        console.error("Error storing player data:", error);
      }
    } else if (packet.records.type === "remove") {
      const playerData = players.get(player.uuid);
      if (playerData) {
        const { username, os, gamerscore, xuid, iconURL } = playerData;

        onlinePlayers--;

        const embed = new EmbedBuilder()
          .setDescription(
            `${leave}**${username}** left the server!\n${rightend}XUID: ${xuid}\n${rightend}Gamerscore: ${gamerscore}\n${rightend}Device: ${os}\n${rightend}Online: ${onlinePlayers}/${totalPlayers}`
          )
          .setColor("Red");

        if (iconURL) {
          embed.setThumbnail(iconURL);
        }

        webhook.send({ embeds: [embed] }).catch(console.error);
      } else {
        console.warn(`Player data not found for UUID: ${player.uuid}`);
      }
    }
  });
});

bedrockClient.on("text", async (packet) => {
  if (packet.source_name === username) return;
  if (packet.needs_translation === false && packet.type === "chat") {
    const message = packet.message;
    const sourceName = packet.source_name;
    let iconURL = "";

    //Testing
    if (packet.message === "!help") {
      bedrockClient.write("text", {
        filtered_message: "",
        type: "chat",
        needs_translation: false,
        source_name: bedrockClient.username,
        message: `Hate Help Commands\n\n!help`,
        xuid: "0",
        platform_chat_id: "0",
      });
    }

    try {
      const profileData = await fetchPlayerProfile(packet.xuid);
      if (profileData.profileUsers && profileData.profileUsers.length > 0) {
        const playerProfile = profileData.profileUsers[0];
        iconURL =
          playerProfile.settings.find(
            (setting) => setting.id === "GameDisplayPicRaw"
          )?.value || iconURL;
      }
    } catch (error) {
      console.error("Error fetching player profile for message:", error);
    }

    const embed = new EmbedBuilder()
      .setDescription(`${sourceName} >> ${message}`)
      .setColor("Random")
      .setTimestamp();

    if (iconURL) {
      embed.setAuthor({
        name: sourceName,
        iconURL: iconURL,
      });
    } else {
      embed.setAuthor({
        name: sourceName,
      });
    }

    webhook.send({ embeds: [embed] }).catch(console.error);
  }
});

client.login(token);

// Function to check if a player is banned
async function checkAndKickBannedPlayer(playerName) {
  const pathfolder = path.join(__dirname, "players");

  fs.readdir(pathfolder, (err, files) => {
    if (err) {
      console.error("Error reading directory:", err);
      return;
    }

    files.forEach((file) => {
      if (path.extname(file) === ".json") {
        const filePath = path.join(pathfolder, file);
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

        if (data.Name.toLowerCase() === playerName.toLowerCase()) {
          const reason = data.Reason;

          // Kick the player from the server
          bedrockClient.queue("command_request", {
            command: `/kick ${playerName} ${reason}`,
            origin: {
              type: 0,
              uuid: uuidv4(),
              request_id: "Admin",
            },
            interval: false,
            version: 66,
          });

          bedrockClient.write("text", {
            filtered_message: "",
            type: "chat",
            needs_translation: false,
            source_name: bedrockClient.username,
            message: `§b${playerName} was banned for being found in the database! §a| ${reason}`,
            xuid: "0",
            platform_chat_id: "0",
          });
        }
      }
    });
  });
}

// Whitelists
// Whitelists
async function checkWhitelist(gamertag) {
  return new Promise((resolve) => {
    fs.readdir(whitelistFolderPath, (err, files) => {
      if (err) {
        console.error("Error reading whitelist directory:", err);
        resolve(false);
        return;
      }

      let isWhitelisted = false;
      files.forEach((file) => {
        if (path.extname(file) === ".json") {
          const filePath = path.join(whitelistFolderPath, file);
          const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

          if (data.Gamertag.toLowerCase() === gamertag.toLowerCase()) {
            isWhitelisted = true;
          }
        }
      });

      resolve(isWhitelisted);
    });
  });
}
