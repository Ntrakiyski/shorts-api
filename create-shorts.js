const express = require("express");
const ytdl = require("ytdl-core");
const axios = require("axios");
const fs = require("fs");
const { exec } = require("child_process");

const app = express();
const PORT = process.env.PORT || 3000; // Use the environment variable PORT or fallback to 3000

let outputCount = 2;

app.get("/crop-video", async (req, res) => {
  const { startTime, endTime, youtubeUrl } = req.query;

  const encodedUrl = encodeURIComponent(youtubeUrl);

  if (!startTime || !endTime || !encodedUrl) {
    res.status(400).send("Missing required parameters.");
    return;
  }

  try {
    const videoInfo = await ytdl.getInfo(youtubeUrl);
    const videoFormat = ytdl.chooseFormat(videoInfo.formats, {
      quality: "highest",
    });

    const response = await axios.get(videoFormat.url, {
      responseType: "stream",
    });
    const outputPath = `output_${outputCount}.mp4`;
    outputCount++;

    const writeStream = fs.createWriteStream(outputPath);
    response.data.pipe(writeStream);

    writeStream.on("finish", () => {
      const command = `ffmpeg -i ${outputPath} -ss ${startTime} -to ${endTime} -c:v copy -c:a copy ${outputPath.replace(
        "output_",
        "cropped_"
      )}`;

      exec(command, (error, stdout, stderr) => {
        console.log("Video cropped successfully.");
        res.download(`${outputPath.replace("output_", "cropped_")}`, () => {
          fs.unlinkSync(outputPath);
          fs.unlinkSync(`${outputPath.replace("output_", "cropped_")}`);
        });
      });
    });
  } catch (error) {
    console.error(`Error: ${error.message}`);
    res.status(500).send("An error occurred while downloading the video.");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
