FROM node:18

WORKDIR /usr/src/app

# Install system dependencies required for bcrypt
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install node dependencies
RUN npm install

# Copy prisma files
COPY prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Copy the rest of the application
COPY . .

# Expose port
EXPOSE 3000

# Command to run migrations and start the app
CMD npx prisma migrate deploy && \
    npx prisma migrate dev --name init && \
    npx prisma generate && \
    npx prisma db push --accept-data-loss && \
    node src/index.js