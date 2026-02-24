import express from "express";
import youtubedl from "youtube-dl-exec";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Download from "../models/Download.js";
import auth from "../middleware/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const { videoUrl, downloadType = "video", format = "mp4" } = req.query;

    if (!videoUrl) {
      return res.status(400).send("Missing videoUrl");
    }

    const downloadsDir = path.resolve("downloads");
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    const isAudio = downloadType === "audio";
    const timestamp = Date.now();
    const ext = isAudio ? "mp3" : format;
    const finalOutputPath = path.join(
      downloadsDir,
      `media_${timestamp}.${ext}`
    );

    const ytdlpPath = path.join(path.dirname(__dirname), "yt-dlp.exe");

    if (!fs.existsSync(ytdlpPath)) {
      return res.status(500).send("yt-dlp.exe not found");
    }

    const ffmpegPath =
      "C:\\ffmpeg\\ffmpeg-2025-10-21-git-535d4047d3-full_build\\bin\\ffmpeg.exe";

    const options = {
      output: finalOutputPath,
      ffmpegLocation: ffmpegPath,
      noCheckCertificates: true,
      noWarnings: true,
      noPart: true,
      noPlaylist: true,
    };

    if (isAudio) {
      options.extractAudio = true;
      options.audioFormat = "mp3";
      options.audioQuality = 0;
      options.format = "bestaudio/best";
    } else {
      options.format =
        "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best";
      options.mergeOutputFormat = format;
    }

    await youtubedl(videoUrl, options, { ytDlpPath: ytdlpPath });

    await Download.create({
      user: req.userId,
      videoUrl,
      type: downloadType,
      format,
    });

    sendFile(res, finalOutputPath, ext);
  } catch (err) {
    console.error(err);
    res.status(500).send("Download failed");
  }
});

function sendFile(res, filePath, ext) {
  res.download(filePath, `media.${ext}`, () => {
    fs.unlink(filePath, () => {});
  });
}

export default router;
