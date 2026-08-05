FROM node:20

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Install Playwright browser + Linux dependencies
RUN npx playwright install --with-deps chromium

# Copy application
COPY . .

ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]