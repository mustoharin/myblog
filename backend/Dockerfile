# ---- Base image ----
FROM node:20-bullseye AS base
WORKDIR /usr/src/app

# ---- Install dependencies for node-canvas ----
# These libraries are required for building and running the 'canvas' package
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    netcat-traditional \
    && rm -rf /var/lib/apt/lists/*

# ---- Copy package files and install Node dependencies ----
COPY package*.json ./
RUN npm install --only=production

COPY . .

EXPOSE 5002

# Add wait-for script
ADD https://raw.githubusercontent.com/eficode/wait-for/master/wait-for /usr/local/bin/wait-for
RUN chmod +x /usr/local/bin/wait-for

# Create startup script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Set entrypoint
ENTRYPOINT ["docker-entrypoint.sh"]