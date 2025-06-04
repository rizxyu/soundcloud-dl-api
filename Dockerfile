FROM node:18-slim

# Install dependencies
RUN apt update && apt install -y curl ffmpeg wget && \
    wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    rm -rf /var/lib/apt/lists/*

# Buat folder kerja
WORKDIR /app

# Copy package.json dan install node modules
COPY package*.json ./
RUN npm install

# Copy seluruh project
COPY . .

# Buka port 3000 buat API
EXPOSE 3000

# Jalankan server
CMD ["npm", "start"]
