const axios = require("axios");
const fs = require("fs-extra");
const FormData = require("form-data");
const path = require("path");

async function getUploadApiUrl() {
  try {
    const res = await axios.get("https://raw.githubusercontent.com/Ayan-alt-deep/xyc/main/baseApiurl.json");
    return res.data.catbox || "https://catbox.moe/user/api.php";
  } catch {
    return "https://catbox.moe/user/api.php";
  }
}

async function handleCatboxUpload({ event, api, message }) {
  const { messageReply } = event;
  if (!messageReply || !messageReply.attachments || messageReply.attachments.length === 0) {
    return message.reply("Please reply to an image or video.");
  }

  const fileUrl = messageReply.attachments[0].url;
  const ext = messageReply.attachments[0].type === "photo" ? ".jpg" : ".mp4";
  const filePath = path.join(__dirname, "temp" + ext);
  const loadingMsg = await message.reply("⏳ Meow~ Uploading your media to the magical Catbox...");

  try {
    const uploadApiUrl = await getUploadApiUrl();

    const response = await axios.get(fileUrl, { responseType: "stream" });
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("fileToUpload", fs.createReadStream(filePath));

    const upload = await axios.post(uploadApiUrl, form, {
      headers: form.getHeaders(),
    });

    fs.unlinkSync(filePath);

    const catboxMessage =
`╔════════════════╗
║Successfully Uploaded ✅
║ URL: ${upload.data}
╚════════════════╝`;

    api.editMessage(catboxMessage, loadingMsg.messageID);
  } catch (err) {
    fs.existsSync(filePath) && fs.unlinkSync(filePath);
    api.editMessage(
      "╔══✘ ERROR ✘══╗\n║ Failed to upload to Catbox.\n╚═══════════════╝",
      loadingMsg.messageID
    );
  }
}

module.exports = {
  config: {
    name: "catbox",
    aliases: ["ct"],
    version: "1.2",
    author: "Eren",
    countDown: 5,
    role: 0,
    shortDescription: "Upload media to catbox.moe",
    longDescription: "Upload replied image or video to catbox.moe and get link",
    category: "tools",
    guide: {
      en: "{pn} (reply to image/video) or reply with 'catbox'/'ct'"
    }
  },

  onStart: async function ({ event, api, message }) {
    return handleCatboxUpload({ event, api, message });
  },

  onChat: async function ({ event, api, message }) {
    const { body, messageReply } = event;
    if (!body || !messageReply) return;

    const trigger = body.toLowerCase().trim();
    const cmds = [this.config.name, ...(this.config.aliases || [])];

    if (cmds.includes(trigger)) {
      return handleCatboxUpload({ event, api, message });
    }
  }
};
