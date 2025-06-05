const express = require('express');
const { exec } = require('child_process');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.get('/api/soundcloud', async (req, res) => {
  const url = req.query.url;
  const expires = req.query.expires_in || 20000;
  
  const RESET = "\x1b[0m";
  const BLUE = "\x1b[34m";
  const GREEN = "\x1b[32m";
  const YELLOW = "\x1b[33m";

  // Contoh log warna
  console.log(`${new Date().toISOString()} - ${GREEN}Processing:${RESET} ${YELLOW}${url}${RESET}`);

  if (!url) return res.status(400).json({ error: 'Missing SoundCloud URL' });

  try {
    const outputBase = `sc-${Date.now()}`;
    const ytdlpCmd = `yt-dlp -x --audio-format mp3 --yes-playlist --write-info-json -o "${outputBase}-%(title)s.%(ext)s" ${url}`;

    await new Promise((resolve, reject) => {
      exec(ytdlpCmd, (err, stdout, stderr) => {
        if (err) return reject(stderr);
        resolve(stdout);
      });
    });

    // Ambil semua file mp3 & metadata json hasil download
    const files = fs.readdirSync(__dirname);
    const mp3Files = files.filter(file => file.startsWith(outputBase) && file.endsWith('.mp3'));

    const responses = [];

    for (const mp3 of mp3Files) {
      const basename = mp3.replace('.mp3', '');
      const jsonFile = `${basename}.info.json`;

      if (!fs.existsSync(jsonFile)) continue;

      const info = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
      const buffer = fs.readFileSync(mp3);

      const form = new FormData();
      form.append('file', buffer, `${Date.now()}.mp3`);

      const { data } = await axios.post('https://fullpwerr-temp-cloud.hf.space/upload', form, {
        headers: form.getHeaders(),
        params: { expires_in: expires }
      }).catch(e => e.response);

      // Masukin ke array
      responses.push({
        title: info.title,
        uploader: info.uploader,
        thumbnail: info.thumbnail,
        duration: info.duration,
        cdn_url: data?.file_url || null,
        expires_in: expires
      });

      // Bersihin file lokal
      fs.unlinkSync(mp3);
      fs.unlinkSync(jsonFile);
    }
    
    // Kirim respons
    if (responses.length === 0) {
      return res.status(404).json({ error: 'No audio found or failed to process' });
    } else if (responses.length === 1) {
      return res.json(responses[0]); // tunggal
    } else {
      return res.json(responses); // playlist
    }
     console.log(`${new Date().toISOString()} - ${GREEN}Successfull:${RESET} ${YELLOW}${url}${RESET}`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Processing failed', detail: err.toString() });
  }
});

app.listen(port, () => {
  console.log(`🎵 SoundCloud MP3 API running at http://localhost:${port}`);
});
