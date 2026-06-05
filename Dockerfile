# --- Stage 1: Setup Backend ---
FROM python:3.11-slim AS backend-setup
WORKDIR /app
# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*
# Install Python dependencies first
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# --- Stage 2: Build Frontend ---
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
# Copy package files separately for better caching
# Note: Use JSON array format for paths with spaces
COPY ["gate video storage/package.json", "gate video storage/package-lock.json*", "./"]
RUN npm install
# Copy the rest of the frontend source
COPY ["gate video storage/", "./"]
RUN npm run build

# --- Stage 3: Final Production Image ---
FROM backend-setup
WORKDIR /app

# Set up user for HF Spaces (UID 1000)
RUN useradd -m -u 1000 user

# Create uploads directory and set permissions as ROOT
RUN mkdir -p uploads && chown -R user:user /app

# Copy backend code as ROOT but with user ownership
COPY --chown=user:user backend/ .

# Copy compiled frontend from Stage 2 as ROOT but with user ownership
COPY --from=frontend-builder --chown=user:user /app/frontend/dist ./frontend_dist

# Switch to non-root user for security and HF compatibility
USER user
ENV PATH="/home/user/.local/bin:${PATH}"

# Use the HF_TOKEN from environment variables (set in HF Space Secrets)
# This will be used by the backend at runtime to interact with HF Hub
ENV HF_TOKEN=""
ENV PORT=7860

# Run with Gunicorn for production
CMD ["gunicorn", "--bind", "0.0.0.0:7860", "--timeout", "300", "--workers", "2", "--threads", "4", "--worker-class", "gthread", "run:app"]
