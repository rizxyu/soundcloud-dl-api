const express = require('express');
const { exec } = require('child_process');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Endpoint khusus SoundCloud
app.get('/api/soundcloud', async (req, res) => {
  const url = req.query.url;
  const expires = req.query.expires_in || 20000;

  if (!url) return res.status(400).json({ error: 'Missing SoundCloud URL' });

  try {
    const filename = `sc-${Date.now()}.m4a`;
    const filepath = path.join(__dirname, filename);

    // Download audio + ambil metadata pakai yt-dlp
    const ytdlpCmd = `yt-dlp -x --audio-format m4a --write-info-json -o "${filename.replace('.m4a', '')}.%(ext)s" ${url}`;

    await new Promise((resolve, reject) => {
      exec(ytdlpCmd, (err, stdout, stderr) => {
        if (err) return reject(stderr);
        resolve(stdout);
      });
    });

    // Ambil file metadata JSON
    const jsonPath = filepath.replace('.m4a', '.info.json');
    const info = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

    // Upload ke temporary CDN
    const form = new FormData();
    const buffer = fs.readFileSync(filepath);
    const extension = path.extname(filepath).replace('.', '') || 'm4a';

    form.append('file', buffer, `${Date.now()}.${extension}`);

    const { data } = await axios.post('https://fullpwerr-temp-cloud.hf.space/upload', form, {
      headers: form.getHeaders(),
      params: { expires_in: expires }
    }).catch(e => e.response);

    fs.unlinkSync(filepath);
    fs.unlinkSync(jsonPath);

    res.json({
      title: info.title,
      uploader: info.uploader,
      thumbnail: info.thumbnail,
      duration: info.duration,
      cdn_url: data?.file_url || null,
      expires_in: expires
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process SoundCloud URL', detail: err.toString() });
  }
});

app.listen(port, () => {
  console.log(`🔥 SoundCloud API aktif di http://localhost:${port}`);
});
